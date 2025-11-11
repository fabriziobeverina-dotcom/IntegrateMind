# Integration Compass - Complete Feature Specification

## Overview

Integration Compass is a comprehensive wellness platform designed to support individuals on their ayahuasca and psychedelic integration journey. The application provides a structured 77-day program combining personal journaling, guided practices, community support, and progress tracking to facilitate meaningful, lasting transformation.

## Core Philosophy

The platform emphasizes:
- **Visual-first design** with calming imagery and minimal text
- **Holistic healing** addressing Body, Emotion, Social, Environment, Spirit, and Mental dimensions
- **Evidence-based practices** combining ancient wisdom with modern wellness science
- **Community connection** while maintaining personal privacy and safety
- **Progressive engagement** through gamification and streak tracking

---

## Key Features

### 1. 77-Day Integration Prompt System

**Overview:**
A carefully curated journey through 77 daily prompts designed to guide comprehensive integration work.

**Structure:**
- **Days 1-72:** Six rotating categories with 12 prompts each
  - Body: Physical wellness, movement, embodiment
  - Emotion: Emotional processing, feeling awareness
  - Social: Relationships, connection, boundaries
  - Environment: Space, nature, surroundings
  - Spirit: Meaning, purpose, transcendence
  - Mental: Thoughts, beliefs, patterns

- **Days 73-77:** Five milestone prompts for deeper synthesis
  - Reflection on the complete journey
  - Integration of insights across all categories
  - Setting intentions for ongoing practice

**Rotation Pattern:**
- Day 1: Body #1, Day 2: Emotion #1, Day 3: Social #1, Day 4: Environment #1, Day 5: Spirit #1, Day 6: Mental #1
- Day 7: Body #2, Day 8: Emotion #2... and so on
- After Day 77, the cycle automatically restarts

**Prompt Components:**
Each daily prompt includes:
1. **Reflection Question:** Thoughtful prompt for journaling
2. **Micro-Practice:** Small, actionable exercise (5-15 minutes)
3. **Points System:** Earn points for completing prompts (default: 10 points)
4. **Category Badge:** Visual indicator of prompt type
5. **Progress Tracking:** Day number and sequence position (e.g., "Day 15 • 15/77")

**User Experience:**
- Prompts appear automatically based on journey start date
- Cannot skip ahead (one prompt per day)
- Can complete micro-practice and reflection separately
- Earn points upon completion to track engagement
- Visual indicators show completed prompts

---

### 2. Daily Wellbeing Check-In

**Purpose:**
Quick emotional temperature check to track mood patterns over time.

**Features:**
- **5-Level Scale:** Very Low, Low, Neutral, Good, Euphoric
- **One tap recording:** Single click to log daily wellbeing
- **Visual feedback:** Color-coded mood indicators (red → orange → yellow → lime → green)
- **Streak protection:** Once per day limit prevents over-tracking
- **Data privacy:** Personal wellbeing data never shared

**Mobile Optimization:**
- Ultra-compact buttons on mobile (60px height)
- Shortened labels for small screens ("OK" instead of "Neutral")
- Touch-optimized targets
- Prevents accidental double-tapping

---

### 3. Streak Tracking System

**Components:**

**Journal Streak:**
- Tracks consecutive days of journaling
- Visual progress bar
- Real-time updates

**Practice Streak:**
- Tracks consecutive days completing practices
- Separate from journal streak
- Independent progress tracking

**Total Journey Days:**
- Shows overall time in program
- Milestone achievements at 7, 30+ days
- Achievement badges ("Week Warrior! 🏆", "Month Master! 🌟")

**Visual Design:**
- Flame icon for motivation
- Color-coded progress bars (light blue for journal, amber for practice)
- Responsive grid layout (stacks on mobile)

---

### 4. Progress Visualization

**Metrics Tracked:**
1. **Mood:** Overall emotional wellbeing (0-10 scale)
2. **Sleep Quality:** Rest and recovery quality (0-10 scale)
3. **Grounding:** Connection to body and present moment (0-10 scale)

**Features:**
- **Interactive Charts:** Line graphs showing weekly trends
- **Metric Switching:** Toggle between mood/sleep/grounding
- **Trend Indicators:** Show improvement/decline with badges
- **7-Day View:** Weekly overview for pattern recognition
- **Current Value Display:** Large, prominent current metric score

**Chart Specifications:**
- Built with Recharts library
- Responsive design (adjusts to screen size)
- Color-coded by metric type
- Tooltips on hover for exact values
- Grid lines for easy reading

---

### 5. Practice Library

**Categories:**
- Calming: Relaxation, stress reduction
- Energizing: Vitality, motivation
- Grounding: Present moment awareness
- Dreamwork: Sleep and subconscious exploration

**Practice Features:**
- Title and description
- Duration indicator
- Category badge
- Difficulty level
- Media support (audio/video)
- Tags for discovery
- Completion tracking

**Admin Management:**
- Create custom practices
- Upload audio/video content
- Set categories and tags
- Edit existing practices
- Archive/delete content

---

### 6. Reading & Video Libraries

**Reading Library:**
- Articles, essays, integration guides
- Tag-based organization
- Admin-curated content
- External link support
- Reading time estimates

**Video Library:**
- Educational videos
- Guided practices
- Integration talks
- Embedded or linked content
- Video duration display
- Category organization

**Both Support:**
- Rich tagging system for discovery
- Admin creation and management
- User bookmarking (future feature)
- Progress tracking (future feature)

---

### 7. Community Features

**Community Posts:**
- Share integration insights
- Ask questions
- Offer support
- Celebrate milestones

**Engagement:**
- Like posts
- Comment on discussions
- Share posts (within platform)
- Follow threads

**Safety Features:**
- Admin moderation tools
- Report inappropriate content
- Privacy controls
- Anonymous posting option (future)

**Design:**
- Card-based layout
- User avatars
- Timestamp display
- Engagement metrics

---

### 8. Admin Analytics Dashboard

**User Metrics:**
- Total registered users
- Active users (daily/weekly/monthly)
- New registrations
- User retention rates

**Engagement Metrics:**
- Prompt completion rates
- Average streak lengths
- Practice usage statistics
- Community participation

**Content Analytics:**
- Most popular practices
- Most accessed readings/videos
- Tag performance
- User feedback

**Data Export:**
- CSV export capabilities
- Date range filtering
- Metric selection
- Privacy-compliant reporting

**Platform Health:**
- Database status
- Performance metrics
- Error rates
- User growth trends

---

### 9. Journal System (Future Enhancement)

**Planned Features:**
- Freeform journaling
- Prompt-based entries
- Tag and categorize entries
- Search functionality
- Export journal data
- Private by default
- Optional AI insights (premium)

---

### 10. Notifications & Reminders

**Reminder System:**
- Daily prompt notifications
- Customizable time settings
- Streak reminder alerts
- Milestone celebrations
- Practice suggestions

**Notification Types:**
- Browser push notifications
- Email reminders (optional)
- In-app notifications
- Sound/vibration controls

**User Controls:**
- Enable/disable reminders
- Set preferred time
- Choose notification methods
- Frequency settings

---

## Technical Specifications

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query v5 for server state
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens
- **Icons:** Lucide React
- **Charts:** Recharts
- **Forms:** React Hook Form with Zod validation

### Backend Architecture
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM with type-safe operations
- **Authentication:** Replit OIDC with session management
- **Session Storage:** PostgreSQL-backed sessions (connect-pg-simple)

### Database Schema

**Users Table:**
- User ID (from OIDC)
- Email, username, first name, last name
- Journey start date
- Created/updated timestamps

**Integration Prompts:**
- 77 prompts with sequence, category, prompt text, practice instructions
- Points value per prompt
- Created date

**Prompt Completions:**
- Links user to completed prompts
- Stores user response text
- Completion timestamp

**Practice Completions:**
- Tracks micro-practice completions
- Separate from full prompt completion
- Daily tracking

**Wellbeing Checkins:**
- Daily wellbeing level (1-5 scale)
- Optional notes
- Timestamp

**Practices:**
- Title, description, duration
- Category, difficulty, media URLs
- Tags, admin-created
- Created/updated timestamps

**Readings:**
- Title, content/URL
- Tags, estimated reading time
- Admin-created

**Videos:**
- Title, video URL
- Duration, tags
- Admin-created

**Community Posts:**
- User-generated content
- Post text, timestamps
- Engagement metrics

### Design System

**Color Palette:**
- **Primary:** Light Blue (hsl 195, 60%, 45%) - Calming, trust
- **Accent:** Warm Amber (hsl 30, 70%, 75%) - Energy, warmth
- **Secondary:** Warm Sand (hsl 35, 30%, 85%) - Grounding, earth
- **Background:** Soft blue-grey to warm beige gradient
- **Charts:** Light blue, amber, purple, coral, teal

**Typography:**
- **Headings:** Bold, 16px-48px responsive
- **Body:** 14px-16px, excellent readability
- **Micro-text:** 10px-12px for labels
- **Font Stack:** System fonts for performance

**Spacing System:**
- Mobile-first: 12px, 16px, 24px
- Desktop: 16px, 24px, 32px, 48px
- Consistent throughout

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Dark Mode:**
- Full dark mode support
- Automatic theme switching
- Preserved user preference
- Accessible contrast ratios

---

## User Journey

### New User Flow
1. **Landing Page:** Hero image with meditation scene, compass symbol
2. **Login:** Single-click Replit authentication
3. **Welcome Screen:** Journey start with logo, explanation
4. **Set Journey Date:** Automatically set to today (can be changed in settings)
5. **First Prompt:** Day 1 - Body category prompt
6. **Dashboard Tour:** Brief overview of features
7. **Daily Engagement:** Return daily for new prompts

### Daily User Flow
1. **Login:** Quick authentication
2. **Dashboard:** See today's progress at a glance
3. **Wellbeing Check-in:** Quick mood logging
4. **Daily Prompt:** Read reflection question
5. **Micro-Practice:** Complete small exercise
6. **Journal Response:** Write reflection
7. **Complete Prompt:** Earn points
8. **Explore:** Check practices, community, progress charts
9. **Logout:** Data auto-saved

### Admin Flow
1. **Admin Dashboard:** Overview of platform health
2. **Content Creation:** Add practices/readings/videos
3. **User Analytics:** Monitor engagement
4. **Community Moderation:** Review reported content
5. **Export Data:** Generate reports for insights

---

## Mobile Optimization

### Responsive Design Features
- **Overflow Prevention:** All components use overflow-hidden
- **Text Truncation:** Prevents horizontal scroll
- **Touch Targets:** Minimum 44px for accessibility
- **Compact Layouts:** Reduced padding on small screens
- **Stacked Navigation:** Sidebar collapses to drawer
- **Readable Text:** Minimum 12px, scales up
- **Fast Loading:** Optimized images and code splitting

### Mobile-Specific Enhancements
- **Shorter Labels:** "OK" instead of "Neutral" on wellbeing scale
- **Compact Buttons:** Reduced padding, smaller icons
- **Grid Adjustments:** 1-column layouts on narrow screens
- **Chart Optimization:** Smaller margins, readable axes
- **Tab Bar:** Quick access to main sections (future)

---

## Security & Privacy

### Authentication
- Replit OIDC integration
- Secure session management
- Auto-logout on inactivity
- No password storage

### Data Privacy
- Personal data encrypted at rest
- No third-party data sharing
- User controls data export/deletion
- GDPR-compliant architecture

### Content Safety
- Admin moderation tools
- User reporting system
- Content filtering
- Community guidelines enforcement

---

## Future Enhancements

### Planned Features
1. **AI Integration Insights:** Premium feature for journal analysis
2. **Group Circles:** Private groups for cohort support
3. **Live Sessions:** Video integration for group calls
4. **Mobile Apps:** Native iOS/Android applications
5. **Offline Mode:** Work without internet, sync later
6. **Custom Journeys:** Admin-created custom prompt sequences
7. **Meditation Timer:** Built-in practice timer
8. **Integration Calendar:** Visual journey timeline
9. **Guided Audio:** Voice-guided practices
10. **Progress Sharing:** Share milestones with friends

### Performance Goals
- < 2s initial page load
- < 100ms interaction response
- 99.9% uptime
- Supports 10,000+ concurrent users

---

## Success Metrics

### User Engagement
- Daily active users
- Average streak length
- Prompt completion rate
- Time spent on platform

### Wellness Outcomes
- Mood trend improvements
- Sleep quality increases
- Grounding score stability
- User-reported benefits

### Platform Health
- User retention (7-day, 30-day)
- Feature adoption rates
- Community participation
- Content consumption

---

## Support & Resources

### User Support
- In-app help documentation
- FAQ section
- Contact form for assistance
- Community peer support

### Technical Support
- Database backups (daily)
- Error monitoring
- Performance tracking
- Security updates

---

## Accessibility

- **WCAG 2.1 AA Compliant**
- Screen reader support
- Keyboard navigation
- High contrast mode
- Adjustable text sizes
- Focus indicators
- Alternative text for images

---

## Platform Summary

Integration Compass provides a complete, professional-grade integration support system combining:
- Structured 77-day prompt journey
- Real-time progress tracking
- Community connection
- Admin-managed content library
- Beautiful, calming design
- Mobile-first responsive experience
- Privacy-focused architecture
- Evidence-based practices

The platform serves as a compassionate digital companion for individuals navigating the profound work of psychedelic integration, providing structure, support, and insights for lasting transformation.
