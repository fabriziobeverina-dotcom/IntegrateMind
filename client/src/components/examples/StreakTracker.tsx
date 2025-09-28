import { StreakTracker } from '../StreakTracker';

export default function StreakTrackerExample() {
  return (
    <StreakTracker
      journalStreak={12}
      practiceStreak={8}
      totalDays={45}
    />
  );
}