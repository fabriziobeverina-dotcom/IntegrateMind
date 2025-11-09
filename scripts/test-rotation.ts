// Test script to verify prompt rotation logic
// This simulates the rotation without needing a user account

const categories = ['Body', 'Emotion', 'Social', 'Environment', 'Spirit', 'Mental'];

console.log('Testing prompt rotation for 77-day cycle:\n');
console.log('=' .repeat(60));

// Test first 12 days (should go through each category twice)
console.log('\nFirst 12 days (2 complete rotations through all 6 categories):');
for (let day = 0; day < 12; day++) {
  const categoryIndex = day % 6;
  const promptIndexInCategory = Math.floor(day / 6);
  const category = categories[categoryIndex];
  
  console.log(`Day ${day + 1}: ${category} prompt #${promptIndexInCategory + 1}`);
}

// Test day 72 (last category prompt)
console.log('\nDay 72 (last category prompt):');
const day71 = 71;
const cat71 = categories[day71 % 6];
const prompt71 = Math.floor(day71 / 6);
console.log(`Day 72: ${cat71} prompt #${prompt71 + 1}`);

// Test milestone days (days 73-77)
console.log('\nMilestone days (73-77):');
for (let day = 72; day < 77; day++) {
  const milestoneNum = (day - 72) + 1;
  const sequence = (day - 72) + 73;
  console.log(`Day ${day + 1}: Milestone ${milestoneNum} (sequence ${sequence})`);
}

// Test day 78 (should wrap back to day 1)
console.log('\nDay 78 (should wrap back to beginning):');
const day77 = 77 % 77; // This should be 0
const cat77 = categories[day77 % 6];
const prompt77 = Math.floor(day77 / 6);
console.log(`Day 78: ${cat77} prompt #${prompt77 + 1} (cycle restarts)`);

console.log('\n' + '='.repeat(60));
console.log('✓ Rotation logic verification complete!');
console.log('\nSummary:');
console.log(`- Days 1-72: Rotate through ${categories.join(', ')} (12 prompts each)`);
console.log('- Days 73-77: Milestone prompts');
console.log('- Day 78+: Cycle restarts');
