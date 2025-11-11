import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Frown, Meh, Smile, LucideIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WellbeingCheckin {
  id: string;
  userId: string;
  wellbeingLevel: number;
  notes: string | null;
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

export function WellbeingScale() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
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
    mutationFn: async (wellbeingLevel: number) => {
      return await apiRequest('POST', '/api/wellbeing', { wellbeingLevel });
    },
    onSuccess: () => {
      toast({
        title: "Wellbeing recorded!",
        description: "Thank you for checking in today.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing/today'] });
      setSelectedLevel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save wellbeing check-in",
        variant: "destructive",
      });
    },
  });

  const handleSelect = (level: number) => {
    if (!todaysCheckin) {
      setSelectedLevel(level);
      saveMutation.mutate(level);
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

  const currentMood = todaysCheckin?.wellbeingLevel || selectedLevel;

  return (
    <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 flex-shrink-0">
          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">Daily Wellbeing</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {todaysCheckin 
              ? "Checked in!"
              : "How are you feeling?"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 md:gap-2 w-full overflow-hidden">
        {moodLevels.map((mood) => {
          const isSelected = currentMood === mood.level;
          const isDisabled = !!todaysCheckin || saveMutation.isPending;
          const MoodIcon = mood.icon;
          
          return (
            <Button
              key={mood.level}
              onClick={() => handleSelect(mood.level)}
              disabled={isDisabled}
              variant="outline"
              className={`
                flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-2 h-auto min-h-[60px] sm:min-h-[70px] rounded-lg border-2 transition-all
                ${isSelected ? mood.selectedColor : mood.color}
                ${!isDisabled && !isSelected ? 'hover-elevate active-elevate-2' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
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

      {todaysCheckin && (
        <div className="text-center py-1 sm:py-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Come back tomorrow
          </p>
        </div>
      )}

      {saveMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </Card>
  );
}
