import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, CheckCircle2, Loader2, Target } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import bodyImage from "@assets/category_body.png";
import emotionImage from "@assets/category_emotion.png";
import socialImage from "@assets/category_social.png";
import environmentImage from "@assets/category_environment.png";
import spiritImage from "@assets/category_spirit.png";
import mentalImage from "@assets/category_mental.png";
import milestoneImage from "@assets/category_milestone.png";

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

interface CategoryConfig {
  gradient: string;
  image: string;
  badgeClass: string;
  label: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Body: {
    gradient: "linear-gradient(135deg, #fbbf24 0%, #dc2626 100%)",
    image: bodyImage,
    badgeClass: "border-red-400/40 bg-red-500/20 text-red-100",
    label: "Body",
  },
  Emotion: {
    gradient: "linear-gradient(135deg, #bbf7d0 0%, #111827 100%)",
    image: emotionImage,
    badgeClass: "border-green-400/40 bg-green-500/20 text-green-100",
    label: "Emotion",
  },
  Social: {
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #bfdbfe 100%)",
    image: socialImage,
    badgeClass: "border-blue-300/40 bg-blue-500/20 text-blue-100",
    label: "Social",
  },
  Environment: {
    gradient: "linear-gradient(135deg, #15803d 0%, #fbbf24 100%)",
    image: environmentImage,
    badgeClass: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
    label: "Environment",
  },
  Spirit: {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #f5f3ff 100%)",
    image: spiritImage,
    badgeClass: "border-violet-400/40 bg-violet-500/20 text-violet-900",
    label: "Spirit",
  },
  Mental: {
    gradient: "linear-gradient(135deg, #f472b6 0%, #111827 100%)",
    image: mentalImage,
    badgeClass: "border-pink-400/40 bg-pink-500/20 text-pink-100",
    label: "Mental / Psychism",
  },
  Milestone: {
    gradient:
      "linear-gradient(135deg, #000000 0%, #6d28d9 20%, #1d4ed8 37%, #15803d 53%, #fbbf24 68%, #ea580c 82%, #dc2626 93%, #ffffff 100%)",
    image: milestoneImage,
    badgeClass: "border-white/40 bg-white/20 text-white",
    label: "Integration Milestone",
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  gradient: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
  image: milestoneImage,
  badgeClass: "border-primary/30 bg-primary/10 text-primary",
  label: "Integration",
};

export function DailyPrompt() {
  const [response, setResponse] = useState("");
  const { toast } = useToast();

  const { data: prompt, isLoading, error, refetch } = useQuery<IntegrationPrompt>({
    queryKey: ['/api/integration-prompts/today'],
    retry: 2,
  });

  const { data: pointsData } = useQuery<{ totalPoints: number }>({
    queryKey: ['/api/integration-prompts/points'],
  });

  const { data: practiceCompletion } = useQuery({
    queryKey: ['/api/practice-completions', prompt?.id, 'today'],
    queryFn: async () => {
      if (!prompt?.id) return null;
      const res = await fetch(`/api/practice-completions/${prompt.id}/today`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!prompt?.id,
  });

  const completePracticeMutation = useMutation({
    mutationFn: async (promptId: string) => {
      return await apiRequest('POST', '/api/practice-completions', { promptId });
    },
    onSuccess: (_data, promptId) => {
      toast({ title: "Practice completed!", description: "Great job completing today's micro-practice!" });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-completions', promptId, 'today'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark practice as complete", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { promptId: string; response: string }) => {
      return await apiRequest('POST', '/api/integration-prompts/complete', data);
    },
    onSuccess: () => {
      toast({ title: "Prompt completed!", description: `You earned ${prompt?.pointsValue || 10} points! Keep up the great work.` });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-prompts/progress'] });
      setResponse("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to complete prompt", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (response.trim() && prompt) {
      completeMutation.mutate({ promptId: prompt.id, response: response.trim() });
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
    const is404 = (error as Error).message?.includes("404");
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-8 space-y-3">
          {is404 ? (
            <>
              <p className="font-medium text-sm sm:text-base">No reflection for today</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Make sure your journey start date is set in your profile settings.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm sm:text-base">Could not load today's reflection</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                There was a temporary connection issue. Please try again.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2">
                Try again
              </Button>
            </>
          )}
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

  const config = CATEGORY_CONFIG[prompt.category] ?? DEFAULT_CONFIG;

  return (
    <Card className="overflow-hidden">
      {/* Category hero banner */}
      <div
        className="relative h-44 sm:h-52 w-full overflow-hidden"
        style={{ background: config.gradient }}
      >
        {/* Background image */}
        <img
          src={config.image}
          alt={config.label}
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70"
        />
        {/* Dark wash at bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
          {/* Top row: icon + day info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <span className="text-white text-xs font-medium opacity-90 drop-shadow">Daily Integration Prompt</span>
            </div>
            {prompt.isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-300 drop-shadow" data-testid="icon-completed" />
            )}
          </div>

          {/* Bottom row: category badge + points + day */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`${config.badgeClass} text-xs font-semibold border backdrop-blur-sm`}
                data-testid="badge-category"
              >
                {config.label}
              </Badge>
              {pointsData && (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs text-white border-white/40 bg-white/10 backdrop-blur-sm"
                  data-testid="badge-points"
                >
                  <Target className="h-3 w-3" />
                  {pointsData.totalPoints} pts
                </Badge>
              )}
            </div>
            <p className="text-white/80 text-xs drop-shadow">
              Day {prompt.dayNumber} &bull; Prompt {prompt.sequence} of 77
            </p>
          </div>
        </div>
      </div>

      {/* Content body */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Prompt text */}
        <div className="p-3 sm:p-4 rounded-lg bg-background border border-border">
          <p className="font-serif text-sm sm:text-base leading-relaxed" data-testid="text-prompt">
            {prompt.prompt}
          </p>
        </div>

        {/* Micro-practice */}
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

        {/* Response / completed state */}
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
                  <span className="hidden sm:inline">Complete &amp; Earn {prompt.pointsValue} Points</span>
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
