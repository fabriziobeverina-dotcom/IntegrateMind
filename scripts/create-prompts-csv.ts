import { writeFileSync } from 'fs';

const prompts = [
  // BODY (1-12)
  { id: 1, category: 'Body', prompt: 'Notice where your body feels alive today—what is it telling you?', practice: 'Place your hand there and breathe deeply 5 times.' },
  { id: 2, category: 'Body', prompt: 'What small movement could release tension right now?', practice: 'Stretch or shake your body gently for 1 minute.' },
  { id: 3, category: 'Body', prompt: 'How has your relationship with nourishment shifted since ceremony?', practice: 'Eat one bite of food slowly, noticing its texture, taste, and warmth as if it were sacred medicine.' },
  { id: 4, category: 'Body', prompt: 'Where do you feel gratitude in your body at this moment?', practice: 'Touch that area and whisper "thank you."' },
  { id: 5, category: 'Body', prompt: 'What signals of the body can you perceive right now? How many simultaneously?', practice: 'Close your eyes and list silently each sensation you can perceive, one by one.' },
  { id: 6, category: 'Body', prompt: 'How can you honor your body?', practice: 'Drink water slowly, savoring each sip as medicine.' },
  { id: 7, category: 'Body', prompt: 'What new rhythms or cycles is your body asking you to follow?', practice: 'Describe your resting cycle, including night sleep and daily rests.' },
  { id: 8, category: 'Body', prompt: 'Write about a time your body surprised you with strength or resilience.', practice: 'Stand tall, stretch your arms wide, and breathe in that memory.' },
  { id: 9, category: 'Body', prompt: 'What part of your body most needs your attention today?', practice: 'Breathe into that area, visualizing warmth flowing there.' },
  { id: 10, category: 'Body', prompt: 'Describe as in a story-telling and with detail the characteristics of any tension or tightness you can feel in your body.', practice: 'Breathe into that area, try to bring that tension in your lungs to exhale it, blow it out.' },
  { id: 11, category: 'Body', prompt: 'In what ways has your sense of embodiment changed after medicine work?', practice: 'Walk slowly across the room, noticing each step.' },
  { id: 12, category: 'Body', prompt: 'What gesture of kindness can you offer your body today?', practice: 'Give yourself a body massage with oil or practice a conscious bath.' },
  
  // EMOTION (13-24)
  { id: 13, category: 'Emotion', prompt: 'Which emotion feels most present right now, and what does it want you to know?', practice: 'Name it aloud before journaling.' },
  { id: 14, category: 'Emotion', prompt: 'How has your perception of fear changed after ceremony?', practice: 'Concentrate to call your fears to you, as most intense as you can. Face it and observe it, try to watch it without embodying it. If tension arrives, breathe consciously and relax the body, then write about it.' },
  { id: 15, category: 'Emotion', prompt: 'What emotion feels unfinished and asks to be expressed?', practice: 'Allow these emotions to grow and move in your body, then express them before writing.' },
  { id: 16, category: 'Emotion', prompt: 'Where have you discovered unexpected joy?', practice: 'Smile intentionally for 10 seconds before you write.' },
  { id: 17, category: 'Emotion', prompt: 'How does sadness flow through you when you let it move freely?', practice: 'Let the sadness increase and sigh, hum, cry.' },
  { id: 18, category: 'Emotion', prompt: 'What emotion have you learned to welcome rather than resist?', practice: 'Open your palms face up, inviting it in.' },
  { id: 19, category: 'Emotion', prompt: 'Write about an emotion that connects you to your younger self.', practice: 'Place your hand on your heart and say, "I see you."' },
  { id: 20, category: 'Emotion', prompt: 'Which feeling is teaching you patience today?', practice: 'Count 5 slow breaths before journaling.' },
  { id: 21, category: 'Emotion', prompt: 'What emotion would you like to give more space for in your life?', practice: 'Expand your chest as you inhale deeply.' },
  { id: 22, category: 'Emotion', prompt: 'How does love express itself differently in you now?', practice: 'Write four people\'s names and send them blessings. Then write your own name and do the same.' },
  { id: 23, category: 'Emotion', prompt: 'What emotion carries hidden wisdom for you?', practice: 'Close your eyes and imagine that emotion as a teacher.' },
  { id: 24, category: 'Emotion', prompt: 'How do you practice compassion toward your difficult feelings?', practice: 'Hold your own hand, head, or heart gently and supportively while journaling.' },
  
  // SOCIAL (25-36)
  { id: 25, category: 'Social', prompt: 'Who has supported your journey, and how can you thank them?', practice: 'Write a short message of gratitude after journaling.' },
  { id: 26, category: 'Social', prompt: 'What relationships feel more authentic after your experience?', practice: 'Smile as you picture their faces.' },
  { id: 27, category: 'Social', prompt: 'How do you wish to show up differently with others?', practice: 'Stand tall in front of a whole mirror to see your entire body; breathe and modify your posture, observing yourself in different physical expressions.' },
  { id: 28, category: 'Social', prompt: 'Where can you find the courage to speak your truth?', practice: 'Connect with the sensation of courage and speak aloud something that you usually can\'t.' },
  { id: 29, category: 'Social', prompt: 'What community values are most important to you now?', practice: 'Write your values and circle the three that are most important for you right now.' },
  { id: 30, category: 'Social', prompt: 'Write about a recent conversation that felt like healing.', practice: 'Close your eyes and replay the conversation, being both yourself and the other.' },
  { id: 31, category: 'Social', prompt: 'How do you want to repair or nurture a relationship that matters?', practice: 'Place your hand on your heart and imagine smiling at them; if you feel called, communicate thanks through gestures or words.' },
  { id: 32, category: 'Social', prompt: 'What boundaries protect your newfound clarity?', practice: 'Draw your safe space.' },
  { id: 33, category: 'Social', prompt: 'How can you share your insights without needing others to agree?', practice: 'Whisper "My truth is enough."' },
  { id: 34, category: 'Social', prompt: 'Which connection feels most nourishing at this moment?', practice: 'Write their name slowly and with care.' },
  { id: 35, category: 'Social', prompt: 'How has your sense of belonging changed?', practice: 'Recall one place where you felt fully accepted.' },
  { id: 36, category: 'Social', prompt: 'What new forms of service or contribution call to you?', practice: 'List some acts of service you can do this week and make sure to put them into practice; they can be small—the importance lies in genuine service intention.' },
  
  // ENVIRONMENT (37-48)
  { id: 37, category: 'Environment', prompt: 'How has your relationship with nature shifted since ceremony?', practice: 'Step outside or look out the window, allow the sight to penetrate you, stay there connected for some minutes.' },
  { id: 38, category: 'Environment', prompt: 'Write about a place in the natural world that feels like home.', practice: 'Close your eyes and smell or hear it in memory.' },
  { id: 39, category: 'Environment', prompt: 'Write about your connection with the elements: earth, water, fire, air.', practice: 'Draw a symbol for each of them.' },
  { id: 40, category: 'Environment', prompt: 'How do you notice the forest, river, or sky communicating with you?', practice: 'Pause and listen to surrounding sounds for some minutes.' },
  { id: 41, category: 'Environment', prompt: 'What small act of care can you offer the earth today?', practice: 'Decide one small action (pick up trash, water a plant).' },
  { id: 42, category: 'Environment', prompt: 'How has silence or stillness become part of your medicine?', practice: 'Sit in silence for 1 minute before writing.' },
  { id: 43, category: 'Environment', prompt: 'What kind of ritual could help you feel connected to nature?', practice: 'Put it in practice, from now on anytime you can.' },
  { id: 44, category: 'Environment', prompt: 'Write about a moment when you felt completely interconnected.', practice: 'Spread your arms wide, then hug yourself gently.' },
  { id: 45, category: 'Environment', prompt: 'How do you sense the invisible world supporting you now?', practice: 'Close your eyes and feel a hand at your back.' },
  { id: 46, category: 'Environment', prompt: 'Where do you find beauty that restores your spirit?', practice: 'Look at your surroundings right now and find one element nearby that you consider pleasant. Observe it as if seeing it for the first time. If you find nothing beautiful around you, it\'s time to bring something there for that purpose.' },
  { id: 47, category: 'Environment', prompt: 'What symbolic image from ceremony still guides you?', practice: 'Sketch it briefly before journaling.' },
  { id: 48, category: 'Environment', prompt: 'What vision for your life feels aligned with the greater web of existence?', practice: 'Connect with an action that feels like your guiding thread.' },
  
  // SPIRIT (49-60)
  { id: 49, category: 'Spirit', prompt: '"When I let go of what I am, I become what I might be." (Laozi) — What are you ready to release?', practice: 'Exhale deeply, imagining release.' },
  { id: 50, category: 'Spirit', prompt: '"The wound is the place where the Light enters you." (Rumi) — Which wound is now becoming a doorway?', practice: 'Place your hand on that part of your body and breathe light in.' },
  { id: 51, category: 'Spirit', prompt: '"He who has a why to live can bear almost any how." (Nietzsche) — What is your \'why\' right now?', practice: 'Write one sentence that begins with "My why is…"' },
  { id: 52, category: 'Spirit', prompt: '"Our hearts are restless until they rest in You." (St. Augustine) — Where do you find true rest?', practice: 'Lay down if you can, or sit back, close your eyes, relax, and sigh 5 times deeply.' },
  { id: 53, category: 'Spirit', prompt: '"Silence is the language of God." (Rumi) — What does silence teach you today?', practice: 'Sit in silence for 2 minutes before writing, listen to His voice.' },
  { id: 54, category: 'Spirit', prompt: '"Nature does not hurry, yet everything is accomplished." (Laozi) — Where in your life can you move slower?', practice: 'When you think you have finished your writing, take 5 minutes more.' },
  { id: 55, category: 'Spirit', prompt: '"One must still have chaos in oneself to give birth to a dancing star." (Nietzsche) — What star is being born in your chaos?', practice: 'Draw a tiny star next to your writing.' },
  { id: 56, category: 'Spirit', prompt: '"The soul is healed by being with children." (Dostoevsky) — How can innocence or play restore you?', practice: 'Write with your non-dominant hand for 1 page.' },
  { id: 57, category: 'Spirit', prompt: '"God is at home, it is we who have gone out for a walk." (Meister Eckhart) — Where do you feel most at home in Spirit?', practice: 'Close your eyes and imagine that place in you. How would you manage it—clean it, tidy it up, furnish it—to welcome your soul?' },
  { id: 58, category: 'Spirit', prompt: '"Stop acting so small. You are the universe in ecstatic motion." (Rumi) — In what ways can you expand today?', practice: 'Stretch your arms wide before writing.' },
  { id: 59, category: 'Spirit', prompt: '"The Tao is like water; it nourishes all things without striving." (Laozi) — How can you embody water in your life?', practice: 'Take a sip of water and imagine that it is the source of a river in your body. Follow its flow.' },
  { id: 60, category: 'Spirit', prompt: '"Faith is to believe what you do not see; the reward is to see what you believe." (St. Augustine) — What unseen truth are you trusting?', practice: 'Connect with your meaning of trust and find a way to make it practice.' },
  
  // MENTAL (61-72)
  { id: 61, category: 'Mental', prompt: 'Describe your childhood as if you were telling it to a friend who doesn\'t know you.', practice: 'Close your eyes for one minute and visualize three important childhood scenes before writing.' },
  { id: 62, category: 'Mental', prompt: 'Write about your teenage years—what shaped your identity most?', practice: 'Choose one song from that time and listen briefly before writing.' },
  { id: 63, category: 'Mental', prompt: 'Describe a turning point in your life that changed your direction.', practice: 'Re-live that moment in memory and note the body sensation that still lives with it.' },
  { id: 64, category: 'Mental', prompt: 'What is the main theme of your life story so far?', practice: 'Write one title as if your life were a book.' },
  { id: 65, category: 'Mental', prompt: 'Who were your most influential teachers, guides, or mirrors?', practice: 'Write their names and one sentence of gratitude for each.' },
  { id: 66, category: 'Mental', prompt: 'Recall one painful or challenging event and the wisdom it eventually revealed.', practice: 'Place your hand on your heart, breathe, and say "thank you" for the lesson.' },
  { id: 67, category: 'Mental', prompt: 'Describe the person you are today compared with five years ago.', practice: 'Write a short story in third person of those five years, as they were, but as if you are writing the story of someone else.' },
  { id: 68, category: 'Mental', prompt: 'Choose one dream that has stayed with you and explore its symbols.', practice: 'Draw images or symbols from the dream before writing.' },
  { id: 69, category: 'Mental', prompt: 'Make a list of your favorite books, movies, or music that changed you—and why.', practice: 'Pick one item and read or listen briefly to reconnect with its feeling.' },
  { id: 70, category: 'Mental', prompt: 'Write a story or myth about yourself using imagination instead of facts.', practice: 'Invent a title and one magical element that symbolizes transformation.' },
  { id: 71, category: 'Mental', prompt: 'Describe the process of creation for you.', practice: 'Create something with your hands today—drawing, painting, collage, or sculpture.' },
  { id: 72, category: 'Mental', prompt: 'If you had to write your own résumé for life—not for work—what would be its main sections?', practice: 'Outline the chapters of your life like a timeline of growth.' },
  
  // MILESTONES (73-77)
  { id: 73, category: 'Milestone', prompt: 'Looking back, what has changed most since you began this journaling practice?', practice: 'Re-read your first, 13th, 25th, 37th, 49th, and 61st entries before writing today.' },
  { id: 74, category: 'Milestone', prompt: 'Which themes or lessons keep repeating for you?', practice: 'Circle 3 recurring words or concepts from your past entries.' },
  { id: 75, category: 'Milestone', prompt: 'What parts of yourself have you welcomed home?', practice: 'Write your name and use each letter as the first letter of a characteristic that you feel to embrace or that is part of you.' },
  { id: 76, category: 'Milestone', prompt: 'What integration practices (movement, breath, journaling, service, ritual, creation, natural connection) work best for you?', practice: 'Write the intention to maintain it for a long period, until it becomes a habit.' },
  { id: 77, category: 'Milestone', prompt: 'What commitment do you want to carry forward into daily life?', practice: 'Write it as a promise beginning with "I commit to…".' }
];

function escapeCSV(str: string): string {
  // Escape quotes by doubling them and wrap in quotes if needed
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvLines = ['id,category,prompt,practice'];
prompts.forEach(p => {
  csvLines.push(`${p.id},${escapeCSV(p.category)},${escapeCSV(p.prompt)},${escapeCSV(p.practice)}`);
});

writeFileSync('attached_assets/integration_prompts.csv', csvLines.join('\n'));
console.log('✓ Created CSV with', prompts.length, 'prompts');
