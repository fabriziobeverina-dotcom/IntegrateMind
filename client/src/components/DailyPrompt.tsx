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

  const { data: prompt, isLoading, error } = useQuery<IntegrationPrompt>({
    queryKey: ['/api/integration-prompts/today'],
  });

  const { data: pointsData } = useQuery<{ totalPoints: number }>({
    queryKey: ['/api/integration-prompts/points'],
  });

  const { data: practiceCompletion } = useQuery({
    queryKey: ['/api/practice-completions', prompt?.id, 'today'],
    queryFn: async () => {
      if (!prompt?.id) return null;
      const response = await fetch(`/api/practice-completions/${prompt.id}/today`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!prompt?.id,
  });

  const completePracticeMutation = useMutation({
    mutationFn: async (promptId: string) => {
      return await apiRequest('POST', '/api/practice-completions', { promptId });
    },
    onSuccess: (_data, promptId) => {
      toast({
        title: "Practice completed!",
        description: "Great job completing today's micro-practice!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-completions', promptId, 'today'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark practice as complete",
        variant: "destructive",
      });
    },
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
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-8 space-y-3">
          <p className="text-destructive font-medium text-sm sm:text-base">Database Connection Error</p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The integration prompts are temporarily unavailable. Please contact your administrator to enable the database endpoint.
          </p>
        </div>
      </Card>
    );
  }

  if (!prompt) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
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
    <Card className="p-4 sm:p-6 space-y-4 bg-gradient-to-br from-card to-accent/10">
      <div className="space-y-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg">Daily Integration Prompt</h3>
              {prompt.isCompleted && (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" data-testid="icon-completed" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Day {prompt.dayNumber} • {prompt.sequence}/77
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge className={`${categoryColors[prompt.category] || ""} text-xs`} data-testid="badge-category">
            {prompt.category}
          </Badge>
          {pointsData && (
            <Badge variant="outline" className="gap-1 text-xs" data-testid="badge-points">
              <Target className="h-3 w-3" />
              {pointsData.totalPoints} pts
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border">
          <p className="font-serif text-sm sm:text-base leading-relaxed" data-testid="text-prompt">
            {prompt.prompt}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-medium text-primary">Micro-Practice</p>
            {practiceCompletion ? (
              <div className="flex items-center gap-1 sm:gap-1.5 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium">Completed</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-6 sm:h-7 text-xs"
                onClick={() => prompt && completePracticeMutation.mutate(prompt.id)}
                disabled={completePracticeMutation.isPending}
                data-testid="button-complete-practice"
              >
                {completePracticeMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    <span className="hidden sm:inline">Completing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Mark Complete</span>
                    <span className="sm:hidden">Done</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs sm:text-sm leading-relaxed" data-testid="text-practice">
            {prompt.practice}
          </p>
        </div>

        {prompt.isCompleted ? (
          <div className="p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400 text-sm sm:text-base">
              You've completed today's prompt!
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Come back tomorrow for your next integration practice
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <Textarea
              placeholder="After completing the micro-practice, reflect and respond..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] font-serif resize-none text-sm sm:text-base"
              data-testid="input-prompt-response"
            />
            <Button
              onClick={handleSubmit}
              disabled={!response.trim() || completeMutation.isPending}
              className="w-full text-sm sm:text-base"
              data-testid="button-submit-response"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Complete & Earn {prompt.pointsValue} Points</span>
                  <span className="sm:hidden">Earn {prompt.pointsValue} Points</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
