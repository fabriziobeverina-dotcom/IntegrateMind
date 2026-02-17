import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - updated for Replit Auth compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  isAdmin: boolean("is_admin").default(false), // Admin role for content management
  createdAt: timestamp("created_at").defaultNow(),
  journeyStartDate: timestamp("journey_start_date").defaultNow(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Daily reminder preferences
  reminderEnabled: boolean("reminder_enabled").default(false),
  reminderTime: varchar("reminder_time").default("09:00"), // HH:MM format (legacy)
  reminderTimezone: varchar("reminder_timezone").default("UTC"),
  reminderTypes: text("reminder_types").array().default([]), // ['journal', 'progress', 'practice']
  morningReminderEnabled: boolean("morning_reminder_enabled").default(true),
  morningReminderTime: varchar("morning_reminder_time").default("08:00"), // HH:MM format
  eveningReminderEnabled: boolean("evening_reminder_enabled").default(true),
  eveningReminderTime: varchar("evening_reminder_time").default("20:00"), // HH:MM format
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  mood: integer("mood"), // 1-10 scale
  isPrivate: boolean("is_private").default(false),
  aiReflection: text("ai_reflection"), // AI-generated reflection (premium feature)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily practices table - admin curated content
export const practices = pgTable("practices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: text("duration").notNull(), // e.g., "15 min", "30 min"
  category: text("category").notNull(), // 'Calming', 'Energizing', 'Grounding', 'Dreamwork'
  instructor: text("instructor").notNull(),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  isPremium: boolean("is_premium").default(false),
  isFeatured: boolean("is_featured").default(false), // Highlight in user interface
  tags: text("tags").array().default([]), // For better categorization and search
  createdAt: timestamp("created_at").defaultNow(),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id), // Track which admin created it
});

// User practice completions (for tracking)
export const userPractices = pgTable("user_practices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  practiceId: varchar("practice_id").notNull().references(() => practices.id),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

// Daily progress tracking
export const progressEntries = pgTable("progress_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  mood: integer("mood"), // 1-10 scale
  sleep: integer("sleep"), // 1-10 scale  
  grounding: integer("grounding"), // 1-10 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community posts
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  likes: integer("likes").default(0),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on community posts
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post likes tracking
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure a user can only like a post once
  uniqueUserPost: sql`UNIQUE(${table.postId}, ${table.userId})`
}));

// Reading materials - admin curated
export const readings = pgTable("readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content"), // Full article/reading content (optional if link is provided)
  link: text("link"), // External link to reading material (optional if content is provided)
  author: text("author"),
  category: text("category").notNull(), // 'Integration Guide', 'Research', 'Personal Stories', 'Medicines', 'Stories', 'Science'
  readTime: text("read_time"), // e.g., "5 min read"
  tags: text("tags").array().default([]),
  isFeatured: boolean("is_featured").default(false),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
});

// Video library - admin curated  
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  instructor: text("instructor"),
  duration: text("duration"), // e.g., "20 min"
  category: text("category").notNull(), // 'Educational', 'Testimonial', 'Workshop'
  tags: text("tags").array().default([]),
  isFeatured: boolean("is_featured").default(false),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
});

// User reading completions
export const userReadings = pgTable("user_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  readingId: varchar("reading_id").notNull().references(() => readings.id),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

// User video watch progress
export const userVideos = pgTable("user_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  watchedAt: timestamp("watched_at").defaultNow(),
  notes: text("notes"),
});

// Daily prompts
export const dailyPrompts = pgTable("daily_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  category: text("category").notNull(), // 'integration', 'reflection', 'gratitude', etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User responses to daily prompts
export const promptResponses = pgTable("prompt_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: varchar("prompt_id").notNull().references(() => dailyPrompts.id),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
});

// Reminder delivery history
export const reminderDeliveries = pgTable("reminder_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reminderType: text("reminder_type").notNull(), // 'journal', 'progress', 'practice'
  scheduledFor: timestamp("scheduled_for").notNull(),
  deliveredAt: timestamp("delivered_at"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed', 'clicked'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Integration prompts - 65 prompts for the 60-day integration journey
export const integrationPrompts = pgTable("integration_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequence: integer("sequence").notNull().unique(), // 1-65
  category: text("category").notNull(), // 'Body', 'Emotion', 'Social', 'Environment', 'Spirit', 'Milestone'
  prompt: text("prompt").notNull(),
  practice: text("practice").notNull(), // The micro-practice activity
  pointsValue: integer("points_value").notNull().default(10), // Points earned for completing
  createdAt: timestamp("created_at").defaultNow(),
});

// User progress through integration prompts
export const userPromptProgress = pgTable("user_prompt_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: varchar("prompt_id").notNull().references(() => integrationPrompts.id),
  response: text("response").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  pointsEarned: integer("points_earned").notNull().default(10),
}, (table) => ({
  // Ensure a user can only complete each prompt once
  uniqueUserPrompt: sql`UNIQUE(${table.userId}, ${table.promptId})`
}));

// Daily wellbeing check-ins with mood tracking
export const wellbeingCheckins = pgTable("wellbeing_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wellbeingLevel: integer("wellbeing_level").notNull(), // 1-5 scale (1=sad, 2=low, 3=neutral, 4=good, 5=euphoric)
  notes: text("notes"),
  feelingAboutDay: text("feeling_about_day"),
  reachedIntention: text("reached_intention"),
  dayTitle: text("day_title"),
  strongestSensation: text("strongest_sensation"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIndex: index("wellbeing_user_date_idx").on(table.userId, table.createdAt)
}));

// Dream journal entries (Tue/Thu/Sun)
export const dreamJournals = pgTable("dream_journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dreamTitle: text("dream_title"),
  dreamImages: text("dream_images"),
  dreamPresent: text("dream_present"),
  dreamEmotion: text("dream_emotion"),
  dreamBody: text("dream_body"),
  dreamSpeak: text("dream_speak"),
  dreamConnect: text("dream_connect"),
  dreamInviting: text("dream_inviting"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIndex: index("dream_user_date_idx").on(table.userId, table.createdAt)
}));

// Creative expression drawings (twice monthly)
export const creativeExpressions = pgTable("creative_expressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  intentionText: text("intention_text"),
  drawingImage: text("drawing_image"),
  strokeData: jsonb("stroke_data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIndex: index("creative_user_date_idx").on(table.userId, table.createdAt)
}));

// Practice completions tracking (for the daily micro-practice button)
export const practiceCompletions = pgTable("practice_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: varchar("prompt_id").notNull().references(() => integrationPrompts.id),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
  journeyStartDate: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiReflection: true,
});

export const insertPracticeSchema = createInsertSchema(practices).omit({
  id: true,
  createdAt: true,
  createdByAdminId: true, // Set automatically by backend
});

export const insertUserPracticeSchema = createInsertSchema(userPractices).omit({
  id: true,
  completedAt: true,
});

export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likes: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertDailyPromptSchema = createInsertSchema(dailyPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertPromptResponseSchema = createInsertSchema(promptResponses).omit({
  id: true,
  createdAt: true,
});

export const insertReadingSchema = createInsertSchema(readings).omit({
  id: true,
  createdAt: true,
  createdByAdminId: true, // Set automatically by backend
}).refine(
  (data) => data.content || data.link,
  {
    message: "Either content or link must be provided",
    path: ["content"],
  }
);

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  createdByAdminId: true, // Set automatically by backend
});

export const insertUserReadingSchema = createInsertSchema(userReadings).omit({
  id: true,
  completedAt: true,
});

export const insertUserVideoSchema = createInsertSchema(userVideos).omit({
  id: true,
  watchedAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export const insertReminderDeliverySchema = createInsertSchema(reminderDeliveries).omit({
  id: true,
  createdAt: true,
  deliveredAt: true,
});

export const insertIntegrationPromptSchema = createInsertSchema(integrationPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertUserPromptProgressSchema = createInsertSchema(userPromptProgress).omit({
  id: true,
  completedAt: true,
});

export const insertWellbeingCheckinSchema = createInsertSchema(wellbeingCheckins).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeCompletionSchema = createInsertSchema(practiceCompletions).omit({
  id: true,
  completedAt: true,
});

export const insertDreamJournalSchema = createInsertSchema(dreamJournals).omit({
  id: true,
  createdAt: true,
});

export const insertCreativeExpressionSchema = createInsertSchema(creativeExpressions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type Practice = typeof practices.$inferSelect;
export type InsertPractice = z.infer<typeof insertPracticeSchema>;

export type UserPractice = typeof userPractices.$inferSelect;
export type InsertUserPractice = z.infer<typeof insertUserPracticeSchema>;

export type Reading = typeof readings.$inferSelect;
export type InsertReading = z.infer<typeof insertReadingSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type UserReading = typeof userReadings.$inferSelect;
export type InsertUserReading = z.infer<typeof insertUserReadingSchema>;

export type UserVideo = typeof userVideos.$inferSelect;
export type InsertUserVideo = z.infer<typeof insertUserVideoSchema>;

export type ProgressEntry = typeof progressEntries.$inferSelect;
export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type DailyPrompt = typeof dailyPrompts.$inferSelect;
export type InsertDailyPrompt = z.infer<typeof insertDailyPromptSchema>;

export type PromptResponse = typeof promptResponses.$inferSelect;
export type InsertPromptResponse = z.infer<typeof insertPromptResponseSchema>;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export type ReminderDelivery = typeof reminderDeliveries.$inferSelect;
export type InsertReminderDelivery = z.infer<typeof insertReminderDeliverySchema>;

export type IntegrationPrompt = typeof integrationPrompts.$inferSelect;
export type InsertIntegrationPrompt = z.infer<typeof insertIntegrationPromptSchema>;

export type UserPromptProgress = typeof userPromptProgress.$inferSelect;
export type InsertUserPromptProgress = z.infer<typeof insertUserPromptProgressSchema>;

export type WellbeingCheckin = typeof wellbeingCheckins.$inferSelect;
export type InsertWellbeingCheckin = z.infer<typeof insertWellbeingCheckinSchema>;

export type PracticeCompletion = typeof practiceCompletions.$inferSelect;
export type InsertPracticeCompletion = z.infer<typeof insertPracticeCompletionSchema>;

export type DreamJournal = typeof dreamJournals.$inferSelect;
export type InsertDreamJournal = z.infer<typeof insertDreamJournalSchema>;

export type CreativeExpression = typeof creativeExpressions.$inferSelect;
export type InsertCreativeExpression = z.infer<typeof insertCreativeExpressionSchema>;
