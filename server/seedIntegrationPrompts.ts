import { readFileSync } from 'fs';
import { join } from 'path';

interface PromptRow {
  id: string;
  category: string;
  prompt: string;
  practice: string;
}

function parseCSV(csvContent: string): PromptRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  const prompts: PromptRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV properly handling quoted fields
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    prompts.push({
      id: values[0],
      category: values[1],
      prompt: values[2],
      practice: values[3]
    });
  }
  
  return prompts;
}

export async function seedIntegrationPrompts() {
  try {
    // Step 1: Initialize tables
    console.log('Step 1: Initializing integration prompt tables...');
    const initResponse = await fetch('http://localhost:5000/api/integration-prompts/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!initResponse.ok) {
      const error = await initResponse.text();
      throw new Error(`Failed to initialize tables: ${error}`);
    }
    
    const initResult = await initResponse.json();
    console.log('Init result:', initResult);
    
    // Step 2: Read CSV file
    console.log('Step 2: Reading CSV file...');
    const csvPath = join(process.cwd(), 'attached_assets', 'pao_integration_prompts_v1_1759618867094.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Step 3: Parse CSV
    console.log('Step 3: Parsing CSV...');
    const prompts = parseCSV(csvContent);
    
    // Transform to insert schema format
    const formattedPrompts = prompts.map(p => ({
      sequence: parseInt(p.id),
      category: p.category,
      prompt: p.prompt,
      practice: p.practice,
      pointsValue: 10
    }));
    
    console.log(`Parsed ${formattedPrompts.length} prompts from CSV`);
    
    // Step 4: Seed data
    console.log('Step 4: Seeding prompts...');
    const response = await fetch('http://localhost:5000/api/integration-prompts/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompts: formattedPrompts })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to seed: ${error}`);
    }
    
    const result = await response.json();
    console.log('Seeding result:', result);
    
  } catch (error) {
    console.error('Error seeding integration prompts:', error);
    throw error;
  }
}

// Run if executed directly
seedIntegrationPrompts()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
