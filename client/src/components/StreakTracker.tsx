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
    <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-lg bg-chart-2/20 flex-shrink-0">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">Daily Streaks</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Keep building</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 w-full">
        <div className="space-y-1.5 sm:space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">Journal</span>
          </div>
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-chart-1 tabular-nums" data-testid="text-journal-streak">
              {journalStreak}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div 
              className="bg-chart-1 h-1.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalDays > 0 ? Math.min((journalStreak / totalDays) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">Practice</span>
          </div>
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-chart-2 tabular-nums" data-testid="text-practice-streak">
              {practiceStreak}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div 
              className="bg-chart-2 h-1.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalDays > 0 ? Math.min((practiceStreak / totalDays) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border w-full overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs sm:text-sm text-muted-foreground truncate">
            Total: <span className="font-medium tabular-nums" data-testid="text-total-days">{totalDays}</span> days
          </span>
        </div>
        
        {maxStreak >= 7 && (
          <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30 text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0" data-testid="badge-achievement">
            Week Warrior! 🏆
          </Badge>
        )}
        
        {maxStreak >= 30 && (
          <Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30 text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0" data-testid="badge-month-achievement">
            Month Master! 🌟
          </Badge>
        )}
      </div>
    </Card>
  );
}
