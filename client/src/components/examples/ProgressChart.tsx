import { useState } from 'react';
import { ProgressChart } from '../ProgressChart';

export default function ProgressChartExample() {
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'sleep' | 'grounding'>('mood');
  
  const mockData = [
    { date: 'Mon', mood: 7, sleep: 6, grounding: 8 },
    { date: 'Tue', mood: 8, sleep: 7, grounding: 7 },
    { date: 'Wed', mood: 6, sleep: 5, grounding: 6 },
    { date: 'Thu', mood: 9, sleep: 8, grounding: 9 },
    { date: 'Fri', mood: 7, sleep: 6, grounding: 8 },
    { date: 'Sat', mood: 8, sleep: 9, grounding: 9 },
    { date: 'Sun', mood: 9, sleep: 8, grounding: 8 }
  ];

  return (
    <ProgressChart
      data={mockData}
      selectedMetric={selectedMetric}
      onMetricSelect={setSelectedMetric}
    />
  );
}