import { PracticeCard } from '../PracticeCard';

export default function PracticeCardExample() {
  const mockPractice = {
    id: '1',
    title: 'Morning Grounding Meditation',
    description: 'A gentle 15-minute practice to connect with your body and breath, perfect for starting your day with intention.',
    duration: '15 min',
    category: 'Grounding' as const,
    instructor: 'Sarah Chen',
    completed: false
  };

  return (
    <PracticeCard
      practice={mockPractice}
      onPlay={(id) => console.log('Playing practice:', id)}
      onComplete={(id) => console.log('Completed practice:', id)}
    />
  );
}