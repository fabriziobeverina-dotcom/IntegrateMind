import { DailyPrompt } from '../DailyPrompt';

export default function DailyPromptExample() {
  return (
    <DailyPrompt
      onRespond={(response) => console.log('Prompt response:', response)}
    />
  );
}