import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, Calendar, CheckCircle } from "lucide-react";

interface StreakTrackerProps {
  journalStreak: number;
  practiceStreak: number;
  totalDays: number;
}

export function StreakTracker({ journalStreak, practiceStreak, totalDays }: StreakTrackerProps) {
  const maxStreak = Math.max(journalStreak, practiceStreak);
  
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-chart-2/20">
          <Flame className="h-5 w-5 text-chart-2" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Daily Streaks</h3>
          <p className="text-sm text-muted-foreground">Keep building your practice</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Journal</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-chart-1" data-testid="text-journal-streak">
              {journalStreak}
            </span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-chart-1 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalDays > 0 ? (journalStreak / totalDays) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Practice</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-chart-2" data-testid="text-practice-streak">
              {practiceStreak}
            </span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-chart-2 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalDays > 0 ? (practiceStreak / totalDays) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Total journey: <span className="font-medium" data-testid="text-total-days">{totalDays} days</span>
          </span>
        </div>
        
        {maxStreak >= 7 && (
          <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30" data-testid="badge-achievement">
            Week Warrior! 🏆
          </Badge>
        )}
        
        {maxStreak >= 30 && (
          <Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30" data-testid="badge-month-achievement">
            Month Master! 🌟
          </Badge>
        )}
      </div>
    </Card>
  );
}