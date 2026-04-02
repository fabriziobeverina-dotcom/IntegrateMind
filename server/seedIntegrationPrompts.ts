import { readFileSync } from 'fs';
import { join } from 'path';

interface PromptRow {
  sequence: number;
  category: string;
  prompt: string;
  practice: string;
}

function mapCategory(raw: string): string {
  const map: Record<string, string> = {
    'BODY': 'Body',
    'EMOTION': 'Emotion',
    'SOCIAL': 'Social',
    'ENVIRONMENT': 'Environment',
    'SPIRIT': 'Spirit',
    'MENTAL / PSYCHISM': 'Mental',
    'MENTAL': 'Mental',
    'INTEGRATION MILESTONES': 'Milestone',
  };
  return map[raw.trim().toUpperCase()] ?? raw.trim();
}

function parseCSV(csvContent: string): PromptRow[] {
  const lines = csvContent.trim().split('\n');
  const prompts: PromptRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    // New CSV format: Category, Number, Sentence, Practice
    const rawCategory = values[0];
    const sequence = parseInt(values[1]);
    const prompt = values[2];
    const practice = values[3];

    if (!rawCategory || isNaN(sequence) || !prompt) continue;

    prompts.push({
      sequence,
      category: mapCategory(rawCategory),
      prompt,
      practice: practice || '',
    });
  }

  return prompts;
}

export async function seedIntegrationPrompts() {
  try {
    console.log('Step 1: Initializing integration prompt tables...');
    const initResponse = await fetch('http://localhost:5000/api/integration-prompts/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize tables: ${await initResponse.text()}`);
    }
    console.log('Tables ready.');

    console.log('Step 2: Reading CSV file...');
    const csvPath = join(process.cwd(), 'attached_assets', 'integration_1775151187821.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    console.log('Step 3: Parsing CSV...');
    const rows = parseCSV(csvContent);
    const formattedPrompts = rows.map(p => ({
      sequence: p.sequence,
      category: p.category,
      prompt: p.prompt,
      practice: p.practice,
      pointsValue: 10,
    }));

    console.log(`Parsed ${formattedPrompts.length} prompts from CSV`);
    formattedPrompts.forEach(p => console.log(`  #${p.sequence} [${p.category}] ${p.prompt.slice(0, 60)}...`));

    console.log('Step 4: Seeding prompts (replaces all existing)...');
    const response = await fetch('http://localhost:5000/api/integration-prompts/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts: formattedPrompts }),
    });

    if (!response.ok) {
      throw new Error(`Failed to seed: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('Seeding result:', result);
  } catch (error) {
    console.error('Error seeding integration prompts:', error);
    throw error;
  }
}

seedIntegrationPrompts()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
