# Integration Compass Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from wellness and mindfulness apps like Calm, Headspace, and Insight Timer, combined with community platforms like Circle or Discord for the social features. The design should evoke healing, grounding, and spiritual growth while maintaining accessibility and ease of use.

## Core Design Elements

### Color Palette
**Primary Colors (Dark Mode)**:
- Deep Forest Green: `147 25% 15%` - Primary brand color representing nature and grounding
- Sage Green: `147 20% 35%` - Secondary actions and highlights
- Warm Earth: `25 15% 25%` - Background surfaces

**Primary Colors (Light Mode)**:
- Soft Sage: `147 25% 85%` - Light background
- Deep Forest: `147 30% 25%` - Text and primary elements
- Earth Tone: `25 20% 15%` - Secondary text

**Accent Colors**:
- Soft Amber: `45 85% 70%` - Success states, streak indicators
- Muted Purple: `280 20% 60%` - Premium features, AI reflections

### Typography
- **Primary Font**: Inter (Google Fonts) - Clean, readable for body text and UI
- **Accent Font**: Crimson Text (Google Fonts) - For journal entries and reflective content
- **Font Hierarchy**: 
  - Headings: Inter 600-700
  - Body: Inter 400-500
  - Journal Content: Crimson Text 400

### Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, and 8
- Micro spacing: `p-2, m-2`
- Standard spacing: `p-4, m-4, gap-4`
- Section spacing: `p-6, m-6`
- Large spacing: `p-8, m-8`

### Component Library

**Navigation**:
- Bottom tab navigation with 5 tabs: Journal, Practices, Community, Progress, Profile
- Floating action button for quick journal entry
- Gentle haptic feedback on interactions

**Cards & Surfaces**:
- Rounded corners: `rounded-xl` for main cards, `rounded-lg` for smaller elements
- Subtle shadows with warm undertones
- Card backgrounds slightly elevated from base background

**Forms & Inputs**:
- Soft, rounded input fields with gentle focus states
- Floating labels for better UX
- Consistent with dark mode accessibility

**Data Visualization**:
- Simple line charts for mood/sleep tracking using warm, earthy colors
- Progress rings for streaks using the amber accent
- Clean, minimal data presentation

### Content Sections

**Journal Interface**:
- Full-screen writing experience with minimal distractions
- Tag suggestions floating gently below text area
- Daily prompt cards with inspiring imagery backgrounds

**Practice Library**:
- Video/audio cards with category color coding
- Grid layout with preview thumbnails
- Filter by category: Calming (sage), Energizing (amber), Grounding (earth), Dreamwork (purple)

**Community Features**:
- Chat bubbles with user avatars
- Post cards with gentle borders
- Like/comment interactions with smooth animations

### Images
**Hero Image**: None - The app focuses on content and functionality over large imagery

**Practice Thumbnails**: Nature-based imagery (forests, water, stones) representing each category
- Calming: Flowing water, gentle landscapes
- Energizing: Sunrise, flowing movement
- Grounding: Stone stacks, tree roots
- Dreamwork: Night sky, moon phases

**Background Elements**: Subtle geometric patterns or nature textures as overlays, never overwhelming the content

### Animations
**Minimal Approach**: 
- Gentle page transitions
- Smooth progress indicator updates
- Soft button press feedback
- No complex or distracting animations

The overall aesthetic should feel like a digital sanctuary - calming, supportive, and focused on personal growth while maintaining the functionality needed for community interaction and progress tracking.