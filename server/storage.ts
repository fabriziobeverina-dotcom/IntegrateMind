import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type JournalEntry,
  type InsertJournalEntry,
  type Practice,
  type InsertPractice,
  type UserPractice,
  type InsertUserPractice,
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
  users,
  journalEntries,
  practices,
  userPractices,
  progressEntries,
  communityPosts,
  comments,
  postLikes,
  dailyPrompts,
  promptResponses
} from "@shared/schema";

export interface IStorage {
  // User management  
  getUser(id: string): Promise<User | undefined>;
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
  
  // Practices
  getPractices(category?: string): Promise<Practice[]>;
  getPractice(id: string): Promise<Practice | undefined>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  
  // User practice tracking
  getUserPracticeCompletions(userId: string, limit?: number): Promise<UserPractice[]>;
  completePractice(userPractice: InsertUserPractice): Promise<UserPractice>;
  getUserStreaks(userId: string): Promise<{ journalStreak: number; practiceStreak: number; totalDays: number }>;
  
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
}

export class DatabaseStorage implements IStorage {
  private db;
  
  constructor() {
    const connection = neon(process.env.DATABASE_URL!);
    this.db = drizzle(connection);
  }
  
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
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
    
    if (query) {
      whereConditions.push(sql`(${journalEntries.title} ILIKE ${`%${query}%`} OR ${journalEntries.content} ILIKE ${`%${query}%`})`);
    }
    
    if (tags && tags.length > 0) {
      whereConditions.push(sql`${journalEntries.tags} && ${tags}`);
    }
    
    return await this.db.select()
      .from(journalEntries)
      .where(and(...whereConditions))
      .orderBy(desc(journalEntries.createdAt));
  }
  
  // Practices
  async getPractices(userId: string, category?: string): Promise<Practice[]> {
    let whereConditions = [eq(practices.userId, userId)];
    
    if (category) {
      whereConditions.push(eq(practices.category, category));
    }
    
    return await this.db.select()
      .from(practices)
      .where(and(...whereConditions))
      .orderBy(practices.title);
  }
  
  async getPractice(id: string, userId?: string): Promise<Practice | undefined> {
    let whereConditions = [eq(practices.id, id)];
    
    if (userId) {
      whereConditions.push(eq(practices.userId, userId));
    }
    
    const result = await this.db.select().from(practices).where(and(...whereConditions)).limit(1);
    return result[0];
  }
  
  async createPractice(practice: InsertPractice): Promise<Practice> {
    const result = await this.db.insert(practices).values(practice).returning();
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
}

export const storage = new DatabaseStorage();
