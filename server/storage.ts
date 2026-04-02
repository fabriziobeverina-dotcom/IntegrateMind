import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { 
  type User,
  type InsertUser,
  type UpsertUser,
  siteSettings,
  type JournalEntry,
  type InsertJournalEntry,
  type Practice,
  type InsertPractice,
  type UserPractice,
  type InsertUserPractice,
  type Reading,
  type InsertReading,
  type Video,
  type InsertVideo,
  type UserReading,
  type InsertUserReading,
  type UserVideo,
  type InsertUserVideo,
  type ProgressEntry,
  type InsertProgressEntry,
  type CommunityPost,
  type InsertCommunityPost,
  type Comment,
  type InsertComment,
  type DailyPrompt,
  type InsertDailyPrompt,
  type PromptResponse,
  type InsertPromptResponse,
  type PushSubscription,
  type InsertPushSubscription,
  type IntegrationPrompt,
  type InsertIntegrationPrompt,
  type UserPromptProgress,
  type InsertUserPromptProgress,
  type WellbeingCheckin,
  type InsertWellbeingCheckin,
  type PracticeCompletion,
  type InsertPracticeCompletion,
  type DreamJournal,
  type InsertDreamJournal,
  type CreativeExpression,
  type InsertCreativeExpression,
  users,
  journalEntries,
  practices,
  userPractices,
  readings,
  videos,
  userReadings,
  userVideos,
  progressEntries,
  communityPosts,
  comments,
  postLikes,
  dailyPrompts,
  promptResponses,
  pushSubscriptions,
  integrationPrompts,
  userPromptProgress,
  wellbeingCheckins,
  dreamJournals,
  creativeExpressions,
  practiceCompletions
} from "@shared/schema";

export interface IStorage {
  // User management  
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>; // Required for Replit Auth
  
  // Journal entries
  getUserJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]>;
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string): Promise<boolean>;
  searchJournalEntries(userId: string, query: string, tags?: string[]): Promise<JournalEntry[]>;
  
  // Practices (admin-curated)
  getPractices(category?: string): Promise<Practice[]>;
  getPractice(id: string): Promise<Practice | undefined>;
  createPractice(practice: InsertPractice, adminId: string): Promise<Practice>;
  updatePractice(id: string, updates: Partial<Practice>): Promise<Practice | undefined>;
  deletePractice(id: string): Promise<boolean>;
  
  // User practice tracking
  getUserPracticeCompletions(userId: string, limit?: number): Promise<UserPractice[]>;
  completePractice(userPractice: InsertUserPractice): Promise<UserPractice>;
  getUserStreaks(userId: string): Promise<{ journalStreak: number; practiceStreak: number; totalDays: number }>;
  
  // Readings (admin-curated)
  getReadings(category?: string): Promise<Reading[]>;
  getReading(id: string): Promise<Reading | undefined>;
  createReading(reading: InsertReading, adminId: string): Promise<Reading>;
  updateReading(id: string, updates: Partial<Reading>): Promise<Reading | undefined>;
  deleteReading(id: string): Promise<boolean>;
  
  // Videos (admin-curated)
  getVideos(category?: string): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo, adminId: string): Promise<Video>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<boolean>;
  
  // User content tracking
  getUserReadingCompletions(userId: string, limit?: number): Promise<UserReading[]>;
  completeReading(userReading: InsertUserReading): Promise<UserReading>;
  getUserVideoHistory(userId: string, limit?: number): Promise<UserVideo[]>;
  watchVideo(userVideo: InsertUserVideo): Promise<UserVideo>;
  
  // Progress tracking
  getUserProgressEntries(userId: string, startDate?: Date, endDate?: Date): Promise<ProgressEntry[]>;
  createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
  updateProgressEntry(id: string, updates: Partial<ProgressEntry>): Promise<ProgressEntry | undefined>;
  
  // Community
  getCommunityPosts(limit?: number, offset?: number): Promise<(CommunityPost & { author: User; commentCount: number; isLiked?: boolean })[]>;
  getUserCommunityPosts(userId: string): Promise<CommunityPost[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  likeCommunityPost(postId: string, userId: string): Promise<boolean>;
  unlikeCommunityPost(postId: string, userId: string): Promise<boolean>;
  
  // Comments
  getPostComments(postId: string): Promise<(Comment & { author: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Daily prompts
  getTodaysPrompt(): Promise<DailyPrompt | undefined>;
  getUserPromptResponse(userId: string, promptId: string): Promise<PromptResponse | undefined>;
  createPromptResponse(response: InsertPromptResponse): Promise<PromptResponse>;
  
  // Push notification subscriptions
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  deactivateUserPushSubscriptions(userId: string): Promise<boolean>;
  getActivePushSubscriptions(): Promise<PushSubscription[]>;
  
  // Reminder scheduling
  getUsersWithRemindersAt(time: string): Promise<User[]>;
  
  // Integration prompts
  getIntegrationPrompts(): Promise<IntegrationPrompt[]>;
  getIntegrationPrompt(id: string): Promise<IntegrationPrompt | undefined>;
  getIntegrationPromptBySequence(sequence: number): Promise<IntegrationPrompt | undefined>;
  getIntegrationPromptsByCategory(category: string): Promise<IntegrationPrompt[]>;
  seedIntegrationPrompts(prompts: InsertIntegrationPrompt[]): Promise<void>;
  
  // User prompt progress
  getUserPromptProgress(userId: string): Promise<UserPromptProgress[]>;
  getUserPromptProgressByPrompt(userId: string, promptId: string): Promise<UserPromptProgress | undefined>;
  createUserPromptProgress(progress: InsertUserPromptProgress): Promise<UserPromptProgress>;
  getUserTotalPoints(userId: string): Promise<number>;
  
  // Wellbeing check-ins
  getUserWellbeingCheckins(userId: string, limit?: number): Promise<WellbeingCheckin[]>;
  getTodaysWellbeingCheckin(userId: string): Promise<WellbeingCheckin | undefined>;
  createWellbeingCheckin(checkin: InsertWellbeingCheckin): Promise<WellbeingCheckin>;
  
  // Dream journal
  getTodaysDreamJournal(userId: string): Promise<DreamJournal | undefined>;
  getUserDreamJournals(userId: string, limit?: number): Promise<DreamJournal[]>;
  createDreamJournal(entry: InsertDreamJournal): Promise<DreamJournal>;

  // Creative expressions
  getUserCreativeExpressions(userId: string, limit?: number): Promise<CreativeExpression[]>;
  createCreativeExpression(entry: InsertCreativeExpression): Promise<CreativeExpression>;

  // Practice completions (for daily micro-practice)
  getUserPracticeCompletionsByPrompt(userId: string, promptId: string): Promise<PracticeCompletion | undefined>;
  getTodaysPracticeCompletion(userId: string, promptId: string): Promise<PracticeCompletion | undefined>;
  createPracticeCompletion(completion: InsertPracticeCompletion): Promise<PracticeCompletion>;
  
  // User settings (reminder preferences)
  updateUserReminderSettings(userId: string, settings: {
    reminderEnabled?: boolean;
    reminderTime?: string;
    reminderTimezone?: string;
    reminderTypes?: string[];
    morningReminderEnabled?: boolean;
    morningReminderTime?: string;
    eveningReminderEnabled?: boolean;
    eveningReminderTime?: string;
    onboardingComplete?: boolean;
  }): Promise<User | undefined>;
  
  // Admin analytics
  getAllUsers(): Promise<User[]>;
  getUserAnalytics(userId: string): Promise<{
    user: User;
    stats: {
      journalCount: number;
      practiceCompletions: number;
      promptCompletions: number;
      totalPoints: number;
      journalStreak: number;
      practiceStreak: number;
      wellbeingCheckins: number;
      avgWellbeing: number;
      dreamEntries: number;
      creativeExpressions: number;
      communityPosts: number;
    };
  }>;
  getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalJournalEntries: number;
    totalPracticeCompletions: number;
    totalPromptCompletions: number;
  }>;
  getSiteSetting(key: string): Promise<string | null>;
  setSiteSetting(key: string, value: string): Promise<void>;
  getAllSiteSettings(): Promise<Record<string, string>>;
}

export class DatabaseStorage implements IStorage {
  private db;
  private pool: Pool;
  
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    this.pool = new Pool({
      connectionString,
    });
    this.db = drizzle(this.pool);
  }
  
  async initIntegrationPromptTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create integration_prompts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS integration_prompts (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          sequence INTEGER NOT NULL UNIQUE,
          category TEXT NOT NULL,
          prompt TEXT NOT NULL,
          practice TEXT NOT NULL,
          points_value INTEGER NOT NULL DEFAULT 10,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create user_prompt_progress table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_prompt_progress (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id),
          prompt_id VARCHAR NOT NULL REFERENCES integration_prompts(id),
          response TEXT NOT NULL,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          points_earned INTEGER NOT NULL DEFAULT 10,
          UNIQUE(user_id, prompt_id)
        );
      `);
      
      console.log('Integration prompt tables initialized successfully');
    } finally {
      client.release();
    }
  }
  
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id); // Alias for getUser
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }
  
  // Journal entries
  async getUserJournalEntries(userId: string, limit = 20): Promise<JournalEntry[]> {
    return await this.db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);
  }
  
  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    const result = await this.db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
    return result[0];
  }
  
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const result = await this.db.insert(journalEntries).values(entry).returning();
    return result[0];
  }
  
  async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const result = await this.db.update(journalEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
    return result[0];
  }
  
  async deleteJournalEntry(id: string): Promise<boolean> {
    const result = await this.db.delete(journalEntries).where(eq(journalEntries.id, id));
    return result.rowCount! > 0;
  }
  
  async searchJournalEntries(userId: string, query: string, tags?: string[]): Promise<JournalEntry[]> {
    let whereConditions = [eq(journalEntries.userId, userId)];
    
    if (query && query.trim()) {
      const trimmedQuery = query.trim();
      // Search in title, content, and also check if the query matches any tag
      whereConditions.push(sql`(
        ${journalEntries.title} ILIKE ${`%${trimmedQuery}%`} OR 
        ${journalEntries.content} ILIKE ${`%${trimmedQuery}%`} OR
        EXISTS (
          SELECT 1 FROM unnest(${journalEntries.tags}) AS tag 
          WHERE tag ILIKE ${`%${trimmedQuery}%`}
        )
      )`);
    }
    
    if (tags && tags.length > 0) {
      // Filter by specific tags using array overlap
      whereConditions.push(sql`${journalEntries.tags} && ${tags}`);
    }
    
    return await this.db.select()
      .from(journalEntries)
      .where(and(...whereConditions))
      .orderBy(desc(journalEntries.createdAt));
  }
  
  // Practices (admin-curated)
  async getPractices(category?: string): Promise<Practice[]> {
    let whereConditions: any[] = [];
    
    if (category) {
      whereConditions.push(eq(practices.category, category));
    }
    
    const query = whereConditions.length > 0 
      ? this.db.select().from(practices).where(and(...whereConditions))
      : this.db.select().from(practices);
      
    return await query.orderBy(practices.title);
  }
  
  async getPractice(id: string): Promise<Practice | undefined> {
    const result = await this.db.select().from(practices).where(eq(practices.id, id)).limit(1);
    return result[0];
  }
  
  async createPractice(practice: InsertPractice, adminId: string): Promise<Practice> {
    const practiceWithAdmin = { ...practice, createdByAdminId: adminId };
    const result = await this.db.insert(practices).values(practiceWithAdmin).returning();
    return result[0];
  }
  
  async updatePractice(id: string, updates: Partial<Practice>): Promise<Practice | undefined> {
    const result = await this.db.update(practices)
      .set(updates)
      .where(eq(practices.id, id))
      .returning();
    return result[0];
  }
  
  async deletePractice(id: string): Promise<boolean> {
    // First delete any user completions for this practice
    await this.db.delete(userPractices).where(eq(userPractices.practiceId, id));
    
    // Then delete the practice itself
    const result = await this.db.delete(practices).where(eq(practices.id, id));
    return result.rowCount! > 0;
  }
  
  // User practice tracking
  async getUserPracticeCompletions(userId: string, limit = 20): Promise<UserPractice[]> {
    return await this.db.select()
      .from(userPractices)
      .where(eq(userPractices.userId, userId))
      .orderBy(desc(userPractices.completedAt))
      .limit(limit);
  }
  
  async completePractice(userPractice: InsertUserPractice): Promise<UserPractice> {
    const result = await this.db.insert(userPractices).values(userPractice).returning();
    return result[0];
  }
  
  async getUserStreaks(userId: string): Promise<{ journalStreak: number; practiceStreak: number; totalDays: number }> {
    // Calculate journal streak
    const journalResult = await this.db.execute(sql`
      WITH daily_entries AS (
        SELECT DATE(created_at) as entry_date
        FROM journal_entries 
        WHERE user_id = ${userId}
        GROUP BY DATE(created_at)
        ORDER BY entry_date DESC
      ),
      streak_calc AS (
        SELECT entry_date,
               ROW_NUMBER() OVER (ORDER BY entry_date DESC) as rn,
               entry_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY entry_date DESC) - 1) as expected_date
        FROM daily_entries
      )
      SELECT COUNT(*) as streak
      FROM streak_calc
      WHERE entry_date = expected_date
        AND entry_date >= (SELECT MIN(entry_date) FROM streak_calc WHERE expected_date = entry_date)
    `);
    
    // Calculate practice streak
    const practiceResult = await this.db.execute(sql`
      WITH daily_practices AS (
        SELECT DATE(completed_at) as practice_date
        FROM user_practices 
        WHERE user_id = ${userId}
        GROUP BY DATE(completed_at)
        ORDER BY practice_date DESC
      ),
      streak_calc AS (
        SELECT practice_date,
               ROW_NUMBER() OVER (ORDER BY practice_date DESC) as rn,
               practice_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY practice_date DESC) - 1) as expected_date
        FROM daily_practices
      )
      SELECT COUNT(*) as streak
      FROM streak_calc
      WHERE practice_date = expected_date
        AND practice_date >= (SELECT MIN(practice_date) FROM streak_calc WHERE expected_date = practice_date)
    `);
    
    // Calculate total days since journey start
    const user = await this.getUser(userId);
    const totalDays = user?.journeyStartDate 
      ? Math.floor((Date.now() - user.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      journalStreak: Number(journalResult.rows[0]?.streak) || 0,
      practiceStreak: Number(practiceResult.rows[0]?.streak) || 0,
      totalDays
    };
  }
  
  // Progress tracking
  async getUserProgressEntries(userId: string, startDate?: Date, endDate?: Date): Promise<ProgressEntry[]> {
    let whereConditions = [eq(progressEntries.userId, userId)];
    
    if (startDate) {
      whereConditions.push(gte(progressEntries.date, startDate));
    }
    
    if (endDate) {
      whereConditions.push(lte(progressEntries.date, endDate));
    }
    
    return await this.db.select()
      .from(progressEntries)
      .where(and(...whereConditions))
      .orderBy(progressEntries.date);
  }
  
  async createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry> {
    const result = await this.db.insert(progressEntries).values(entry).returning();
    return result[0];
  }
  
  async updateProgressEntry(id: string, updates: Partial<ProgressEntry>): Promise<ProgressEntry | undefined> {
    const result = await this.db.update(progressEntries)
      .set(updates)
      .where(eq(progressEntries.id, id))
      .returning();
    return result[0];
  }
  
  // Community
  async getCommunityPosts(limit = 20, offset = 0): Promise<(CommunityPost & { author: User; commentCount: number; isLiked?: boolean })[]> {
    const result = await this.db.select({
      id: communityPosts.id,
      userId: communityPosts.userId,
      content: communityPosts.content,
      tags: communityPosts.tags,
      likes: communityPosts.likes,
      isAnonymous: communityPosts.isAnonymous,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
      author: users,
      commentCount: sql<number>`CAST(COUNT(${comments.id}) AS INTEGER)`
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .leftJoin(comments, eq(communityPosts.id, comments.postId))
    .groupBy(communityPosts.id, users.id)
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit)
    .offset(offset);
    
    return result as (CommunityPost & { author: User; commentCount: number })[];
  }
  
  async getUserCommunityPosts(userId: string): Promise<CommunityPost[]> {
    return await this.db.select()
      .from(communityPosts)
      .where(eq(communityPosts.userId, userId))
      .orderBy(desc(communityPosts.createdAt));
  }
  
  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const result = await this.db.insert(communityPosts).values(post).returning();
    return result[0];
  }
  
  async likeCommunityPost(postId: string, userId: string): Promise<boolean> {
    try {
      await this.db.insert(postLikes).values({ postId, userId }).onConflictDoNothing();
      await this.db.update(communityPosts)
        .set({ likes: sql`${communityPosts.likes} + 1` })
        .where(eq(communityPosts.id, postId));
      return true;
    } catch {
      return false; // Already liked or other error
    }
  }
  
  async unlikeCommunityPost(postId: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    
    if (result.rowCount! > 0) {
      await this.db.update(communityPosts)
        .set({ likes: sql`${communityPosts.likes} - 1` })
        .where(eq(communityPosts.id, postId));
      return true;
    }
    return false;
  }
  
  // Comments
  async getPostComments(postId: string): Promise<(Comment & { author: User })[]> {
    const result = await this.db.select({
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      content: comments.content,
      isAnonymous: comments.isAnonymous,
      createdAt: comments.createdAt,
      author: users
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);
    
    return result as (Comment & { author: User })[];
  }
  
  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await this.db.insert(comments).values(comment).returning();
    return result[0];
  }
  
  // Daily prompts
  async getTodaysPrompt(): Promise<DailyPrompt | undefined> {
    const result = await this.db.select()
      .from(dailyPrompts)
      .where(eq(dailyPrompts.isActive, true))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return result[0];
  }
  
  async getUserPromptResponse(userId: string, promptId: string): Promise<PromptResponse | undefined> {
    const result = await this.db.select()
      .from(promptResponses)
      .where(and(eq(promptResponses.userId, userId), eq(promptResponses.promptId, promptId)))
      .limit(1);
    return result[0];
  }
  
  async createPromptResponse(response: InsertPromptResponse): Promise<PromptResponse> {
    const result = await this.db.insert(promptResponses).values(response).returning();
    return result[0];
  }
  
  // Readings (admin-curated)
  async getReadings(category?: string): Promise<Reading[]> {
    let whereConditions: any[] = [];
    
    if (category) {
      whereConditions.push(eq(readings.category, category));
    }
    
    const query = whereConditions.length > 0 
      ? this.db.select().from(readings).where(and(...whereConditions))
      : this.db.select().from(readings);
      
    return await query.orderBy(readings.title);
  }
  
  async getReading(id: string): Promise<Reading | undefined> {
    const result = await this.db.select().from(readings).where(eq(readings.id, id)).limit(1);
    return result[0];
  }
  
  async createReading(reading: InsertReading, adminId: string): Promise<Reading> {
    const readingWithAdmin = { ...reading, createdByAdminId: adminId };
    const result = await this.db.insert(readings).values(readingWithAdmin).returning();
    return result[0];
  }
  
  async updateReading(id: string, updates: Partial<Reading>): Promise<Reading | undefined> {
    const result = await this.db.update(readings)
      .set(updates)
      .where(eq(readings.id, id))
      .returning();
    return result[0];
  }
  
  async deleteReading(id: string): Promise<boolean> {
    // First delete any user completions for this reading
    await this.db.delete(userReadings).where(eq(userReadings.readingId, id));
    
    // Then delete the reading itself
    const result = await this.db.delete(readings).where(eq(readings.id, id));
    return result.rowCount! > 0;
  }
  
  // Videos (admin-curated)
  async getVideos(category?: string): Promise<Video[]> {
    let whereConditions: any[] = [];
    
    if (category) {
      whereConditions.push(eq(videos.category, category));
    }
    
    const query = whereConditions.length > 0 
      ? this.db.select().from(videos).where(and(...whereConditions))
      : this.db.select().from(videos);
      
    return await query.orderBy(videos.title);
  }
  
  async getVideo(id: string): Promise<Video | undefined> {
    const result = await this.db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return result[0];
  }
  
  async createVideo(video: InsertVideo, adminId: string): Promise<Video> {
    const videoWithAdmin = { ...video, createdByAdminId: adminId };
    const result = await this.db.insert(videos).values(videoWithAdmin).returning();
    return result[0];
  }
  
  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const result = await this.db.update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return result[0];
  }
  
  async deleteVideo(id: string): Promise<boolean> {
    // First delete any user watch history for this video
    await this.db.delete(userVideos).where(eq(userVideos.videoId, id));
    
    // Then delete the video itself
    const result = await this.db.delete(videos).where(eq(videos.id, id));
    return result.rowCount! > 0;
  }
  
  // User content tracking
  async getUserReadingCompletions(userId: string, limit = 20): Promise<UserReading[]> {
    return await this.db.select()
      .from(userReadings)
      .where(eq(userReadings.userId, userId))
      .orderBy(desc(userReadings.completedAt))
      .limit(limit);
  }
  
  async completeReading(userReading: InsertUserReading): Promise<UserReading> {
    const result = await this.db.insert(userReadings).values(userReading).returning();
    return result[0];
  }
  
  async getUserVideoHistory(userId: string, limit = 20): Promise<UserVideo[]> {
    return await this.db.select()
      .from(userVideos)
      .where(eq(userVideos.userId, userId))
      .orderBy(desc(userVideos.watchedAt))
      .limit(limit);
  }
  
  async watchVideo(userVideo: InsertUserVideo): Promise<UserVideo> {
    const result = await this.db.insert(userVideos).values(userVideo).returning();
    return result[0];
  }
  
  // Push notification subscriptions
  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await this.db.select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)))
      .orderBy(desc(pushSubscriptions.createdAt));
  }
  
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // First deactivate any existing subscriptions for this user
    await this.db.update(pushSubscriptions)
      .set({ isActive: false })
      .where(eq(pushSubscriptions.userId, subscription.userId));
    
    // Then create the new subscription
    const result = await this.db.insert(pushSubscriptions).values(subscription).returning();
    return result[0];
  }
  
  async deactivateUserPushSubscriptions(userId: string): Promise<boolean> {
    const result = await this.db.update(pushSubscriptions)
      .set({ isActive: false })
      .where(eq(pushSubscriptions.userId, userId));
    return result.rowCount! > 0;
  }
  
  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    return await this.db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true))
      .orderBy(desc(pushSubscriptions.createdAt));
  }
  
  // Reminder scheduling
  async getUsersWithRemindersAt(time: string): Promise<User[]> {
    return await this.db.select()
      .from(users)
      .where(
        and(
          eq(users.reminderEnabled, true),
          eq(users.reminderTime, time)
        )
      );
  }
  
  // Integration prompts
  async getIntegrationPrompts(): Promise<IntegrationPrompt[]> {
    return await this.db.select()
      .from(integrationPrompts)
      .orderBy(integrationPrompts.sequence);
  }
  
  async getIntegrationPrompt(id: string): Promise<IntegrationPrompt | undefined> {
    const result = await this.db.select()
      .from(integrationPrompts)
      .where(eq(integrationPrompts.id, id))
      .limit(1);
    return result[0];
  }
  
  async getIntegrationPromptBySequence(sequence: number): Promise<IntegrationPrompt | undefined> {
    const result = await this.db.select()
      .from(integrationPrompts)
      .where(eq(integrationPrompts.sequence, sequence))
      .limit(1);
    return result[0];
  }
  
  async getIntegrationPromptsByCategory(category: string): Promise<IntegrationPrompt[]> {
    return await this.db.select()
      .from(integrationPrompts)
      .where(eq(integrationPrompts.category, category))
      .orderBy(integrationPrompts.sequence);
  }
  
  async seedIntegrationPrompts(prompts: InsertIntegrationPrompt[]): Promise<void> {
    // Delete dependent records first (foreign key constraints)
    await this.db.delete(practiceCompletions);
    await this.db.delete(userPromptProgress);
    // Now delete and replace the prompts
    await this.db.delete(integrationPrompts);
    if (prompts.length > 0) {
      await this.db.insert(integrationPrompts).values(prompts);
    }
  }
  
  // User prompt progress
  async getUserPromptProgress(userId: string): Promise<UserPromptProgress[]> {
    return await this.db.select()
      .from(userPromptProgress)
      .where(eq(userPromptProgress.userId, userId))
      .orderBy(desc(userPromptProgress.completedAt));
  }
  
  async getUserPromptProgressByPrompt(userId: string, promptId: string): Promise<UserPromptProgress | undefined> {
    const result = await this.db.select()
      .from(userPromptProgress)
      .where(
        and(
          eq(userPromptProgress.userId, userId),
          eq(userPromptProgress.promptId, promptId)
        )
      )
      .limit(1);
    return result[0];
  }
  
  async createUserPromptProgress(progress: InsertUserPromptProgress): Promise<UserPromptProgress> {
    const result = await this.db.insert(userPromptProgress).values(progress).returning();
    return result[0];
  }
  
  async getUserTotalPoints(userId: string): Promise<number> {
    const result = await this.db.select({ total: sql<number>`COALESCE(SUM(${userPromptProgress.pointsEarned}), 0)` })
      .from(userPromptProgress)
      .where(eq(userPromptProgress.userId, userId));
    return result[0]?.total || 0;
  }
  
  // Admin analytics
  async getAllUsers(): Promise<User[]> {
    return await this.db.select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUsersExportData(): Promise<any[]> {
    const result = await this.db.execute(sql`
      SELECT
        u.id,
        COALESCE(u.name, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')), '') AS name,
        u.email,
        u.journey_start_date,
        u.onboarding_complete,
        u.is_admin,
        u.reminder_enabled,
        u.reminder_time,
        u.reminder_types,
        COUNT(DISTINCT je.id)  AS journal_entries,
        COUNT(DISTINCT pc.id)  AS practice_completions,
        COUNT(DISTINCT pr.id)  AS prompt_completions,
        COUNT(DISTINCT wc.id)  AS wellbeing_checkins,
        COUNT(DISTINCT dj.id)  AS dream_entries,
        COUNT(DISTINCT ce.id)  AS creative_expressions,
        COUNT(DISTINCT cp.id)  AS community_posts
      FROM users u
      LEFT JOIN journal_entries      je ON je.user_id = u.id
      LEFT JOIN practice_completions pc ON pc.user_id = u.id
      LEFT JOIN prompt_responses     pr ON pr.user_id = u.id
      LEFT JOIN wellbeing_checkins   wc ON wc.user_id = u.id
      LEFT JOIN dream_journals       dj ON dj.user_id = u.id
      LEFT JOIN creative_expressions ce ON ce.user_id = u.id
      LEFT JOIN community_posts      cp ON cp.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.journey_start_date, u.onboarding_complete,
               u.is_admin, u.reminder_enabled, u.reminder_time, u.reminder_types,
               u.first_name, u.last_name, u.created_at
      ORDER BY u.created_at
    `);
    return result.rows as any[];
  }
  
  async getUserWellbeingCheckins(userId: string, limit = 30): Promise<WellbeingCheckin[]> {
    return await this.db.select()
      .from(wellbeingCheckins)
      .where(eq(wellbeingCheckins.userId, userId))
      .orderBy(desc(wellbeingCheckins.createdAt))
      .limit(limit);
  }
  
  async getTodaysWellbeingCheckin(userId: string): Promise<WellbeingCheckin | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const results = await this.db.select()
      .from(wellbeingCheckins)
      .where(
        and(
          eq(wellbeingCheckins.userId, userId),
          gte(wellbeingCheckins.createdAt, today),
          lte(wellbeingCheckins.createdAt, tomorrow)
        )
      )
      .limit(1);
    
    return results[0];
  }
  
  async createWellbeingCheckin(checkin: InsertWellbeingCheckin): Promise<WellbeingCheckin> {
    const results = await this.db.insert(wellbeingCheckins).values(checkin).returning();
    return results[0]!;
  }

  async getTodaysDreamJournal(userId: string): Promise<DreamJournal | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await this.db.select()
      .from(dreamJournals)
      .where(
        and(
          eq(dreamJournals.userId, userId),
          gte(dreamJournals.createdAt, today),
          lte(dreamJournals.createdAt, tomorrow)
        )
      )
      .limit(1);

    return results[0];
  }

  async getUserDreamJournals(userId: string, limit: number = 20): Promise<DreamJournal[]> {
    return this.db.select()
      .from(dreamJournals)
      .where(eq(dreamJournals.userId, userId))
      .orderBy(desc(dreamJournals.createdAt))
      .limit(limit);
  }

  async createDreamJournal(entry: InsertDreamJournal): Promise<DreamJournal> {
    const results = await this.db.insert(dreamJournals).values(entry).returning();
    return results[0]!;
  }

  async getUserCreativeExpressions(userId: string, limit: number = 20): Promise<CreativeExpression[]> {
    return this.db.select()
      .from(creativeExpressions)
      .where(eq(creativeExpressions.userId, userId))
      .orderBy(desc(creativeExpressions.createdAt))
      .limit(limit);
  }

  async createCreativeExpression(entry: InsertCreativeExpression): Promise<CreativeExpression> {
    const results = await this.db.insert(creativeExpressions).values(entry).returning();
    return results[0]!;
  }
  
  async getUserPracticeCompletionsByPrompt(userId: string, promptId: string): Promise<PracticeCompletion | undefined> {
    const results = await this.db.select()
      .from(practiceCompletions)
      .where(
        and(
          eq(practiceCompletions.userId, userId),
          eq(practiceCompletions.promptId, promptId)
        )
      )
      .limit(1);
    
    return results[0];
  }
  
  async getTodaysPracticeCompletion(userId: string, promptId: string): Promise<PracticeCompletion | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const results = await this.db.select()
      .from(practiceCompletions)
      .where(
        and(
          eq(practiceCompletions.userId, userId),
          eq(practiceCompletions.promptId, promptId),
          gte(practiceCompletions.completedAt, today),
          lte(practiceCompletions.completedAt, tomorrow)
        )
      )
      .limit(1);
    
    return results[0];
  }
  
  async createPracticeCompletion(completion: InsertPracticeCompletion): Promise<PracticeCompletion> {
    const results = await this.db.insert(practiceCompletions).values(completion).returning();
    return results[0]!;
  }
  
  async updateUserReminderSettings(userId: string, settings: {
    reminderEnabled?: boolean;
    reminderTime?: string;
    reminderTimezone?: string;
    reminderTypes?: string[];
    morningReminderEnabled?: boolean;
    morningReminderTime?: string;
    eveningReminderEnabled?: boolean;
    eveningReminderTime?: string;
    onboardingComplete?: boolean;
    journeyStartDate?: Date;
  }): Promise<User | undefined> {
    const results = await this.db.update(users)
      .set(settings)
      .where(eq(users.id, userId))
      .returning();
    
    return results[0];
  }

  async getUserAnalytics(userId: string): Promise<{
    user: User;
    stats: {
      journalCount: number;
      practiceCompletions: number;
      promptCompletions: number;
      totalPoints: number;
      journalStreak: number;
      practiceStreak: number;
      wellbeingCheckins: number;
      avgWellbeing: number;
    };
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get journal count
    const journalResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId));
    const journalCount = Number(journalResult[0]?.count || 0);
    
    // Get practice completions
    const practiceResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(userPractices)
      .where(eq(userPractices.userId, userId));
    const practiceCompletions = Number(practiceResult[0]?.count || 0);
    
    // Get prompt completions
    const promptResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(userPromptProgress)
      .where(eq(userPromptProgress.userId, userId));
    const promptCompletions = Number(promptResult[0]?.count || 0);
    
    // Get total points
    const totalPoints = await this.getUserTotalPoints(userId);
    
    // Get streaks
    const streaks = await this.getUserStreaks(userId);
    
    // Get wellbeing check-ins
    const wellbeingResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(wellbeingCheckins)
      .where(eq(wellbeingCheckins.userId, userId));
    const wellbeingCheckinsCount = Number(wellbeingResult[0]?.count || 0);
    
    // Get average wellbeing
    const avgWellbeingResult = await this.db.select({ avg: sql<number>`AVG(${wellbeingCheckins.wellbeingLevel})` })
      .from(wellbeingCheckins)
      .where(eq(wellbeingCheckins.userId, userId));
    const avgWellbeing = Number(avgWellbeingResult[0]?.avg || 0);

    // Get dream journal entries
    const dreamResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(dreamJournals)
      .where(eq(dreamJournals.userId, userId));
    const dreamEntriesCount = Number(dreamResult[0]?.count || 0);

    // Get creative expressions
    const creativeResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(creativeExpressions)
      .where(eq(creativeExpressions.userId, userId));
    const creativeExpressionsCount = Number(creativeResult[0]?.count || 0);

    // Get community posts
    const postsResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(communityPosts)
      .where(eq(communityPosts.userId, userId));
    const communityPostsCount = Number(postsResult[0]?.count || 0);
    
    return {
      user,
      stats: {
        journalCount,
        practiceCompletions,
        promptCompletions,
        totalPoints,
        journalStreak: streaks.journalStreak,
        practiceStreak: streaks.practiceStreak,
        wellbeingCheckins: wellbeingCheckinsCount,
        avgWellbeing: Math.round(avgWellbeing * 10) / 10,
        dreamEntries: dreamEntriesCount,
        creativeExpressions: creativeExpressionsCount,
        communityPosts: communityPostsCount,
      }
    };
  }
  
  async getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalJournalEntries: number;
    totalPracticeCompletions: number;
    totalPromptCompletions: number;
  }> {
    // Get total users
    const usersResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(users);
    const totalUsers = Number(usersResult[0]?.count || 0);
    
    // Get active users (users who have logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsersResult = await this.db.select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(journalEntries)
      .where(gte(journalEntries.createdAt, thirtyDaysAgo));
    const activeUsers = Number(activeUsersResult[0]?.count || 0);
    
    // Get total journal entries
    const journalResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(journalEntries);
    const totalJournalEntries = Number(journalResult[0]?.count || 0);
    
    // Get total practice completions
    const practiceResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(userPractices);
    const totalPracticeCompletions = Number(practiceResult[0]?.count || 0);
    
    // Get total prompt completions
    const promptResult = await this.db.select({ count: sql<number>`COUNT(*)` })
      .from(userPromptProgress);
    const totalPromptCompletions = Number(promptResult[0]?.count || 0);
    
    return {
      totalUsers,
      activeUsers,
      totalJournalEntries,
      totalPracticeCompletions,
      totalPromptCompletions,
    };
  }

  async getSiteSetting(key: string): Promise<string | null> {
    const result = await this.db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return result[0]?.value ?? null;
  }

  async setSiteSetting(key: string, value: string): Promise<void> {
    await this.db.insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getAllSiteSettings(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(siteSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value ?? '']));
  }
}

export const storage = new DatabaseStorage();
