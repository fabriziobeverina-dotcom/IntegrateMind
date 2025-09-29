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
      const { title, description, presenter, videoUrl, thumbnail, category, duration, isPremium } = req.body;
      
      if (!title || !description || !presenter || !videoUrl || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const videoData = {
        title: title.trim(),
        description: description.trim(),
        presenter: presenter.trim(),
        videoUrl: videoUrl.trim(),
        thumbnail: thumbnail?.trim() || null,
        category: category.trim(),
        duration: duration?.trim() || null,
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

  const httpServer = createServer(app);
  return httpServer;
}
