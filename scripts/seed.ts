import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { practices, dailyPrompts } from "../shared/schema";

const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection);

const seedPractices = [
  {
    title: 'Morning Grounding Meditation',
    description: 'A gentle 15-minute practice to connect with your body and breath, perfect for starting your day with intention.',
    duration: '15 min',
    category: 'Grounding',
    instructor: 'Sarah Chen',
    isPremium: false
  },
  {
    title: 'Breathwork for Anxiety',
    description: 'Powerful breathing techniques to calm the nervous system and release stored tension.',
    duration: '20 min',
    category: 'Calming',
    instructor: 'Marcus Thompson',
    isPremium: false
  },
  {
    title: 'Dream Integration Ceremony',
    description: 'A guided journey to explore and integrate messages from your dreams and visions.',
    duration: '45 min',
    category: 'Dreamwork',
    instructor: 'Luna Martinez',
    isPremium: true
  },
  {
    title: 'Energy Activation Flow',
    description: 'Dynamic movement and breathwork to awaken your vital energy and inner fire.',
    duration: '30 min',
    category: 'Energizing',
    instructor: 'Rio Santos',
    isPremium: false
  },
  {
    title: 'Shadow Work Integration',
    description: 'Deep inner work to acknowledge and integrate the hidden aspects of self revealed in ceremony.',
    duration: '60 min',
    category: 'Integration',
    instructor: 'Dr. Maya Patel',
    isPremium: true
  }
];

const seedPrompts = [
  {
    prompt: 'What emotions are you carrying in your body today, and where do you feel them most intensely?',
    category: 'body_awareness',
    isActive: true
  },
  {
    prompt: 'What patterns or beliefs from your ceremony experience are you still working to integrate?',
    category: 'integration',
    isActive: true
  },
  {
    prompt: 'How has your relationship with fear changed since beginning this healing journey?',
    category: 'reflection',
    isActive: true
  },
  {
    prompt: 'What ancestral wisdom or messages have been coming through in your practice lately?',
    category: 'ancestral',
    isActive: true
  },
  {
    prompt: 'What are three things you are genuinely grateful for in this moment of your journey?',
    category: 'gratitude',
    isActive: true
  }
];

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Insert practices
    const practiceResult = await db.insert(practices).values(seedPractices).onConflictDoNothing().returning();
    console.log(`✓ Inserted ${practiceResult.length} practices`);
    
    // Insert daily prompts
    const promptResult = await db.insert(dailyPrompts).values(seedPrompts).onConflictDoNothing().returning();
    console.log(`✓ Inserted ${promptResult.length} daily prompts`);
    
    console.log('✅ Seed data inserted successfully');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();