import { JournalEntry } from '../JournalEntry';

export default function JournalEntryExample() {
  return (
    <JournalEntry
      existingEntry={{
        content: "Today I felt a deep sense of gratitude for the healing journey I'm on. The meditation practice helped me connect with my inner wisdom and I noticed how much more grounded I feel compared to last week.",
        tags: ["gratitude", "healing", "meditation", "grounding"],
        date: "March 15, 2024"
      }}
      onSave={(entry) => console.log('Saved:', entry)}
    />
  );
}