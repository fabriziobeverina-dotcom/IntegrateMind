import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, ArrowRight, RefreshCw } from "lucide-react";

interface DailyPromptProps {
  onRespond?: (response: string) => void;
}

const prompts = [
  "What emotions came up for you today, and how did you honor them?",
  "Describe a moment when you felt most connected to yourself today.",
  "What patterns in your thoughts or behaviors are you noticing?",
  "How has your relationship with fear or anxiety shifted recently?",
  "What aspects of your healing journey are you most grateful for?",
  "In what ways did you practice self-compassion today?",
  "What insights from your medicine work feel most relevant right now?",
  "How are you integrating the wisdom you've received into daily life?"
];

export function DailyPrompt({ onRespond }: DailyPromptProps) {
  const [currentPrompt, setCurrentPrompt] = useState(prompts[0]);
  const [response, setResponse] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);

  const getNewPrompt = () => {
    const newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setCurrentPrompt(newPrompt);
    setResponse("");
    setIsAnswered(false);
  };

  const handleSubmit = () => {
    if (response.trim()) {
      onRespond?.(response);
      setIsAnswered(true);
      console.log('Daily prompt response submitted:', response);
    }
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-card to-accent/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Daily Reflection</h3>
            <p className="text-sm text-muted-foreground">Take a moment to explore today's prompt</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={getNewPrompt}
          data-testid="button-new-prompt"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-background/50 border border-border">
          <p className="font-serif text-base leading-relaxed" data-testid="text-prompt">
            {currentPrompt}
          </p>
        </div>

        {!isAnswered ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Take your time to reflect and respond..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-[120px] font-serif resize-none"
              data-testid="input-prompt-response"
            />
            <Button
              onClick={handleSubmit}
              disabled={!response.trim()}
              className="w-full"
              data-testid="button-submit-response"
            >
              Submit Response
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-serif text-sm leading-relaxed" data-testid="text-submitted-response">
                {response}
              </p>
            </div>
            <Button
              onClick={getNewPrompt}
              variant="outline"
              className="w-full"
              data-testid="button-another-prompt"
            >
              Another Prompt
              <RefreshCw className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}