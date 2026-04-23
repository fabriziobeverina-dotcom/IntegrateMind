import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, Frown, Meh, Smile, LucideIcon, ChevronRight, Send, Sparkles, Target, Pencil, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WellbeingCheckin {
  id: string;
  userId: string;
  wellbeingLevel: number;
  notes: string | null;
  morningIntention: string | null;
  feelingAboutDay: string | null;
  reachedIntention: string | null;
  dayTitle: string | null;
  strongestSensation: string | null;
  createdAt: Date;
}

const moodLevels: Array<{
  level: number;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  color: string;
  selectedColor: string;
}> = [
  {
    level: 1,
    icon: Frown,
    label: "Very Low",
    shortLabel: "Low",
    color: "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900",
    selectedColor: "bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-700",
  },
  {
    level: 2,
    icon: Frown,
    label: "Low",
    shortLabel: "Low",
    color: "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    selectedColor: "bg-orange-100 dark:bg-orange-950/50 border-orange-400 dark:border-orange-700",
  },
  {
    level: 3,
    icon: Meh,
    label: "Neutral",
    shortLabel: "OK",
    color: "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    selectedColor: "bg-yellow-100 dark:bg-yellow-950/50 border-yellow-400 dark:border-yellow-700",
  },
  {
    level: 4,
    icon: Smile,
    label: "Good",
    shortLabel: "Good",
    color: "text-lime-600 hover:bg-lime-50 dark:hover:bg-lime-950/30 border-lime-200 dark:border-lime-900",
    selectedColor: "bg-lime-100 dark:bg-lime-950/50 border-lime-400 dark:border-lime-700",
  },
  {
    level: 5,
    icon: Smile,
    label: "Euphoric",
    shortLabel: "Great",
    color: "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-900",
    selectedColor: "bg-green-100 dark:bg-green-950/50 border-green-400 dark:border-green-700",
  },
];

const reflectionQuestions = [
  {
    key: "feelingAboutDay" as const,
    question: "What are you feeling now about your day?",
    icon: Sparkles,
    placeholder: "Describe what you're feeling right now...",
  },
  {
    key: "reachedIntention" as const,
    question: "Have you reached your daily intention?",
    icon: Target,
    placeholder: "Reflect on whether you met your intention for today...",
  },
  {
    key: "dayTitle" as const,
    question: "Give a title or an image to your day",
    icon: Pencil,
    placeholder: 'e.g. "A day of gentle unfolding" or "Waves on still water"...',
  },
  {
    key: "strongestSensation" as const,
    question: "What was the strongest sensation of the day?",
    icon: Zap,
    placeholder: "Describe the most vivid sensation you experienced...",
  },
];

type ReflectionKey = typeof reflectionQuestions[number]["key"];

export function WellbeingScale() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [step, setStep] = useState<"mood" | "reflect" | "done">("mood");
  const [reflections, setReflections] = useState<Record<ReflectionKey, string>>({
    feelingAboutDay: "",
    reachedIntention: "",
    dayTitle: "",
    strongestSensation: "",
  });
  const { toast } = useToast();

  const { data: todaysCheckin, isLoading } = useQuery<WellbeingCheckin | null>({
    queryKey: ['/api/wellbeing/today'],
    queryFn: async () => {
      const response = await fetch('/api/wellbeing/today');
      if (!response.ok) return null;
      const data = await response.json();
      return data || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      wellbeingLevel: number;
      feelingAboutDay?: string;
      reachedIntention?: string;
      dayTitle?: string;
      strongestSensation?: string;
    }) => {
      return await apiRequest('POST', '/api/wellbeing', data);
    },
    onSuccess: () => {
      toast({
        title: "Evening reflection saved",
        description: "Thank you for taking time to reflect on your day.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing/today'] });
      setStep("done");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save wellbeing check-in",
        variant: "destructive",
      });
    },
  });

  const handleMoodSelect = (level: number) => {
    if (!todaysCheckin) {
      setSelectedLevel(level);
      setStep("reflect");
    }
  };

  const handleSubmitReflection = () => {
    if (selectedLevel) {
      saveMutation.mutate({
        wellbeingLevel: selectedLevel,
        feelingAboutDay: reflections.feelingAboutDay || undefined,
        reachedIntention: reflections.reachedIntention || undefined,
        dayTitle: reflections.dayTitle || undefined,
        strongestSensation: reflections.strongestSensation || undefined,
      });
    }
  };

  const handleSkipReflection = () => {
    if (selectedLevel) {
      saveMutation.mutate({ wellbeingLevel: selectedLevel });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-3 sm:p-4 md:p-6 w-full overflow-hidden">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (step === "done" || saveMutation.isSuccess) {
    return (
      <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 flex-shrink-0">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">Evening Reflection</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your reflection has been saved. Thank you for checking in today.
            </p>
          </div>
        </div>
        <div className="text-center py-1 sm:py-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Come back tomorrow
          </p>
        </div>
      </Card>
    );
  }

  if (todaysCheckin) {
    const currentMood = moodLevels.find(m => m.level === todaysCheckin.wellbeingLevel);
    const hasReflections = todaysCheckin.feelingAboutDay || todaysCheckin.reachedIntention || todaysCheckin.dayTitle || todaysCheckin.strongestSensation;

    return (
      <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 flex-shrink-0">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-wellbeing-title">Evening Reflection</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate" data-testid="text-wellbeing-status">
              Checked in today
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 md:gap-2 w-full overflow-hidden">
          {moodLevels.map((mood) => {
            const isSelected = todaysCheckin.wellbeingLevel === mood.level;
            const MoodIcon = mood.icon;
            return (
              <Button
                key={mood.level}
                disabled
                variant="outline"
                className={`
                  flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-2 h-auto min-h-[60px] sm:min-h-[70px] rounded-lg border-2 transition-all
                  ${isSelected ? mood.selectedColor : 'opacity-30'}
                `}
                data-testid={`button-mood-${mood.level}`}
              >
                <MoodIcon className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 flex-shrink-0" aria-label={mood.label} />
                <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-center leading-tight whitespace-nowrap">
                  {mood.shortLabel}
                </span>
              </Button>
            );
          })}
        </div>

        {hasReflections && (
          <div className="space-y-2 pt-1">
            {todaysCheckin.dayTitle && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Today's title</p>
                <p className="text-xs sm:text-sm font-medium italic" data-testid="text-day-title">"{todaysCheckin.dayTitle}"</p>
              </div>
            )}
            {todaysCheckin.feelingAboutDay && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Feeling about the day</p>
                <p className="text-xs sm:text-sm" data-testid="text-feeling-about-day">{todaysCheckin.feelingAboutDay}</p>
              </div>
            )}
            {todaysCheckin.reachedIntention && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Daily intention</p>
                <p className="text-xs sm:text-sm" data-testid="text-reached-intention">{todaysCheckin.reachedIntention}</p>
              </div>
            )}
            {todaysCheckin.strongestSensation && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Strongest sensation</p>
                <p className="text-xs sm:text-sm" data-testid="text-strongest-sensation">{todaysCheckin.strongestSensation}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-center py-1 sm:py-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Come back tomorrow
          </p>
        </div>
      </Card>
    );
  }

  if (step === "reflect" && selectedLevel) {
    const currentMood = moodLevels.find(m => m.level === selectedLevel);

    return (
      <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 flex-shrink-0">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-reflection-title">Evening Reflection</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Feeling: <span className="font-medium">{currentMood?.label}</span> — now take a moment to reflect
            </p>
          </div>
        </div>

        {todaysCheckin?.morningIntention && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Your intention this morning</p>
            <p className="text-xs sm:text-sm italic">"{todaysCheckin.morningIntention}"</p>
          </div>
        )}

        <div className="space-y-4">
          {reflectionQuestions.map((q) => {
            const QuestionIcon = q.icon;
            return (
              <div key={q.key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                  <QuestionIcon className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  {q.question}
                </Label>
                <Textarea
                  value={reflections[q.key]}
                  onChange={(e) => setReflections(prev => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="resize-none text-xs sm:text-sm min-h-[60px] sm:min-h-[72px]"
                  rows={2}
                  data-testid={`textarea-${q.key}`}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            onClick={handleSubmitReflection}
            disabled={saveMutation.isPending}
            className="flex-1 gap-2"
            data-testid="button-submit-reflection"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {saveMutation.isPending ? "Saving..." : "Save Reflection"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkipReflection}
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-skip-reflection"
          >
            <ChevronRight className="h-4 w-4" />
            Skip
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 flex-shrink-0">
          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-wellbeing-title">Evening Reflection</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            How are you feeling right now?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 md:gap-2 w-full overflow-hidden">
        {moodLevels.map((mood) => {
          const MoodIcon = mood.icon;
          return (
            <Button
              key={mood.level}
              onClick={() => handleMoodSelect(mood.level)}
              variant="outline"
              className={`
                flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-2 h-auto min-h-[60px] sm:min-h-[70px] rounded-lg border-2 transition-all
                ${mood.color}
                hover-elevate active-elevate-2
              `}
              data-testid={`button-mood-${mood.level}`}
            >
              <MoodIcon className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 flex-shrink-0" aria-label={mood.label} />
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-center leading-tight whitespace-nowrap">
                {mood.shortLabel}
              </span>
            </Button>
          );
        })}
      </div>

      {saveMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </Card>
  );
}
