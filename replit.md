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

The color scheme centers around calming earth tones (Deep Forest Green, Sage Green, Warm Earth) with accent colors (Soft Amber, Muted Purple) to create a grounding, wellness-focused aesthetic.

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