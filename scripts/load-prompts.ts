import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { integrationPrompts, practiceCompletions, userPromptProgress } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * WARNING: This script is destructive and should ONLY be run in development!
 * 
 * It will DELETE:
 * - All practice completions
 * - All user prompt progress
 * - All existing integration prompts
 * 
 * For production migrations, use a proper migration strategy that preserves
 * user data or creates a backup first.
 */

async function loadPrompts() {
  try {
    console.log('⚠️  WARNING: This script will delete all prompt-related data!');
    console.log('Loading prompts from CSV...\n');
    
    // Read the CSV file
    const csvContent = readFileSync('attached_assets/pao_integration_prompts_v3_1762700828870.csv', 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} prompts to load`);
    
    // Clear existing data that references prompts (DESTRUCTIVE!)
    console.log('⚠️  Clearing practice completions and user progress...');
    await db.delete(practiceCompletions);
    await db.delete(userPromptProgress);
    
    // Clear existing prompts
    console.log('Clearing existing prompts...');
    await db.delete(integrationPrompts);
    
    // Insert new prompts
    console.log('Inserting new prompts...');
    for (const record of records) {
      await db.insert(integrationPrompts).values({
        sequence: parseInt(record.id),
        category: record.category,
        prompt: record.prompt,
        practice: record.practice,
        pointsValue: 10
      });
    }
    
    console.log('✓ Successfully loaded all prompts!');
    
    // Verify the data
    const categoryCount = await db
      .select({ 
        category: integrationPrompts.category,
        count: sql<number>`count(*)::int`
      })
      .from(integrationPrompts)
      .groupBy(integrationPrompts.category);
    
    console.log('\nPrompts by category:');
    categoryCount.forEach(row => {
      console.log(`  ${row.category}: ${row.count} prompts`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error loading prompts:', error);
    process.exit(1);
  }
}

loadPrompts();
