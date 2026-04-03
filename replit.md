# Integration Compass - Ayahuasca Integration Platform

## Overview

Integration Compass is a comprehensive wellness application designed to support individuals on their ayahuasca and psychedelic integration journey. The platform combines personal journaling, guided practices, community support, and progress tracking to create a holistic healing environment. The application draws inspiration from mindfulness apps like Calm and Headspace while incorporating social features similar to Circle or Discord.

### Integration Prompt System

The platform features a 77-day integration prompt cycle designed to guide users through a comprehensive healing journey:

**Daily Prompt Rotation (Days 1-72):**
- 6 categories rotate daily: Body, Emotion, Social, Environment, Spirit, Mental
- Each category contains 12 prompts (72 total category prompts)
- Rotation pattern: Day 1 (Body), Day 2 (Emotion), Day 3 (Social), Day 4 (Environment), Day 5 (Spirit), Day 6 (Mental), Day 7 (Body #2), etc.
- Each prompt includes a reflection question and micro-practice exercise

**Milestone Prompts (Days 73-77):**
- 5 milestone prompts for deeper integration work
- Appear after completing all 72 category prompts
- Focus on synthesizing insights from the full journey

**Cycle Completion:**
- After day 77, the cycle automatically restarts from day 1
- Users can repeat the journey as many times as needed
- Progress tracking maintains history across multiple cycles

### Ceremony Date / Phase Awareness System

The platform includes a ceremony date onboarding and integration phase tracking system:

**Onboarding Flow (2 screens after main onboarding):**
- Screen 1 "Your Ceremony Journey": timing selection (8 options from "This week" to "6+ months ago", plus "No ceremony" and "Prefer not to say")
- Screen 2 "Which medicine guided you?": multi-select medicine options (Ayahuasca, San Pedro, Psilocybin, Kambo, etc.)
- Controlled by `onboarding_ceremony_complete` boolean on user record
- Appears after `onboarding_complete = true` but before `onboarding_ceremony_complete = true`
- POST `/api/user/ceremony` saves ceremony data

**Phase Calculation (server-side):**
- Acute: 0–14 days after ceremony
- Integration: 15–56 days (weeks 2–8)
- Deepening: 57–168 days (weeks 8–24)
- Long-term: 169+ days (6+ months)
- None: no ceremony recorded or "prefer not to say"

**Phase UI Components:**
- `PhaseIndicator`: collapsible chip on Dashboard showing current phase + week number
- `PhaseTransitionInterstitial`: full-screen overlay when user enters a new phase for first time
- Profile page: "Ceremony & Phase" card showing phase, week, and medicine tags

**Phase-Tagged Prompts:**
- `integration_prompts.phase_tags` column (text array)
- Body + Environment: all `any`
- Emotion: all `acute, integration`
- Social: first 3 `integration, deepening, long_term`; rest `any`
- Spirit: first 6 `any`; last 6 `integration, deepening, long_term`
- Mental: first 6 `integration, deepening, long_term`; last 6 `any`
- Milestone: all `deepening, long_term`

**Acute Phase Banner:** Shown in DailyPrompt when `userPhase === 'acute'`

**API Endpoints:**
- `GET /api/user/phase`: Returns phase, label, description, daysSince, weeksSince, medicine, phaseTransitionShown
- `POST /api/user/ceremony`: Saves weeksAgo + medicine, calculates phase, sets `onboarding_ceremony_complete = true`
- `POST /api/user/phase/transition-seen`: Marks a phase transition overlay as seen

**New DB Columns (users table):**
- `onboarding_ceremony_complete` boolean
- `ceremony_weeks_ago` integer (nullable; -1 = no ceremony)
- `ceremony_date_approx` text (YYYY-MM-DD)
- `ceremony_medicine` text[]
- `ceremony_phase` text
- `phase_transition_shown` jsonb

### Seeds Gamification System

The platform includes a progressive gamification system called **Seeds** that rewards meaningful engagement:

**Seeds Award Actions:**
- Journal entry (100+ words): 15 seeds; 300+ words: 25 seeds (idempotent per entry)
- Prompt completion: 10 seeds
- First completion in each category: 25 seeds bonus
- Practice completion: 20 seeds (somatic: 30 seeds)
- Community engagement (like/comment): 5 seeds
- Wellbeing pulse check-in: 15 seeds
- 7-day streak: 50 seeds (weekly, idempotent)
- 21-day streak: 150 seeds (weekly, idempotent)
- Cycle complete (77-day): 500 seeds

**Plant Growth Stages** (cumulative seeds thresholds):
- Seed (0–100), Sprout (101–300), Plant (301–700), Flowering (701–1500), Tree (1501+)

**8 Badges:** first_root, body_awakened, full_spectrum, deep_diver, the_long_walk, full_circle, witness, tender

**Frontend Components:**
- `PlantVisualization.tsx`: SVG plant with 5 growth stages
- `BadgeGrid.tsx`: 4×2 badge grid with tooltips showing locked/unlocked state
- `SeedsAward.tsx`: Floating +N seeds animation overlay + full-screen badge unlock modal
- `useGamification.ts`: TanStack Query hook for `/api/gamification/status`

**API Endpoints:**
- `GET /api/gamification/status`: Returns seedsTotal, plantStage, badgesUnlocked, hasEarnedFirstSeeds
- `GET /api/gamification/history`: Paginated seeds history

**Design Rule:** Gamification UI hidden until first seeds earned (hasEarnedFirstSeeds). No leaderboards.

### Somatic Practice Push Notification & In-App Nudge

**Push Notification Infrastructure:**
- Native Web Push API with service worker (`client/public/sw.js`)
- Simplified utilities in `client/src/lib/push.ts`: `subscribeToPush()`, `unsubscribeFromPush()`, `getPushSubscriptionStatus()`, `savePushSubscription()`
- VAPID keys in `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_EMAIL` env vars
- Full PushSubscription JSON stored in `users.push_subscription` (jsonb) + legacy `push_subscriptions` table

**Permission Request Screen (`PushPermissionScreen.tsx`):**
- Full-screen interstitial shown after ceremony onboarding completes
- Controlled by `users.push_permission_asked` boolean (set immediately when shown)
- "Yes, remind me" → calls `subscribeToPush()` → saves subscription
- "Not now" → marks asked without subscribing, never shows again
- Hidden entirely on browsers without Push API support

**Somatic Nudge Condition (all must be true):**
- `somatic_practice_completed = false`
- User has ≥ 3 journal entries
- ≥ 5 days since first journal entry
- `somatic_nudge_sent_at` is null OR > 7 days ago

**Daily Cron Job:**
- Runs at 09:00 UTC via server-side timer in `reminderScheduler.ts`
- Also triggerable via `POST /api/push/send-somatic-nudge` with `X-Cron-Secret` header
- Only sends between 08:00–21:00 UTC
- On 410/404 subscription errors: clears stored push_subscription

**Global Throttle:** Max 1 push per user per 20 hours; `last_notification_sent_at` tracks last send

**In-App Banner (Practices page):**
- Amber inline banner shown above category filter when somatic nudge condition is true
- Shows regardless of push notification permission status
- Dismiss button: sets `somatic_nudge_shown_at` (hides for 7 days)
- Tapping banner: filters to Somatic category + scrolls + amber pulse highlight
- Hidden permanently once somatic practice is completed

**New Users Columns:** `push_permission_asked`, `push_subscription` (jsonb), `somatic_nudge_sent_at`, `somatic_nudge_shown_at`, `somatic_practice_completed`, `last_notification_sent_at`

**API Endpoints:**
- `POST /api/push/subscribe` — saves subscription (new JSON format + legacy)
- `POST /api/push/unsubscribe` — removes subscription
- `POST /api/push/permission-asked` — marks permission screen shown
- `GET /api/push/status` — returns subscribed, permission_asked, somatic_nudge_eligible, somatic_banner_visible
- `POST /api/push/somatic-nudge-shown` — records banner dismissal
- `POST /api/push/send-somatic-nudge` — cron trigger (X-Cron-Secret required)

**DB Note:** `tableName: 'sessions'` set in connect-pg-simple config to match drizzle schema. Do NOT run `db:push --force` without checking — it previously dropped the session table.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based frontend built with TypeScript and styled using Tailwind CSS with shadcn/ui components. The architecture follows a component-based design pattern with:

- **React Router**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and React hooks for local state
- **UI Framework**: shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design tokens supporting light/dark themes
- **Build Tool**: Vite for fast development and optimized production builds

The color scheme features light blue as the primary color combined with a warm palette including amber, coral, and beige tones. This creates a calming, healing-focused aesthetic that balances cool blues with warm earth tones. The design philosophy emphasizes visual-first experiences with hero imagery, reduced text, and beautiful gradients. The landing page features a full-screen hero image of a person meditating on a dock with a compass symbol, creating an immediate emotional connection. The Paojilhuasca compass logo appears on the journey start screen.

### Backend Architecture
The backend is built with Express.js and follows a REST API pattern:

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware for JSON parsing and error handling
- **Database Layer**: Drizzle ORM with type-safe database operations
- **Authentication**: Replit OIDC integration with session-based authentication
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple

The server implements a storage abstraction layer that provides consistent interfaces for user management, journal entries, practices, community features, and progress tracking.

### Data Storage
The application uses PostgreSQL as the primary database with Drizzle ORM providing type-safe database operations:

- **Schema Definition**: Centralized schema in shared/schema.ts with Zod validation
- **Migration Management**: Drizzle Kit for schema migrations
- **Connection**: Neon serverless PostgreSQL for cloud deployment
- **Session Storage**: Dedicated sessions table for authentication state

Key data models include users, journal entries, practices, community posts, progress tracking, and daily prompts with proper foreign key relationships and indexing.

### Authentication and Authorization
Authentication is handled through Replit's OIDC system:

- **Provider**: Replit OIDC with OpenID Connect
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Middleware**: Custom authentication middleware for protected routes
- **User Management**: Automatic user creation/updates through OIDC claims

The system supports user profile management with provider integration and maintains session persistence across requests.

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OIDC service for user authentication
- **Build & Deployment**: Replit platform with custom Vite configuration

### Frontend Libraries
- **UI Components**: Radix UI primitives for accessible component foundations
- **Icons**: Lucide React for consistent iconography
- **Data Visualization**: Recharts for progress tracking charts
- **Form Management**: React Hook Form with Zod schema validation
- **Date Handling**: date-fns for date manipulation and formatting

### Backend Services
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Authentication**: passport with openid-client for OIDC integration
- **Validation**: Zod for runtime type validation across shared schemas

### Development Tools
- **TypeScript**: Full-stack type safety
- **ESBuild**: Fast bundling for production server builds
- **PostCSS & Autoprefixer**: CSS processing and vendor prefixing
- **Replit Plugins**: Development tools for enhanced Replit integration

The application is designed to be self-contained with minimal external API dependencies, focusing on user privacy and data ownership while providing a rich, interactive experience for integration support.