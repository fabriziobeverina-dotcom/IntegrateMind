import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { reminderScheduler } from "./reminderScheduler";
import {
  setupWellbeingScheduler,
  isPulseCheckDue,
  processPulseSubmission,
  getStabilizationPrompt,
  STABILIZATION_PROMPTS,
} from "./wellbeingChecker";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

  // Resolve public dir (works in both dev and prod)
  const publicDir = process.env.NODE_ENV === 'production'
    ? path.resolve(import.meta.dirname, 'public')
    : path.resolve(import.meta.dirname, '..', 'client', 'public');

  // Serve manifest.json with correct MIME type and open CORS so PWABuilder can validate
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(publicDir, 'manifest.json'));
  });

  // Digital Asset Links — required for TWA APK to run standalone instead of in Chrome
  // Set TWA_PACKAGE_NAME and TWA_SHA256_FINGERPRINT env vars once you have them from bubblewrap
  app.get('/.well-known/assetlinks.json', (req, res) => {
    const packageName = process.env.TWA_PACKAGE_NAME || 'app.replit.integrate_mindbpody.twa';
    const fingerprint = process.env.TWA_SHA256_FINGERPRINT || '31:15:EA:8C:5A:9E:63:9D:52:97:78:4D:50:13:B8:14:AD:6B:04:40:90:4B:7E:0F:73:29:3E:5F:21:87:EA:4F';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    }]);
  });

  // Serve service worker with correct headers so PWABuilder can detect it
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(publicDir, 'sw.js'));
  });

  // Add Link header to HTML responses so crawlers find the manifest without parsing HTML
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
      res.setHeader('Link', '</manifest.json>; rel="manifest"');
    }
    next();
  });

  // Auth routes  
  app.get('/api/auth/user', async (req: any, res) => {
    // Check if user is authenticated without using the isAuthenticated middleware
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      // If database is unavailable, return user from session claims
      const claims = req.user.claims;
      const fallbackUser = {
        id: claims.sub,
        email: claims.email,
        name: `${claims.first_name || ''} ${claims.last_name || ''}`.trim() || claims.email || 'User',
        firstName: claims.first_name || null,
        lastName: claims.last_name || null,
        avatar: claims.profile_image_url || null,
        profileImageUrl: claims.profile_image_url || null,
        provider: 'replit',
        providerId: claims.sub,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      res.json(fallbackUser);
    }
  });

  // Update own profile (avatar)
  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { avatar } = req.body;
      const updated = await storage.updateUser(userId, { avatar: avatar ?? null });
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Health check route (public)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Object Storage routes (protected)
  
  // Get presigned URL for file upload
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fileExtension, mimeType } = req.body;
      
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(userId, fileExtension);
      
      res.json({ 
        uploadURL,
        objectPath,
        mimeType 
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Finalize upload and set ACL policy
  app.put('/api/objects/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { objectPath } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const finalObjectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectPath,
        {
          owner: userId,
          visibility: "private", // Practice files are private by default
        }
      );

      res.json({
        objectPath: finalObjectPath,
        url: finalObjectPath, // Frontend expects 'url' field
      });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve protected objects with ACL check + range request support (required for audio/video)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }

      const [metadata] = await objectFile.getMetadata();
      const contentType = metadata.contentType || "application/octet-stream";
      const fileSize = Number(metadata.size);

      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", contentType);

      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        // Parse "bytes=start-end"
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (!match) return res.sendStatus(416);

        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        if (start >= fileSize || end >= fileSize) return res.sendStatus(416);

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
        });
        objectFile.createReadStream({ start, end }).pipe(res);
      } else {
        res.setHeader("Content-Length", fileSize);
        objectFile.createReadStream().pipe(res);
      }
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Journal routes (protected)
  app.get('/api/journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const entries = await storage.getUserJournalEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content, tags, mood, isPrivate } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      
      const entryData = {
        userId,
        title: title.trim(),
        content: content.trim(),
        tags: tags || [],
        mood: mood ? parseInt(mood) : null,
        isPrivate: Boolean(isPrivate)
      };
      
      const entry = await storage.createJournalEntry(entryData);

      // Award seeds based on word count (fire-and-forget, don't block response)
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      let gamification: any = null;
      try {
        if (wordCount >= 300) {
          gamification = await storage.awardSeeds(userId, 'journal_300_words', { entryId: entry.id, wordCount });
        } else {
          // All journal entries earn seeds; 100+ words get the higher tier
          gamification = await storage.awardSeeds(userId, 'journal_100_words', { entryId: entry.id, wordCount });
        }
      } catch (e) { console.error('Seeds award error (journal):', e); }

      res.status(201).json({ ...entry, gamification });
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  app.put('/api/journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { title, content, tags, mood, isPrivate } = req.body;
      
      // Verify entry belongs to user
      const entry = await storage.getJournalEntry(id);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const updates = {
        title: title?.trim(),
        content: content?.trim(),
        tags,
        mood: mood ? parseInt(mood) : null,
        isPrivate: Boolean(isPrivate)
      };
      
      const updatedEntry = await storage.updateJournalEntry(id, updates);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });

  app.delete('/api/journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify entry belongs to user
      const entry = await storage.getJournalEntry(id);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const deleted = await storage.deleteJournalEntry(id);
      if (deleted) {
        res.json({ message: "Journal entry deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete journal entry" });
      }
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });

  // Share summary of last 7 days with facilitator
  app.get('/api/journal/share-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const allEntries = await storage.getUserJournalEntries(userId, 100);

      // Only include non-private entries from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEntries = allEntries
        .filter(e => !e.isPrivate && new Date(e.createdAt!) >= sevenDaysAgo)
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

      const facilitatorWhatsapp = await storage.getSiteSetting('whatsapp_number');

      const userName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'A participant'
        : 'A participant';

      res.json({
        userName,
        entries: recentEntries,
        facilitatorWhatsapp: facilitatorWhatsapp || null,
        periodStart: sevenDaysAgo.toISOString(),
        periodEnd: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error building share summary:", error);
      res.status(500).json({ message: "Failed to build share summary" });
    }
  });

  app.get('/api/journal/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query, tags } = req.query;
      
      const tagArray = tags ? (typeof tags === 'string' ? [tags] : tags) : undefined;
      const entries = await storage.searchJournalEntries(userId, query as string || '', tagArray);
      res.json(entries);
    } catch (error) {
      console.error("Error searching journal entries:", error);
      res.status(500).json({ message: "Failed to search journal entries" });
    }
  });

  app.get('/api/prompts/today', isAuthenticated, async (req: any, res) => {
    try {
      const prompt = await storage.getTodaysPrompt();
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching today's prompt:", error);
      res.status(500).json({ message: "Failed to fetch today's prompt" });
    }
  });

  app.get('/api/prompts/:promptId/response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId } = req.params;
      
      const response = await storage.getUserPromptResponse(userId, promptId);
      res.json(response);
    } catch (error) {
      console.error("Error fetching prompt response:", error);
      res.status(500).json({ message: "Failed to fetch prompt response" });
    }
  });

  app.post('/api/prompts/:promptId/response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId } = req.params;
      const { response } = req.body;
      
      if (!response) {
        return res.status(400).json({ message: "Response is required" });
      }
      
      // Check if user already responded to this prompt
      const existingResponse = await storage.getUserPromptResponse(userId, promptId);
      if (existingResponse) {
        return res.status(409).json({ message: "You have already responded to this prompt" });
      }
      
      const responseData = {
        userId,
        promptId,
        response: response.trim()
      };
      
      const newResponse = await storage.createPromptResponse(responseData);
      res.status(201).json(newResponse);
    } catch (error) {
      console.error("Error creating prompt response:", error);
      res.status(500).json({ message: "Failed to create prompt response" });
    }
  });

  // Progress tracking routes (protected)
  app.get('/api/progress/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const entries = await storage.getUserProgressEntries(userId, start, end);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching progress entries:", error);
      res.status(500).json({ message: "Failed to fetch progress entries" });
    }
  });

  app.post('/api/progress/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date, mood, sleep, grounding, notes } = req.body;
      
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      const entryData = {
        userId,
        date: new Date(date),
        mood: mood ? parseInt(mood) : null,
        sleep: sleep ? parseInt(sleep) : null,
        grounding: grounding ? parseInt(grounding) : null,
        notes: notes?.trim() || null
      };
      
      const entry = await storage.createProgressEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating progress entry:", error);
      res.status(500).json({ message: "Failed to create progress entry" });
    }
  });

  app.put('/api/progress/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { mood, sleep, grounding, notes } = req.body;
      
      const updates = {
        mood: mood ? parseInt(mood) : null,
        sleep: sleep ? parseInt(sleep) : null,
        grounding: grounding ? parseInt(grounding) : null,
        notes: notes?.trim() || null
      };
      
      const updatedEntry = await storage.updateProgressEntry(id, updates);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Progress entry not found" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating progress entry:", error);
      res.status(500).json({ message: "Failed to update progress entry" });
    }
  });

  app.get('/api/progress/aggregated', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { days = 7 } = req.query;
      const numDays = parseInt(days as string);
      
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - numDays + 1);
      
      // Get progress entries for the date range
      const progressEntries = await storage.getUserProgressEntries(userId, startDate, endDate);
      
      // Get journal entries with mood data for the same period
      const journalEntries = await storage.getUserJournalEntries(userId, 50); // Get recent entries
      
      // Create aggregated data for each day
      const aggregatedData = [];
      for (let i = 0; i < numDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Find progress entry for this date
        const progressEntry = progressEntries.find(entry => 
          entry.date && entry.date.toISOString().split('T')[0] === dateStr
        );
        
        // Calculate average mood from journal entries for this date
        const dayJournalEntries = journalEntries.filter(entry => {
          if (!entry.createdAt) return false;
          const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
          return entryDate === dateStr && entry.mood !== null;
        });
        
        const avgJournalMood = dayJournalEntries.length > 0
          ? Math.round(dayJournalEntries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / dayJournalEntries.length)
          : null;
        
        // Use progress entry mood if available, otherwise use journal average
        const mood = progressEntry?.mood || avgJournalMood;
        
        aggregatedData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: dateStr,
          mood: mood,
          sleep: progressEntry?.sleep || null,
          grounding: progressEntry?.grounding || null,
          hasProgressEntry: !!progressEntry,
          journalEntryCount: dayJournalEntries.length
        });
      }
      
      res.json(aggregatedData);
    } catch (error) {
      console.error("Error fetching aggregated progress:", error);
      res.status(500).json({ message: "Failed to fetch aggregated progress" });
    }
  });

  // User practices routes (protected) - for consumption only
  app.get('/api/practices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.query.category as string;
      const practices = await storage.getPractices(category);
      
      // Get user completions to mark completed practices
      const completions = await storage.getUserPracticeCompletions(userId);
      const completedPracticeIds = new Set(completions.map(c => c.practiceId));
      
      // Add completion status to each practice
      const practicesWithStatus = practices.map(practice => ({
        ...practice,
        isCompleted: completedPracticeIds.has(practice.id),
        completedAt: completions.find(c => c.practiceId === practice.id)?.completedAt
      }));
      
      res.json(practicesWithStatus);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.get('/api/practices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const practice = await storage.getPractice(id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      res.json(practice);
    } catch (error) {
      console.error("Error fetching practice:", error);
      res.status(500).json({ message: "Failed to fetch practice" });
    }
  });

  // Generate a short-lived signed URL for audio/video playback (bypasses auth issues)
  // :type is 'audio' or 'video' — matches queryKey join pattern ['/api/practices', id, 'media-url', type]
  app.get('/api/practices/:id/media-url/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { id, type } = req.params;
      const practice = await storage.getPractice(id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      const objectPath = type === 'video' ? practice.videoUrl : practice.audioUrl;
      if (!objectPath || !objectPath.startsWith('/objects/')) {
        // Not a stored file (e.g. YouTube URL) — return as-is
        return res.json({ url: objectPath });
      }
      const objectStorageService = new ObjectStorageService();
      const signedUrl = await objectStorageService.getSignedDownloadUrl(objectPath, 3600);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating media URL:", error);
      res.status(500).json({ message: "Failed to generate media URL" });
    }
  });

  app.delete('/api/practices/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getPractice(id);
      if (!existing) {
        return res.status(404).json({ message: "Practice not found" });
      }
      const success = await storage.deletePractice(id);
      if (!success) {
        return res.status(404).json({ message: "Practice not found" });
      }
      res.json({ message: "Practice deleted successfully" });
    } catch (error) {
      console.error("Error deleting practice:", error);
      res.status(500).json({ message: "Failed to delete practice" });
    }
  });

  // Admin practices routes (admin-only) - for content management
  app.get('/api/admin/practices', isAdmin, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const practices = await storage.getPractices(category);
      res.json(practices);
    } catch (error) {
      console.error("Error fetching admin practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.post('/api/admin/practices', isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { title, description, duration, category, instructor, videoUrl, audioUrl, isPremium } = req.body;
      
      if (!title || !description || !duration || !category || !instructor) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const practiceData = {
        title: title.trim(),
        description: description.trim(),
        duration: duration.trim(),
        category: category.trim(),
        instructor: instructor.trim(),
        videoUrl: videoUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null,
        isPremium: Boolean(isPremium)
      };
      
      const practice = await storage.createPractice(practiceData, adminId);
      res.status(201).json(practice);
    } catch (error) {
      console.error("Error creating practice:", error);
      res.status(500).json({ message: "Failed to create practice" });
    }
  });

  app.put('/api/admin/practices/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, duration, category, instructor, videoUrl, audioUrl, isPremium } = req.body;
      
      // Check if practice exists
      const existingPractice = await storage.getPractice(id);
      if (!existingPractice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const updates = {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(duration && { duration: duration.trim() }),
        ...(category && { category: category.trim() }),
        ...(instructor && { instructor: instructor.trim() }),
        videoUrl: videoUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null,
        ...(isPremium !== undefined && { isPremium: Boolean(isPremium) })
      };
      
      const practice = await storage.updatePractice(id, updates);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      res.json(practice);
    } catch (error) {
      console.error("Error updating practice:", error);
      res.status(500).json({ message: "Failed to update practice" });
    }
  });

  app.delete('/api/admin/practices/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if practice exists
      const existingPractice = await storage.getPractice(id);
      if (!existingPractice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const success = await storage.deletePractice(id);
      if (!success) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      res.json({ message: "Practice deleted successfully" });
    } catch (error) {
      console.error("Error deleting practice:", error);
      res.status(500).json({ message: "Failed to delete practice" });
    }
  });

  // Admin readings routes (admin-only) - for content management  
  app.get('/api/admin/readings', isAdmin, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const readings = await storage.getReadings(category);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching admin readings:", error);
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  app.post('/api/admin/readings', isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { title, description, content, link, author, category, readTime, isPremium, thumbnailUrl } = req.body;
      
      if (!title || !description || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!content && !link) {
        return res.status(400).json({ message: "Either content or link must be provided" });
      }
      
      const readingData = {
        title: title.trim(),
        description: description.trim(),
        content: content?.trim() || null,
        link: link?.trim() || null,
        author: author?.trim() || null,
        category: category.trim(),
        readTime: readTime?.trim() || null,
        isPremium: Boolean(isPremium),
        thumbnailUrl: thumbnailUrl?.trim() || null,
      };
      
      const reading = await storage.createReading(readingData, adminId);
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error creating reading:", error);
      res.status(500).json({ message: "Failed to create reading" });
    }
  });

  app.put('/api/admin/readings/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, content, link, author, category, readTime, isPremium } = req.body;
      
      const existingReading = await storage.getReading(id);
      if (!existingReading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      const updates = {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(link !== undefined && { link: link?.trim() || null }),
        ...(author !== undefined && { author: author?.trim() || null }),
        ...(category && { category: category.trim() }),
        ...(readTime !== undefined && { readTime: readTime?.trim() || null }),
        ...(isPremium !== undefined && { isPremium: Boolean(isPremium) })
      };
      
      const reading = await storage.updateReading(id, updates);
      res.json(reading);
    } catch (error) {
      console.error("Error updating reading:", error);
      res.status(500).json({ message: "Failed to update reading" });
    }
  });

  app.delete('/api/admin/readings/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existingReading = await storage.getReading(id);
      if (!existingReading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      const success = await storage.deleteReading(id);
      if (!success) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      res.json({ message: "Reading deleted successfully" });
    } catch (error) {
      console.error("Error deleting reading:", error);
      res.status(500).json({ message: "Failed to delete reading" });
    }
  });

  // Admin videos routes (admin-only) - for content management
  app.get('/api/admin/videos', isAdmin, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const videos = await storage.getVideos(category);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching admin videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.post('/api/admin/videos', isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { title, description, instructor, videoUrl, thumbnailUrl, category, duration, tags, isFeatured, isPremium } = req.body;
      
      if (!title || !description || !videoUrl || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const videoData = {
        title: title.trim(),
        description: description.trim(),
        instructor: instructor?.trim() || null,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl?.trim() || null,
        category: category.trim(),
        duration: duration?.trim() || null,
        tags: tags || [],
        isFeatured: Boolean(isFeatured),
        isPremium: Boolean(isPremium)
      };
      
      const video = await storage.createVideo(videoData, adminId);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.put('/api/admin/videos/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, presenter, videoUrl, thumbnail, category, duration, isPremium } = req.body;
      
      const existingVideo = await storage.getVideo(id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const updates = {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(presenter && { presenter: presenter.trim() }),
        ...(videoUrl && { videoUrl: videoUrl.trim() }),
        thumbnail: thumbnail?.trim() || null,
        ...(category && { category: category.trim() }),
        duration: duration?.trim() || null,
        ...(isPremium !== undefined && { isPremium: Boolean(isPremium) })
      };
      
      const video = await storage.updateVideo(id, updates);
      res.json(video);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete('/api/admin/videos/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existingVideo = await storage.getVideo(id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const success = await storage.deleteVideo(id);
      if (!success) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Admin analytics routes
  app.get('/api/admin/analytics/stats', isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  app.get('/api/admin/analytics/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Toggle admin status for a user
  app.patch('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isAdmin: newAdminStatus } = req.body;
      if (typeof newAdminStatus !== 'boolean') {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }
      const updated = await storage.updateUser(id, { isAdmin: newAdminStatus });
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get('/api/admin/analytics/users/:userId', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const analytics = await storage.getUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  // Fetch OG metadata from external URL (admin only, server-side to avoid CORS)
  app.get('/api/og-metadata', isAdmin, async (req: any, res) => {
    const { url } = req.query as { url?: string };
    if (!url) return res.status(400).json({ message: "url parameter required" });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntegrationCompass/1.0)' },
      });
      clearTimeout(timeout);
      const html = await response.text();
      const getMeta = (property: string) => {
        const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
                  || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
        return match ? match[1] : null;
      };
      const getTitle = () => {
        const og = getMeta('og:title');
        if (og) return og;
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? m[1].trim() : null;
      };
      res.json({
        title: getTitle(),
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image'),
        siteName: getMeta('og:site_name'),
      });
    } catch (error) {
      res.status(422).json({ message: "Could not fetch metadata from that URL" });
    }
  });

  // Public site settings (e.g. for the WhatsApp expert button)
  app.get('/api/site-settings', async (req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Admin-only site settings update
  app.put('/api/admin/site-settings', isAdmin, async (req: any, res) => {
    try {
      const updates: Record<string, string> = req.body;
      for (const [key, value] of Object.entries(updates)) {
        await storage.setSiteSetting(key, String(value));
      }
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error updating site settings:", error);
      res.status(500).json({ message: "Failed to update site settings" });
    }
  });

  // Admin CSV export — all user data (single aggregated query for performance)
  app.get('/api/admin/export/users', isAdmin, async (req: any, res) => {
    try {
      const result = await storage.getUsersExportData();

      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const headers = [
        'user_id', 'name', 'email',
        'journey_start_date', 'onboarding_complete', 'is_admin',
        'journal_entries', 'practice_completions', 'prompt_completions',
        'wellbeing_checkins', 'dream_entries', 'creative_expressions', 'community_posts',
        'reminder_enabled', 'reminder_time', 'reminder_types',
      ];

      const rows: string[] = [headers.join(',')];
      for (const row of result) {
        rows.push([
          escape(row.id),
          escape(row.name),
          escape(row.email),
          escape(row.journey_start_date ? new Date(row.journey_start_date).toISOString().split('T')[0] : ''),
          escape(row.onboarding_complete),
          escape(row.is_admin),
          escape(row.journal_entries),
          escape(row.practice_completions),
          escape(row.prompt_completions),
          escape(row.wellbeing_checkins),
          escape(row.dream_entries),
          escape(row.creative_expressions),
          escape(row.community_posts),
          escape(row.reminder_enabled),
          escape(row.reminder_time ?? ''),
          escape(Array.isArray(row.reminder_types) ? row.reminder_types.join('|') : (row.reminder_types ?? '')),
        ].join(','));
      }

      const csv = rows.join('\n');
      const filename = `integration-compass-users-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting user CSV:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Admin — export all text written by a single user as a .txt file
  app.get('/api/admin/users/:userId/export-text', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.facilitatorConsent !== true) {
        return res.status(403).json({ message: "User has not consented to facilitator access" });
      }

      const [journals, promptResponses, promptProgress, wellbeing, dreams, posts] = await Promise.all([
        storage.getUserJournalEntries(userId, 999),
        storage.getAllUserPromptResponses(userId),
        storage.getUserPromptProgress(userId),
        storage.getUserWellbeingCheckins(userId, 999),
        storage.getUserDreamJournals(userId, 999),
        storage.getUserCommunityPosts(userId),
      ]);

      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email || userId;
      const hr = (char = '─') => char.repeat(60);
      const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const section = (title: string) => `\n${hr()}\n${title}\n${hr()}\n`;

      let out = '';
      out += `INTEGRATION COMPASS — FULL TEXT EXPORT\n`;
      out += `${hr('=')}\n`;
      out += `User:     ${name}\n`;
      out += `Email:    ${user.email}\n`;
      out += `Exported: ${new Date().toLocaleString('en-US')}\n`;
      out += `${hr('=')}\n`;

      // ── Journal Entries ──────────────────────────────────────────
      if (journals.length) {
        out += section(`JOURNAL ENTRIES  (${journals.length} total)`);
        for (const e of journals) {
          out += `\n[${fmtDate(e.createdAt)}]`;
          if (e.title) out += `  ${e.title}`;
          out += `\n${e.content}\n`;
        }
      }

      // ── Daily Prompt Responses ───────────────────────────────────
      if (promptResponses.length) {
        out += section(`DAILY PROMPT RESPONSES  (${promptResponses.length} total)`);
        for (const r of promptResponses) {
          out += `\n[${fmtDate(r.createdAt)}]\n${r.response}\n`;
        }
      }

      // ── Integration Prompt Progress ──────────────────────────────
      if (promptProgress.length) {
        out += section(`INTEGRATION PROMPT RESPONSES  (${promptProgress.length} total)`);
        for (const p of promptProgress) {
          out += `\n[${fmtDate(p.completedAt)}]\n${p.response}\n`;
        }
      }

      // ── Evening Reflections (Wellbeing check-ins) ────────────────
      const withText = wellbeing.filter(w =>
        w.notes || w.feelingAboutDay || w.reachedIntention || w.dayTitle || w.strongestSensation || w.morningIntention
      );
      if (withText.length) {
        out += section(`EVENING REFLECTIONS  (${withText.length} with written content)`);
        for (const w of withText) {
          out += `\n[${fmtDate(w.createdAt)}]  Mood: ${w.wellbeingLevel}/5\n`;
          if (w.morningIntention)  out += `  Morning intention: ${w.morningIntention}\n`;
          if (w.dayTitle)          out += `  Day title: ${w.dayTitle}\n`;
          if (w.feelingAboutDay)   out += `  Feeling about today: ${w.feelingAboutDay}\n`;
          if (w.strongestSensation) out += `  Strongest sensation: ${w.strongestSensation}\n`;
          if (w.reachedIntention)  out += `  Reached intention: ${w.reachedIntention}\n`;
          if (w.notes)             out += `  Notes: ${w.notes}\n`;
        }
      }

      // ── Dream Journal ────────────────────────────────────────────
      const dreamsWithText = dreams.filter(d =>
        d.dreamTitle || d.dreamImages || d.dreamPresent || d.dreamEmotion ||
        d.dreamBody || d.dreamSpeak || d.dreamConnect || d.dreamInviting
      );
      if (dreamsWithText.length) {
        out += section(`DREAM JOURNAL  (${dreamsWithText.length} entries)`);
        for (const d of dreamsWithText) {
          out += `\n[${fmtDate(d.createdAt)}]`;
          if (d.dreamTitle)    out += `  ${d.dreamTitle}`;
          out += '\n';
          if (d.dreamImages)   out += `  Images / symbols: ${d.dreamImages}\n`;
          if (d.dreamPresent)  out += `  Present tense retelling: ${d.dreamPresent}\n`;
          if (d.dreamEmotion)  out += `  Emotion: ${d.dreamEmotion}\n`;
          if (d.dreamBody)     out += `  Body sensation: ${d.dreamBody}\n`;
          if (d.dreamSpeak)    out += `  What the dream speaks: ${d.dreamSpeak}\n`;
          if (d.dreamConnect)  out += `  Connection to journey: ${d.dreamConnect}\n`;
          if (d.dreamInviting) out += `  Inviting: ${d.dreamInviting}\n`;
        }
      }

      // ── Community Posts ──────────────────────────────────────────
      if (posts.length) {
        out += section(`COMMUNITY POSTS  (${posts.length} total)`);
        for (const p of posts) {
          out += `\n[${fmtDate(p.createdAt)}]\n${p.content}\n`;
        }
      }

      out += `\n${hr('=')}\nEnd of export\n`;

      const filename = `export-${name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(out);
    } catch (error) {
      console.error("Error exporting user text:", error);
      res.status(500).json({ message: "Failed to export user text" });
    }
  });

  // User content consumption routes
  app.get('/api/readings', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const readings = await storage.getReadings(category);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching readings:", error);
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  app.get('/api/readings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      res.json(reading);
    } catch (error) {
      console.error("Error fetching reading:", error);
      res.status(500).json({ message: "Failed to fetch reading" });
    }
  });

  app.post('/api/readings/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const reading = await storage.getReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      const completion = await storage.completeReading({
        userId,
        readingId: id,
        notes: req.body.notes || null
      });
      
      res.status(201).json(completion);
    } catch (error) {
      console.error("Error completing reading:", error);
      res.status(500).json({ message: "Failed to complete reading" });
    }
  });

  app.get('/api/videos', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const videos = await storage.getVideos(category);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/videos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post('/api/videos/:id/watch', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const watchRecord = await storage.watchVideo({
        userId,
        videoId: id,
        notes: req.body.notes || null
      });
      
      res.status(201).json(watchRecord);
    } catch (error) {
      console.error("Error recording video watch:", error);
      res.status(500).json({ message: "Failed to record video watch" });
    }
  });

  app.post('/api/practices/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if practice exists
      const practice = await storage.getPractice(id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const completion = await storage.completePractice({
        userId,
        practiceId: id,
        notes: req.body.notes || null
      });

      // Award seeds — somatic practices earn more
      let gamification: any = null;
      try {
        const isSomatic = practice.category?.toLowerCase() === 'somatic';
        gamification = await storage.awardSeeds(userId, 'practice_complete', { practiceId: id, isSomatic });
        // Mark somatic practice as completed — permanently disables somatic nudge
        if (isSomatic) {
          await storage.updateUser(userId, { somaticPracticeCompleted: true } as any);
        }
      } catch (e) { console.error('Seeds award error (practice):', e); }

      res.status(201).json({ ...completion, gamification });
    } catch (error) {
      console.error("Error completing practice:", error);
      res.status(500).json({ message: "Failed to complete practice" });
    }
  });

  // Progress routes (protected)
  app.get('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const progress = await storage.getUserProgressEntries(userId, startDate, endDate);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Streaks route (protected)
  app.get('/api/streaks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const streaks = await storage.getUserStreaks(userId);

      // Award streak bonuses if applicable
      try {
        if (streaks.journalStreak >= 21) {
          await storage.awardSeeds(userId, 'streak_21', { weekOf: new Date().toISOString().slice(0, 7) });
        } else if (streaks.journalStreak >= 7) {
          await storage.awardSeeds(userId, 'streak_7', { weekOf: new Date().toISOString().slice(0, 7) });
        }
      } catch (e) {}

      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ message: "Failed to fetch streaks" });
    }
  });

  // Gamification status
  app.get('/api/gamification/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = await storage.getGamificationStatus(userId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching gamification status:", error);
      res.status(500).json({ message: "Failed to fetch gamification status" });
    }
  });

  app.get('/api/gamification/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = await storage.getGamificationStatus(userId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const history = [...status.seedsHistory].reverse().slice((page - 1) * limit, page * limit);
      res.json({ history, total: status.seedsHistory.length });
    } catch (error) {
      console.error("Error fetching seeds history:", error);
      res.status(500).json({ message: "Failed to fetch seeds history" });
    }
  });

  // Community routes (protected)
  app.get('/api/community/posts', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getCommunityPosts(limit, offset);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching community posts:", error);
      res.status(500).json({ message: "Failed to fetch community posts" });
    }
  });

  app.post('/api/community/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, tags, isAnonymous } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const post = await storage.createCommunityPost({
        userId,
        content,
        tags: tags || [],
        isAnonymous: isAnonymous || false
      });
      
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating community post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.post('/api/community/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = req.params.id;
      
      const success = await storage.likeCommunityPost(postId, userId);
      
      if (success) {
        let gamification: any = null;
        try { gamification = await storage.awardSeeds(userId, 'community_engage', { targetId: `like:${postId}` }); } catch (e) {}
        res.json({ message: "Post liked successfully", gamification });
      } else {
        res.status(500).json({ message: "Failed to like post" });
      }
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.delete('/api/community/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = req.params.id;
      
      const success = await storage.unlikeCommunityPost(postId, userId);
      
      if (success) {
        res.json({ message: "Post unliked successfully" });
      } else {
        res.status(500).json({ message: "Failed to unlike post" });
      }
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  app.get('/api/community/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const postId = req.params.id;
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/community/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = req.params.id;
      const { content, isAnonymous } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const comment = await storage.createComment({
        postId,
        userId,
        content,
        isAnonymous: isAnonymous || false
      });

      let gamification: any = null;
      try { gamification = await storage.awardSeeds(userId, 'community_engage', { targetId: `comment:${comment.id}` }); } catch (e) {}

      res.status(201).json({ ...comment, gamification });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Daily prompt route (protected)
  app.get('/api/prompt/today', isAuthenticated, async (req: any, res) => {
    try {
      const prompt = await storage.getTodaysPrompt();
      if (!prompt) {
        return res.status(404).json({ message: "No prompt available today" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching daily prompt:", error);
      res.status(500).json({ message: "Failed to fetch daily prompt" });
    }
  });

  // Integration prompt routes (protected)
  app.post('/api/integration-prompts/init', async (req: any, res) => {
    try {
      await (storage as any).initIntegrationPromptTables();
      res.json({ message: "Integration prompt tables initialized successfully" });
    } catch (error) {
      console.error("Error initializing integration prompt tables:", error);
      res.status(500).json({ message: "Failed to initialize tables" });
    }
  });

  app.post('/api/integration-prompts/seed', async (req: any, res) => {
    try {
      const { prompts } = req.body;
      
      if (!Array.isArray(prompts)) {
        return res.status(400).json({ message: "Prompts must be an array" });
      }
      
      await storage.seedIntegrationPrompts(prompts);
      res.json({ message: "Integration prompts seeded successfully", count: prompts.length });
    } catch (error) {
      console.error("Error seeding integration prompts:", error);
      res.status(500).json({ message: "Failed to seed integration prompts" });
    }
  });

  app.get('/api/integration-prompts/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Auto-heal: if journeyStartDate is missing, set it to now (first time reaching the dashboard)
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      if (!user.journeyStartDate) {
        const startDate = new Date();
        await storage.updateUser(userId, { journeyStartDate: startDate });
        user = { ...user, journeyStartDate: startDate };
      }
      
      // Calculate days since journey started using calendar dates (not 24h intervals)
      // This ensures Day 2 starts at midnight, not 24 hours after the exact start time
      const now = new Date();
      const start = new Date(user.journeyStartDate);
      const nowMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const startMidnight = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
      const daysSinceStart = Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24));
      
      // Cycle through 77 days (72 category prompts + 5 milestones), then restart
      const cycleDay = daysSinceStart % 77;
      
      let prompt: any;
      
      if (cycleDay < 72) {
        // Days 0-71: Rotate through categories (one per category until all 72 are done)
        // Categories: Body, Emotion, Social, Environment, Spirit, Mental (6 categories)
        // Each category has 12 prompts (12 x 6 = 72)
        const categories = ['Body', 'Emotion', 'Social', 'Environment', 'Spirit', 'Mental'];
        const categoryIndex = cycleDay % 6;
        const promptIndexInCategory = Math.floor(cycleDay / 6);
        
        const category = categories[categoryIndex];
        const categoryPrompts = await storage.getIntegrationPromptsByCategory(category);
        
        if (categoryPrompts.length > promptIndexInCategory) {
          prompt = categoryPrompts[promptIndexInCategory];
        } else {
          return res.status(404).json({ message: "No prompt available for today" });
        }
      } else {
        // Days 72-76: Show milestone prompts (sequences 73-77)
        const milestoneSequence = (cycleDay - 72) + 73;
        prompt = await storage.getIntegrationPromptBySequence(milestoneSequence);
      }
      
      if (!prompt) {
        return res.status(404).json({ message: "No prompt available for today" });
      }
      
      // Check if user has already completed this prompt
      const progress = await storage.getUserPromptProgressByPrompt(userId, prompt.id);
      
      // Include user's current phase so frontend can show phase relevance
      const userPhase = calculatePhase(user.ceremonyDateApprox ?? null, user.ceremonyWeeksAgo ?? null);

      res.json({ 
        ...prompt, 
        isCompleted: !!progress,
        dayNumber: daysSinceStart + 1,
        userPhase: userPhase.phase,
        userPhaseTags: userPhase.phase === 'none' ? [] : [userPhase.phase],
      });
    } catch (error) {
      console.error("Error fetching today's integration prompt:", error);
      res.status(500).json({ message: "Failed to fetch today's prompt" });
    }
  });

  app.get('/api/integration-prompts/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserPromptProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user prompt progress:", error);
      res.status(500).json({ message: "Failed to fetch prompt progress" });
    }
  });

  app.post('/api/integration-prompts/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId, response } = req.body;
      
      if (!promptId || !response) {
        return res.status(400).json({ message: "Prompt ID and response are required" });
      }
      
      // Check if already completed
      const existing = await storage.getUserPromptProgressByPrompt(userId, promptId);
      if (existing) {
        return res.status(400).json({ message: "Prompt already completed" });
      }
      
      // Get prompt to determine points (use ID, not sequence)
      const prompt = await storage.getIntegrationPrompt(promptId);
      const pointsEarned = prompt?.pointsValue || 10;
      
      const progress = await storage.createUserPromptProgress({
        userId,
        promptId,
        response,
        pointsEarned
      });

      // Award seeds for prompt completion + first-category bonus
      let gamification: any = null;
      try {
        gamification = await storage.awardSeeds(userId, 'prompt_complete', { promptId });
        // Check if this is the first completion in this category
        if (prompt?.category && prompt.category !== 'Milestone') {
          const categoryBonus = await storage.awardSeeds(userId, 'prompt_first_category', { category: prompt.category });
          if (categoryBonus.seedsAwarded > 0 && gamification) {
            gamification.seedsAwarded += categoryBonus.seedsAwarded;
            gamification.newTotal = categoryBonus.newTotal;
            gamification.newBadges = [...(gamification.newBadges || []), ...(categoryBonus.newBadges || [])];
          } else if (categoryBonus.seedsAwarded > 0) {
            gamification = categoryBonus;
          }
        }
      } catch (e) { console.error('Seeds award error (prompt):', e); }

      res.status(201).json({ ...progress, gamification });
    } catch (error) {
      console.error("Error completing prompt:", error);
      res.status(500).json({ message: "Failed to complete prompt" });
    }
  });

  app.get('/api/integration-prompts/points', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const totalPoints = await storage.getUserTotalPoints(userId);
      res.json({ totalPoints });
    } catch (error) {
      console.error("Error fetching user points:", error);
      res.status(500).json({ message: "Failed to fetch points" });
    }
  });

  // User settings routes (protected)
  app.put('/api/user/reminder-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reminderEnabled, reminderTime, reminderTimezone, reminderTypes } = req.body;
      
      // Validate reminder types
      const validTypes = ['journal', 'progress', 'practice'];
      if (reminderTypes && !Array.isArray(reminderTypes)) {
        return res.status(400).json({ message: "reminderTypes must be an array" });
      }
      
      if (reminderTypes && reminderTypes.some((type: string) => !validTypes.includes(type))) {
        return res.status(400).json({ message: "Invalid reminder type" });
      }
      
      // Validate time format (HH:MM)
      if (reminderTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reminderTime)) {
        return res.status(400).json({ message: "Invalid time format. Use HH:MM" });
      }
      
      // Update user reminder settings
      const updatedUser = await storage.updateUser(userId, {
        reminderEnabled: reminderEnabled ?? false,
        reminderTime: reminderTime || "09:00",
        reminderTimezone: reminderTimezone || "UTC",
        reminderTypes: reminderTypes || []
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        message: "Reminder settings updated successfully",
        settings: {
          reminderEnabled: updatedUser.reminderEnabled,
          reminderTime: updatedUser.reminderTime,
          reminderTimezone: updatedUser.reminderTimezone,
          reminderTypes: updatedUser.reminderTypes
        }
      });
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      res.status(500).json({ message: "Failed to update reminder settings" });
    }
  });

  // Push notification routes (protected)
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Support new format: { subscription: { endpoint, keys: { p256dh, auth } } }
      // and legacy format: { endpoint, p256dh, auth }
      let endpoint: string, p256dh: string, auth: string, userAgent: string;
      let fullSubscriptionJson: any;

      if (req.body.subscription && req.body.subscription.endpoint) {
        // New format — full PushSubscription JSON
        fullSubscriptionJson = req.body.subscription;
        endpoint = fullSubscriptionJson.endpoint;
        p256dh = fullSubscriptionJson.keys?.p256dh;
        auth = fullSubscriptionJson.keys?.auth;
        userAgent = req.headers['user-agent'] || 'Unknown';
      } else {
        // Legacy format
        ({ endpoint, p256dh, auth, userAgent } = req.body);
        fullSubscriptionJson = { endpoint, keys: { p256dh, auth } };
      }

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      // Save to legacy push_subscriptions table
      await storage.createPushSubscription({
        userId, endpoint, p256dh, auth,
        userAgent: userAgent || 'Unknown'
      });

      // Also save to users.push_subscription for somatic nudge queries
      await storage.updateUser(userId, {
        pushSubscription: fullSubscriptionJson,
        pushPermissionAsked: true,
      } as any);

      res.status(201).json({ success: true, message: "Push subscription saved successfully" });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  // Mark push permission screen as shown (called whether user accepts or declines)
  // Facilitator consent — save the user's choice
  app.post('/api/user/facilitator-consent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { consent } = req.body;
      if (typeof consent !== 'boolean') {
        return res.status(400).json({ message: "consent must be a boolean" });
      }
      await storage.updateUser(userId, { facilitatorConsent: consent } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving facilitator consent:", error);
      res.status(500).json({ message: "Failed to save consent" });
    }
  });

  app.post('/api/push/permission-asked', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUser(userId, { pushPermissionAsked: true } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking push permission asked:", error);
      res.status(500).json({ message: "Failed to update permission state" });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deactivateUserPushSubscriptions(userId);
      await storage.updateUser(userId, { pushSubscription: null } as any);
      res.json({ success: true, message: "Push subscription removed successfully" });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // Push status + somatic nudge eligibility
  app.get('/api/push/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const userAny = user as any;
      const eligible = await storage.isSomaticNudgeEligible(userId);

      // Banner shows if eligible AND (shown_at is null OR > 7 days ago)
      let bannerVisible = false;
      if (eligible && !userAny.somaticPracticeCompleted) {
        const shownAt = userAny.somaticNudgeShownAt ? new Date(userAny.somaticNudgeShownAt) : null;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        bannerVisible = !shownAt || shownAt < sevenDaysAgo;
      }

      const subscriptions = await storage.getUserPushSubscriptions(userId);

      res.json({
        subscribed: subscriptions.length > 0 || !!userAny.pushSubscription,
        permission_asked: userAny.pushPermissionAsked ?? false,
        somatic_nudge_eligible: eligible,
        somatic_banner_visible: bannerVisible,
        somatic_practice_completed: userAny.somaticPracticeCompleted ?? false,
      });
    } catch (error) {
      console.error("Error fetching push status:", error);
      res.status(500).json({ message: "Failed to fetch push status" });
    }
  });

  // Dismiss somatic banner
  app.post('/api/push/somatic-nudge-shown', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUser(userId, { somaticNudgeShownAt: new Date() } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating somatic nudge shown:", error);
      res.status(500).json({ message: "Failed to update" });
    }
  });

  // Cron endpoint — send somatic nudge to eligible users
  app.post('/api/push/send-somatic-nudge', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const provided = req.headers['x-cron-secret'];
    if (!cronSecret || provided !== cronSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const count = await reminderScheduler.runSomaticNudgeJob();
      res.json({ success: true, sent: count });
    } catch (error: any) {
      console.error("Error running somatic nudge job:", error);
      res.status(500).json({ message: error.message || "Failed to run somatic nudge job" });
    }
  });

  app.post('/api/push/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await reminderScheduler.sendTestNotification(userId);
      res.json({ 
        message: "Test notification sent successfully",
        note: "Check your device for the notification"
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: error.message || "Failed to send test notification" });
    }
  });

  // Wellbeing check-ins
  app.get('/api/wellbeing/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checkin = await storage.getTodaysWellbeingCheckin(userId);
      res.json(checkin || null);
    } catch (error) {
      console.error("Error fetching today's wellbeing checkin:", error);
      res.status(500).json({ message: "Failed to fetch wellbeing checkin" });
    }
  });

  app.get('/api/wellbeing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const checkins = await storage.getUserWellbeingCheckins(userId, limit);
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching wellbeing checkins:", error);
      res.status(500).json({ message: "Failed to fetch wellbeing checkins" });
    }
  });

  app.post('/api/wellbeing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { wellbeingLevel, notes, feelingAboutDay, reachedIntention, dayTitle, strongestSensation } = req.body;

      if (!wellbeingLevel || wellbeingLevel < 1 || wellbeingLevel > 5) {
        return res.status(400).json({ message: "Wellbeing level must be between 1 and 5" });
      }

      // Upsert: update today's checkin if it exists (e.g. morning intention was set), otherwise create
      const existing = await storage.getTodaysWellbeingCheckin(userId);
      let checkin;
      if (existing) {
        checkin = await storage.updateWellbeingCheckin(existing.id, {
          wellbeingLevel,
          notes: notes || null,
          feelingAboutDay: feelingAboutDay || null,
          reachedIntention: reachedIntention || null,
          dayTitle: dayTitle || null,
          strongestSensation: strongestSensation || null,
        });
      } else {
        checkin = await storage.createWellbeingCheckin({
          userId,
          wellbeingLevel,
          notes: notes || null,
          feelingAboutDay: feelingAboutDay || null,
          reachedIntention: reachedIntention || null,
          dayTitle: dayTitle || null,
          strongestSensation: strongestSensation || null,
        });
      }

      // Award seeds for the wellbeing check-in (only if just created, not updated repeatedly)
      if (!existing) {
        try { await storage.awardSeeds(userId, 'pulse_checkin', { targetId: `wellbeing:${checkin.id}` }); } catch (e) {}
      }

      res.json(checkin);
    } catch (error) {
      console.error("Error creating wellbeing checkin:", error);
      res.status(500).json({ message: "Failed to create wellbeing checkin" });
    }
  });

  // Morning intention — set or get today's intention
  app.get('/api/wellbeing/morning-intention', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checkin = await storage.getTodaysWellbeingCheckin(userId);
      res.json({ intention: checkin?.morningIntention || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch morning intention" });
    }
  });

  app.post('/api/wellbeing/morning-intention', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { intention } = req.body;
      if (!intention || !intention.trim()) {
        return res.status(400).json({ message: "Intention text is required" });
      }

      const existing = await storage.getTodaysWellbeingCheckin(userId);
      let checkin;
      if (existing) {
        checkin = await storage.updateWellbeingCheckin(existing.id, { morningIntention: intention.trim() });
      } else {
        checkin = await storage.createWellbeingCheckin({
          userId,
          wellbeingLevel: 3, // neutral placeholder; updated at evening check-in
          morningIntention: intention.trim(),
        });
      }
      res.json({ intention: checkin.morningIntention });
    } catch (error) {
      console.error("Error saving morning intention:", error);
      res.status(500).json({ message: "Failed to save morning intention" });
    }
  });

  // Dream journal
  app.get('/api/dreams/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.getTodaysDreamJournal(userId);
      res.json(entry || null);
    } catch (error) {
      console.error("Error fetching today's dream journal:", error);
      res.status(500).json({ message: "Failed to fetch dream journal" });
    }
  });

  app.get('/api/dreams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const entries = await storage.getUserDreamJournals(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching dream journals:", error);
      res.status(500).json({ message: "Failed to fetch dream journals" });
    }
  });

  app.post('/api/dreams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dreamTitle, dreamImages, dreamPresent, dreamEmotion, dreamBody, dreamSpeak, dreamConnect, dreamInviting } = req.body;

      const entry = await storage.createDreamJournal({
        userId,
        dreamTitle: dreamTitle || null,
        dreamImages: dreamImages || null,
        dreamPresent: dreamPresent || null,
        dreamEmotion: dreamEmotion || null,
        dreamBody: dreamBody || null,
        dreamSpeak: dreamSpeak || null,
        dreamConnect: dreamConnect || null,
        dreamInviting: dreamInviting || null,
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating dream journal:", error);
      res.status(500).json({ message: "Failed to create dream journal" });
    }
  });

  // Creative expressions
  app.get('/api/creative-expressions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const entries = await storage.getUserCreativeExpressions(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching creative expressions:", error);
      res.status(500).json({ message: "Failed to fetch creative expressions" });
    }
  });

  app.post('/api/creative-expressions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { intentionText, drawingImage, strokeData } = req.body;

      if (!drawingImage || typeof drawingImage !== 'string') {
        return res.status(400).json({ message: "Drawing image is required" });
      }

      const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
      if (drawingImage.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({ message: "Drawing image is too large" });
      }

      const entry = await storage.createCreativeExpression({
        userId,
        intentionText: intentionText || null,
        drawingImage,
        strokeData: strokeData || null,
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating creative expression:", error);
      res.status(500).json({ message: "Failed to create creative expression" });
    }
  });

  // Practice completions (for daily micro-practice)
  app.get('/api/practice-completions/:promptId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId } = req.params;
      
      const completion = await storage.getUserPracticeCompletionsByPrompt(userId, promptId);
      res.json(completion || null);
    } catch (error) {
      console.error("Error fetching practice completion:", error);
      res.status(500).json({ message: "Failed to fetch practice completion" });
    }
  });

  app.get('/api/practice-completions/:promptId/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId } = req.params;
      
      const completion = await storage.getTodaysPracticeCompletion(userId, promptId);
      res.json(completion || null);
    } catch (error) {
      console.error("Error fetching today's practice completion:", error);
      res.status(500).json({ message: "Failed to fetch practice completion" });
    }
  });

  app.post('/api/practice-completions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId, notes } = req.body;

      if (!promptId) {
        return res.status(400).json({ message: "Prompt ID is required" });
      }

      const completion = await storage.createPracticeCompletion({
        userId,
        promptId,
        notes: notes || null,
      });

      res.json(completion);
    } catch (error) {
      console.error("Error creating practice completion:", error);
      res.status(500).json({ message: "Failed to create practice completion" });
    }
  });

  // User reminder settings
  app.get('/api/settings/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        reminderEnabled: user.reminderEnabled,
        reminderTime: user.reminderTime,
        reminderTimezone: user.reminderTimezone,
        reminderTypes: user.reminderTypes,
        morningReminderEnabled: user.morningReminderEnabled ?? true,
        morningReminderTime: user.morningReminderTime || "08:00",
        eveningReminderEnabled: user.eveningReminderEnabled ?? true,
        eveningReminderTime: user.eveningReminderTime || "20:00",
      });
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
      res.status(500).json({ message: "Failed to fetch reminder settings" });
    }
  });

  app.put('/api/settings/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        reminderEnabled, reminderTime, reminderTimezone, reminderTypes,
        morningReminderEnabled, morningReminderTime,
        eveningReminderEnabled, eveningReminderTime
      } = req.body;

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (morningReminderTime && !timeRegex.test(morningReminderTime)) {
        return res.status(400).json({ message: "Invalid morning reminder time format" });
      }
      if (eveningReminderTime && !timeRegex.test(eveningReminderTime)) {
        return res.status(400).json({ message: "Invalid evening reminder time format" });
      }

      const updatedUser = await storage.updateUserReminderSettings(userId, {
        reminderEnabled,
        reminderTime,
        reminderTimezone,
        reminderTypes,
        morningReminderEnabled: morningReminderEnabled ?? true,
        morningReminderTime: morningReminderTime || "08:00",
        eveningReminderEnabled: eveningReminderEnabled ?? true,
        eveningReminderTime: eveningReminderTime || "20:00",
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        reminderEnabled: updatedUser.reminderEnabled,
        reminderTime: updatedUser.reminderTime,
        reminderTimezone: updatedUser.reminderTimezone,
        reminderTypes: updatedUser.reminderTypes,
        morningReminderEnabled: updatedUser.morningReminderEnabled,
        morningReminderTime: updatedUser.morningReminderTime,
        eveningReminderEnabled: updatedUser.eveningReminderEnabled,
        eveningReminderTime: updatedUser.eveningReminderTime,
      });
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      res.status(500).json({ message: "Failed to update reminder settings" });
    }
  });

  app.post('/api/settings/complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        reminderEnabled, morningReminderEnabled, morningReminderTime,
        eveningReminderEnabled, eveningReminderTime, reminderTimezone
      } = req.body;

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (morningReminderTime && !timeRegex.test(morningReminderTime)) {
        return res.status(400).json({ message: "Invalid morning reminder time format" });
      }
      if (eveningReminderTime && !timeRegex.test(eveningReminderTime)) {
        return res.status(400).json({ message: "Invalid evening reminder time format" });
      }

      // Use timezone sent from the browser — never Intl on the server (server timezone != user timezone)
      const timezone = (typeof reminderTimezone === 'string' && reminderTimezone.length > 0)
        ? reminderTimezone
        : 'UTC';

      // Only set journeyStartDate when completing onboarding for the first time
      const existingUser = await storage.getUser(userId);
      const updatedUser = await storage.updateUserReminderSettings(userId, {
        reminderEnabled: reminderEnabled ?? false,
        reminderTimezone: timezone,
        morningReminderEnabled: morningReminderEnabled ?? false,
        morningReminderTime: morningReminderTime || "08:00",
        eveningReminderEnabled: eveningReminderEnabled ?? false,
        eveningReminderTime: eveningReminderTime || "20:00",
        onboardingComplete: true,
        journeyStartDate: existingUser?.journeyStartDate ?? new Date(),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, onboardingComplete: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // ─── Wellbeing system routes ─────────────────────────────────────────────────

  // Check if weekly pulse is due + whether stabilization card should show
  app.get('/api/wellbeing/pulse-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wb = await storage.getUserWellbeing(userId);
      res.json({
        pulseCheckDue: isPulseCheckDue(wb),
        stabilizationActive: (wb?.stabilizationDaysRemaining ?? 0) > 0,
        stabilizationPrompt: (wb?.stabilizationDaysRemaining ?? 0) > 0
          ? getStabilizationPrompt(wb?.stabilizationPromptIndex ?? 0)
          : null,
        alertStatus: wb?.alertStatus ?? 'none',
      });
    } catch (error) {
      console.error("Error fetching pulse status:", error);
      res.status(500).json({ message: "Failed to fetch pulse status" });
    }
  });

  // Submit weekly pulse check answers
  app.post('/api/wellbeing/pulse', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { q1, q2, q3 } = req.body;
      if (![q1, q2, q3].every(q => Number.isInteger(q) && q >= 1 && q <= 5)) {
        return res.status(400).json({ message: "Each answer must be an integer 1–5" });
      }
      const { triggered } = await processPulseSubmission(userId, q1, q2, q3);
      let gamification: any = null;
      try { gamification = await storage.awardSeeds(userId, 'pulse_checkin', {}); } catch (e) {}
      res.json({ ok: true, triggered, gamification });
    } catch (error) {
      console.error("Error submitting pulse:", error);
      res.status(500).json({ message: "Failed to submit pulse check" });
    }
  });

  // Admin — all users wellbeing data
  app.get('/api/admin/wellbeing', isAdmin, async (req: any, res) => {
    try {
      const rows = await storage.getAllUsersWithWellbeing();

      const stemWord = (word: string): string =>
        word.toLowerCase().replace(/[^a-z]/g, '').replace(/(ing|tion|ness|ment|ed|er|est|ly|s)$/, '');

      const result = await Promise.all(rows.map(async ({ user, wellbeing }) => {
        const activeFlags = (wellbeing?.flags ?? []) as any[];
        const pulseHistory = (wellbeing?.pulseHistory ?? []) as any[];
        const lastPulse = pulseHistory[pulseHistory.length - 1] ?? null;
        const prevPulse = pulseHistory[pulseHistory.length - 2] ?? null;

        // Fetch journal entries — full 100 if flagged, just 1 otherwise
        const allEntries = await storage.getUserJournalEntries(user.id, activeFlags.length > 0 ? 100 : 1);
        const lastEntry = allEntries[0];
        const daysSinceJournal = lastEntry
          ? Math.floor((Date.now() - new Date(lastEntry.createdAt!).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Compute per-flag specific stats
        const flagStats: Record<string, any> = {};
        if (activeFlags.length > 0) {
          const now = Date.now();
          const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
          const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

          const recent14 = allEntries.filter(e => new Date(e.createdAt!) >= fourteenDaysAgo);
          const last7 = recent14.filter(e => new Date(e.createdAt!) >= sevenDaysAgo);
          const prev7 = recent14.filter(e => new Date(e.createdAt!) < sevenDaysAgo);
          const last3Days = last7.filter(e => new Date(e.createdAt!) >= threeDaysAgo);

          for (const flag of activeFlags) {
            if (flag.name === 'journaling_dropout') {
              const daysWithout = lastEntry
                ? Math.floor((now - new Date(lastEntry.createdAt!).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              flagStats['journaling_dropout'] = {
                previousWeekCount: prev7.length,
                daysWithout,
              };
            }

            if (flag.name === 'entry_length_collapse') {
              const prevAvgWords = prev7.length > 0
                ? Math.round(prev7.reduce((s, e) => s + e.content.split(/\s+/).filter(Boolean).length, 0) / prev7.length)
                : null;
              const recentAvgWords = last3Days.length > 0
                ? Math.round(last3Days.reduce((s, e) => s + e.content.split(/\s+/).filter(Boolean).length, 0) / last3Days.length)
                : null;
              flagStats['entry_length_collapse'] = {
                prevAvgWords,
                recentAvgWords,
                entriesAnalyzed: last3Days.length,
              };
            }

            if (flag.name === 'obsessive_repetition') {
              const lastFive = [...last7]
                .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                .slice(0, 5);
              const stemCounts = new Map<string, { originals: string[]; count: number }>();
              let totalWords = 0;
              for (const entry of lastFive) {
                const words = entry.content.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
                for (const w of words) {
                  const s = stemWord(w);
                  if (s.length > 2) {
                    if (!stemCounts.has(s)) stemCounts.set(s, { originals: [], count: 0 });
                    stemCounts.get(s)!.originals.push(w);
                    stemCounts.get(s)!.count++;
                    totalWords++;
                  }
                }
              }
              let dominantStem = '';
              let dominantCount = 0;
              let dominantOriginals: string[] = [];
              Array.from(stemCounts.entries()).forEach(([s, data]) => {
                if (data.count > dominantCount) {
                  dominantCount = data.count;
                  dominantStem = s;
                  dominantOriginals = data.originals;
                }
              });
              const pct = totalWords > 0 ? Math.round((dominantCount / totalWords) * 100) : 0;
              const uniqueOriginals = Array.from(new Set(dominantOriginals));
              flagStats['obsessive_repetition'] = {
                dominantWord: uniqueOriginals[0] ?? dominantStem,
                relatedForms: uniqueOriginals.slice(0, 3),
                pct,
                occurrences: dominantCount,
                totalWords,
                entriesAnalyzed: lastFive.length,
              };
            }

            if (flag.name === 'streak_break') {
              const entriesByDay = new Set(recent14.map(e => new Date(e.createdAt!).toDateString()));
              const today = new Date();
              let streak = 0;
              for (let i = 1; i <= 14; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                if (entriesByDay.has(d.toDateString())) streak++;
                else break;
              }
              flagStats['streak_break'] = { streakLength: streak };
            }

            if (flag.name === 'sustained_low_mood') {
              const last3 = pulseHistory.slice(-3);
              const avgComposite = last3.length > 0
                ? Math.round(last3.reduce((s: number, r: any) => s + r.composite, 0) / last3.length)
                : 0;
              flagStats['sustained_low_mood'] = {
                checkins: last3,
                avgComposite,
              };
            }
          }
        }

        return {
          userId: user.id,
          displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Anonymous',
          email: user.email ?? null,
          daysSinceJournal,
          lastPulse,
          scoreDelta: (lastPulse && prevPulse) ? lastPulse.composite - prevPulse.composite : null,
          recentPulseHistory: pulseHistory.slice(-5),
          flags: wellbeing?.flags ?? [],
          flagStats,
          alertStatus: wellbeing?.alertStatus ?? 'none',
          alertTriggeredAt: wellbeing?.alertTriggeredAt ?? null,
          alertResolvedAt: wellbeing?.alertResolvedAt ?? null,
          facilitatorNote: wellbeing?.facilitatorNote ?? null,
          resolveNote: wellbeing?.resolveNote ?? null,
          resolvedByName: wellbeing?.resolvedByName ?? null,
        };
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin wellbeing:", error);
      res.status(500).json({ message: "Failed to fetch wellbeing data" });
    }
  });

  // Admin — save facilitator note without resolving
  app.post('/api/admin/wellbeing/:userId/note', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { note } = req.body;
      if (typeof note !== 'string') return res.status(400).json({ message: "note is required" });
      await storage.upsertUserWellbeing(userId, { facilitatorNote: note });
      res.json({ ok: true });
    } catch (error) {
      console.error("Error saving facilitator note:", error);
      res.status(500).json({ message: "Failed to save note" });
    }
  });

  // Admin — mark alert resolved
  app.post('/api/admin/wellbeing/:userId/resolve', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { note } = req.body;
      const adminName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || req.user?.name || 'An administrator';
      await storage.resolveWellbeingAlert(userId, note, adminName);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error resolving wellbeing alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Admin — AI analysis of flagged user (Gemini)
  app.post('/api/admin/wellbeing/:userId/ai-analysis', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      if (!process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || !process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
        return res.status(503).json({ message: "AI analysis not yet configured. Please enable the Gemini integration." });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const wb = await storage.getUserWellbeing(userId);
      const journalEntriesData = await storage.getUserJournalEntries(userId, 12);
      const promptResponsesData = await storage.getAllUserPromptResponses(userId);

      const firstName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'the participant';
      const pulseHistory = (wb?.pulseHistory ?? []) as any[];
      const recentPulses = pulseHistory.slice(-6);
      const flags = (wb?.flags ?? []) as any[];
      const alertStatus = wb?.alertStatus ?? 'none';

      const journalText = journalEntriesData
        .map((e, i) => `[Journal ${i + 1} – ${new Date(e.createdAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}]\n${e.content}`)
        .join('\n\n---\n\n');

      const promptText = promptResponsesData.slice(-10)
        .map((r) => `[Integration prompt response]\n${r.response}`)
        .join('\n\n---\n\n');

      const pulseText = recentPulses
        .map(p => `${new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: Emotional ${p.q1}/5 · Body ${p.q2}/5 · Connection ${p.q3}/5 (Total ${p.composite}/15)`)
        .join('\n');

      const flagText = flags.map((f: any) => f.name.replace(/_/g, ' ')).join(', ') || 'None';

      const systemPrompt = `You are a compassionate integration support specialist reviewing participant data for an ayahuasca integration program. Your analysis should be trauma-informed, respectful, and focused on support rather than diagnosis. Never use clinical diagnostic language. Focus on engagement patterns, emotional signals, and practical facilitator guidance.

Return ONLY valid JSON with exactly two string fields:
- "report": A structured facilitator report (3–4 paragraphs) covering: overall engagement and behavioral patterns, emotional/body/connection trends from pulse checks, notable themes or shifts in journal and prompt content, and specific recommendations for facilitator follow-up.
- "emailDraft": A warm, personal email the facilitator can send to this participant. Make it specific to the patterns observed — not a generic template. Start with "Hi [first name]," and end with "With care," followed by a blank signature line.`;

      const userMessage = `Analyze the following participant data for ${firstName}.

Alert status: ${alertStatus}
Behavioural flags: ${flagText}

Pulse check history (most recent ${recentPulses.length} entries):
${pulseText || 'No pulse data available.'}

Recent journal entries (${journalEntriesData.length} entries):
${journalText || 'No journal entries available.'}

Recent integration prompt responses (${Math.min(promptResponsesData.length, 10)} entries):
${promptText || 'No prompt responses available.'}`;

      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      });

      const response = await client.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      res.json({
        report: parsed.report ?? 'Analysis unavailable.',
        emailDraft: parsed.emailDraft ?? '',
      });
    } catch (error: any) {
      console.error("Error generating AI analysis:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI analysis" });
    }
  });

  // Debug route — manually set wellbeing state (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/debug/wellbeing-test', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { alertStatus, flags, stabilizationDaysRemaining, forcePulseDue } = req.body;
        const update: any = {};
        if (alertStatus) update.alertStatus = alertStatus;
        if (Array.isArray(flags)) update.flags = flags;
        if (typeof stabilizationDaysRemaining === 'number') update.stabilizationDaysRemaining = stabilizationDaysRemaining;
        if (forcePulseDue) update.lastPulseDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        if (alertStatus === 'triggered') {
          update.alertTriggeredAt = new Date();
          update.stabilizationDaysRemaining = stabilizationDaysRemaining ?? 3;
        }
        const wb = await storage.upsertUserWellbeing(userId, update);
        res.json({ ok: true, wellbeing: wb });
      } catch (error) {
        console.error("Debug wellbeing test error:", error);
        res.status(500).json({ message: "Debug error" });
      }
    });
  }

  // ─── Ceremony / Phase Awareness routes ──────────────────────────────────────

  // GET /api/user/phase — returns current integration phase data
  app.get('/api/user/phase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const phase = calculatePhase(user.ceremonyDateApprox ?? null, user.ceremonyWeeksAgo ?? null);
      res.json({
        phase: phase.phase,
        label: phase.label,
        description: phase.description,
        daysSinceCeremony: phase.daysSince,
        weeksSinceCeremony: phase.weeksSince,
        medicine: user.ceremonyMedicine ?? [],
        onboardingCeremonyComplete: user.onboardingCeremonyComplete ?? false,
        phaseTransitionShown: (user.phaseTransitionShown as Record<string, boolean>) ?? {},
      });
    } catch (error) {
      console.error("Error fetching phase:", error);
      res.status(500).json({ message: "Failed to fetch phase" });
    }
  });

  // POST /api/user/ceremony — saves ceremony date + medicine selection
  app.post('/api/user/ceremony', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weeksAgo, medicine } = req.body;

      // weeksAgo: -1 = no ceremony, null = prefer not to say, 0-52+ = actual weeks
      let ceremonyDateApprox: string | null = null;
      if (weeksAgo !== null && weeksAgo !== undefined && weeksAgo >= 0) {
        const d = new Date();
        d.setDate(d.getDate() - weeksAgo * 7);
        ceremonyDateApprox = d.toISOString().split('T')[0];
      }

      const phase = calculatePhase(ceremonyDateApprox, weeksAgo ?? null);

      await storage.updateUser(userId, {
        ceremonyWeeksAgo: weeksAgo ?? null,
        ceremonyDateApprox: ceremonyDateApprox ?? undefined,
        ceremonyMedicine: Array.isArray(medicine) ? medicine : [],
        ceremonyPhase: phase.phase,
        onboardingCeremonyComplete: true,
      } as any);

      res.json({ success: true, phase: phase.phase });
    } catch (error) {
      console.error("Error saving ceremony data:", error);
      res.status(500).json({ message: "Failed to save ceremony data" });
    }
  });

  // POST /api/user/phase/transition-seen — marks a phase transition overlay as seen
  app.post('/api/user/phase/transition-seen', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phase } = req.body;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const existing = (user.phaseTransitionShown as Record<string, boolean>) ?? {};
      const updated = { ...existing, [phase]: true };
      await storage.updateUser(userId, { phaseTransitionShown: updated } as any);

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking transition seen:", error);
      res.status(500).json({ message: "Failed to mark transition seen" });
    }
  });

  // Start wellbeing scheduler
  setupWellbeingScheduler();

  const httpServer = createServer(app);
  return httpServer;
}

// ─── Phase calculation utility ────────────────────────────────────────────────
// Acute: 0-2 weeks (0-14 days), Integration: 2-8 weeks (15-56 days),
// Deepening: 8-24 weeks (57-168 days), Long-term: 24+ weeks (169+ days)
export function calculatePhase(
  ceremonyDateApprox: string | null,
  ceremonyWeeksAgo: number | null,
): { phase: string; label: string; description: string; daysSince: number | null; weeksSince: number | null } {
  if (ceremonyWeeksAgo === -1) {
    return { phase: 'none', label: 'No ceremony', description: 'General integration support', daysSince: null, weeksSince: null };
  }
  if (ceremonyWeeksAgo === null && !ceremonyDateApprox) {
    return { phase: 'none', label: 'Journey', description: 'Integration support', daysSince: null, weeksSince: null };
  }

  let daysSince: number;
  if (ceremonyDateApprox) {
    const d = new Date(ceremonyDateApprox);
    daysSince = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  } else if (ceremonyWeeksAgo !== null && ceremonyWeeksAgo >= 0) {
    daysSince = ceremonyWeeksAgo * 7;
  } else {
    return { phase: 'none', label: 'Journey', description: 'Integration support', daysSince: null, weeksSince: null };
  }

  const weeksSince = Math.floor(daysSince / 7);

  if (daysSince <= 14) {
    return { phase: 'acute', label: 'Acute Phase', description: 'First 2 weeks after ceremony — gentle grounding focus', daysSince, weeksSince };
  } else if (daysSince <= 56) {
    return { phase: 'integration', label: 'Integration Phase', description: 'Weeks 2–8 — processing and embodying insights', daysSince, weeksSince };
  } else if (daysSince <= 168) {
    return { phase: 'deepening', label: 'Deepening Phase', description: 'Weeks 8–24 — deepening and stabilizing integration', daysSince, weeksSince };
  } else {
    return { phase: 'long_term', label: 'Long-term Integration', description: 'Beyond 6 months — sustained practice and growth', daysSince, weeksSince };
  }
}
