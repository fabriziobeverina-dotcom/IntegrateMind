import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, CheckCircle2, Loader2, Target } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IntegrationPrompt {
  id: string;
  sequence: number;
  category: string;
  prompt: string;
  practice: string;
  pointsValue: number;
  isCompleted?: boolean;
  dayNumber?: number;
}

export function DailyPrompt() {
  const [response, setResponse] = useState("");
  const { toast } = useToast();

  const { data: prompt, isLoading } = useQuery<IntegrationPrompt>({
    queryKey: ['/api/integration-prompts/today'],
  });

  const { data: pointsData } = useQuery<{ totalPoints: number }>({
    queryKey: ['/api/integration-prompts/points'],
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { promptId: string; response: string }) => {
      return await apiRequest('POST', '/api/integration-prompts/complete', data);
    },
    onSuccess: () => {
      toast({
        title: "Prompt completed!",
        description: `You earned ${prompt?.pointsValue || 10} points! Keep up the great work.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/progress'] });
      setResponse("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete prompt",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (response.trim() && prompt) {
      completeMutation.mutate({
        promptId: prompt.id,
        response: response.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!prompt) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>No prompt available. Please set your journey start date in your profile.</p>
        </div>
      </Card>
    );
  }

  const categoryColors: Record<string, string> = {
    Body: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    Emotion: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    Social: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    Environment: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    Spirit: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    Milestone: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-card to-accent/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Daily Integration Prompt</h3>
              {prompt.isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-completed" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Day {prompt.dayNumber} • {prompt.sequence}/65
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={categoryColors[prompt.category] || ""} data-testid="badge-category">
            {prompt.category}
          </Badge>
          {pointsData && (
            <Badge variant="outline" className="gap-1" data-testid="badge-points">
              <Target className="h-3 w-3" />
              {pointsData.totalPoints} pts
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-background/50 border border-border">
          <p className="font-serif text-base leading-relaxed" data-testid="text-prompt">
            {prompt.prompt}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-medium mb-1 text-primary">Micro-Practice</p>
          <p className="text-sm leading-relaxed" data-testid="text-practice">
            {prompt.practice}
          </p>
        </div>

        {prompt.isCompleted ? (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">
              You've completed today's prompt!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Come back tomorrow for your next integration practice
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="After completing the micro-practice, reflect and respond..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-[120px] font-serif resize-none"
              data-testid="input-prompt-response"
            />
            <Button
              onClick={handleSubmit}
              disabled={!response.trim() || completeMutation.isPending}
              className="w-full"
              data-testid="button-submit-response"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Complete & Earn {prompt.pointsValue} Points
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
