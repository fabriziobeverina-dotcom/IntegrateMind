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
  color: string;
  selectedColor: string;
}> = [
  {
    level: 1,
    icon: Frown,
    label: "Very Low",
    color: "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900",
    selectedColor: "bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-700",
  },
  {
    level: 2,
    icon: Frown,
    label: "Low",
    color: "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    selectedColor: "bg-orange-100 dark:bg-orange-950/50 border-orange-400 dark:border-orange-700",
  },
  {
    level: 3,
    icon: Meh,
    label: "Neutral",
    color: "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    selectedColor: "bg-yellow-100 dark:bg-yellow-950/50 border-yellow-400 dark:border-yellow-700",
  },
  {
    level: 4,
    icon: Smile,
    label: "Good",
    color: "text-lime-600 hover:bg-lime-50 dark:hover:bg-lime-950/30 border-lime-200 dark:border-lime-900",
    selectedColor: "bg-lime-100 dark:bg-lime-950/50 border-lime-400 dark:border-lime-700",
  },
  {
    level: 5,
    icon: Smile,
    label: "Euphoric",
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
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const currentMood = todaysCheckin?.wellbeingLevel || selectedLevel;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-pink-500/10">
          <Heart className="h-5 w-5 text-pink-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Daily Wellbeing Check-In</h3>
          <p className="text-sm text-muted-foreground">
            {todaysCheckin 
              ? "You've checked in today!"
              : "How are you feeling right now?"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
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
                flex flex-col items-center gap-2 p-3 h-auto rounded-lg border-2 transition-all
                ${isSelected ? mood.selectedColor : mood.color}
                ${!isDisabled && !isSelected ? 'hover-elevate active-elevate-2' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              data-testid={`button-mood-${mood.level}`}
            >
              <MoodIcon className="h-8 w-8" aria-label={mood.label} />
              <span className="text-xs font-medium text-center">
                {mood.label}
              </span>
            </Button>
          );
        })}
      </div>

      {todaysCheckin && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Come back tomorrow to check in again
          </p>
        </div>
      )}

      {saveMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving your check-in...</span>
        </div>
      )}
    </Card>
  );
}
