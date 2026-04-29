# Integration Compass - Ayahuasca Integration Platform

## Overview

Integration Compass is a comprehensive wellness application designed to support individuals on their ayahuasca and psychedelic integration journey. The platform offers personal journaling, guided practices, community support, and progress tracking to create a holistic healing environment. It features a 77-day integration prompt cycle with daily and milestone prompts across six categories (Body, Emotion, Social, Environment, Spirit, Mental). Additionally, it includes a ceremony date and phase awareness system to tailor content based on the user's integration journey stage, and a gamification system called "Seeds" to reward user engagement. The platform also provides a "Morning Intention" feature and somatic practice nudges.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a React-based frontend with TypeScript, styled using Tailwind CSS and shadcn/ui components. It employs Wouter for routing, TanStack Query for server state management, and React hooks for local state. The design emphasizes a calming, healing aesthetic with a light blue primary color combined with warm tones, visual-first experiences, and custom design tokens for light/dark themes.

### Backend Architecture
The backend is built with Node.js and Express.js, following a REST API pattern. It uses Drizzle ORM for type-safe database operations and integrates with Replit OIDC for session-based authentication. A storage abstraction layer provides consistent interfaces across features.

### Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM for schema definition, migrations, and type-safe operations. Neon serverless PostgreSQL is used for cloud deployment, and a dedicated sessions table stores authentication state.

### Authentication and Authorization
Authentication is handled via Replit's OIDC system, with server-side sessions stored in PostgreSQL. Custom middleware protects routes, and user creation/updates occur automatically through OIDC claims.

### Core Features
- **Integration Prompt System**: A 77-day cycle with daily prompts (Body, Emotion, Social, Environment, Spirit, Mental) and 5 milestone prompts. Prompts include reflection questions and micro-practice exercises.
- **Ceremony Date / Phase Awareness System**: Onboarding flow to capture ceremony timing and medicine, server-side calculation of integration phases (Acute, Integration, Deepening, Long-term, None), and UI components to display phase-specific information and content.
- **Seeds Gamification System**: Rewards user actions (journaling, prompt completion, practice completion, community engagement) with "Seeds" to progress through plant growth stages and unlock badges.
- **Morning Intention Feature**: Allows users to set daily intentions via a Dashboard card, which are then referenced in evening reflections.
- **Somatic Practice Push Notification & In-App Nudge**: Uses Web Push API for notifications and an in-app banner to encourage somatic practice completion based on specific user engagement criteria.
- **Facilitator Consent System**: Users provide explicit consent during onboarding for facilitators to access their written content. This consent gates admin data export functionality.

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL
- **Authentication**: Replit OIDC service
- **Build & Deployment**: Replit platform

### Frontend Libraries
- **UI Components**: Radix UI, shadcn/ui
- **Icons**: Lucide React
- **Data Visualization**: Recharts
- **Form Management**: React Hook Form, Zod
- **Date Handling**: date-fns
- **Routing**: Wouter
- **State Management**: TanStack Query

### Backend Services
- **Database ORM**: Drizzle ORM
- **Session Management**: connect-pg-simple
- **Authentication**: passport, openid-client
- **Validation**: Zod

### Development Tools
- **Language**: TypeScript
- **Bundler**: ESBuild
- **CSS Preprocessing**: PostCSS, Autoprefixer