import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

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
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Serve protected objects with ACL check
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
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
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
      res.status(201).json(entry);
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
      const { title, description, content, author, category, readTime, isPremium } = req.body;
      
      if (!title || !description || !content || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const readingData = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        author: author?.trim() || null,
        category: category.trim(),
        readTime: readTime?.trim() || null,
        isPremium: Boolean(isPremium)
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
      const { title, description, content, author, category, readTime, isPremium } = req.body;
      
      const existingReading = await storage.getReading(id);
      if (!existingReading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      const updates = {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(content && { content: content.trim() }),
        ...(author && { author: author.trim() }),
        ...(category && { category: category.trim() }),
        readTime: readTime?.trim() || null,
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
      
      res.status(201).json(completion);
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
      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ message: "Failed to fetch streaks" });
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
        res.json({ message: "Post liked successfully" });
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
      
      res.status(201).json(comment);
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
      const user = await storage.getUser(userId);
      
      if (!user || !user.journeyStartDate) {
        return res.status(400).json({ message: "Journey start date not set" });
      }
      
      // Calculate days since journey started
      const daysSinceStart = Math.floor((Date.now() - user.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate sequence number (1-65)
      // Days 0-59 cycle through categories, days 60-64 are milestones
      let sequence: number;
      if (daysSinceStart < 60) {
        sequence = (daysSinceStart % 60) + 1;
      } else if (daysSinceStart < 65) {
        sequence = daysSinceStart + 1;
      } else {
        // After day 65, cycle back to day 1
        sequence = ((daysSinceStart - 65) % 65) + 1;
      }
      
      const prompt = await storage.getIntegrationPromptBySequence(sequence);
      
      if (!prompt) {
        return res.status(404).json({ message: "No prompt available for today" });
      }
      
      // Check if user has already completed this prompt
      const progress = await storage.getUserPromptProgressByPrompt(userId, prompt.id);
      
      res.json({ 
        ...prompt, 
        isCompleted: !!progress,
        dayNumber: daysSinceStart + 1
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
      
      // Get prompt to determine points
      const prompt = await storage.getIntegrationPromptBySequence(parseInt(promptId));
      const pointsEarned = prompt?.pointsValue || 10;
      
      const progress = await storage.createUserPromptProgress({
        userId,
        promptId,
        response,
        pointsEarned
      });
      
      res.status(201).json(progress);
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
      const { endpoint, p256dh, auth, userAgent } = req.body;
      
      // Validate required fields
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }
      
      // Create push subscription
      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || 'Unknown'
      });
      
      res.status(201).json({
        message: "Push subscription saved successfully",
        subscriptionId: subscription.id
      });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });
  
  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Deactivate all push subscriptions for this user
      const success = await storage.deactivateUserPushSubscriptions(userId);
      
      if (success) {
        res.json({ message: "Push subscription removed successfully" });
      } else {
        res.status(404).json({ message: "No active subscriptions found" });
      }
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });
  
  app.post('/api/push/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Import the reminder scheduler
      const { reminderScheduler } = await import('./reminderScheduler');
      
      // Send test notification using the scheduler
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

  const httpServer = createServer(app);
  return httpServer;
}
