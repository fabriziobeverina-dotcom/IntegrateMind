import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Users } from "lucide-react";
import { useState } from "react";

interface Practice {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'Calming' | 'Energizing' | 'Grounding' | 'Dreamwork';
  instructor: string;
  completed?: boolean;
}

interface PracticeCardProps {
  practice: Practice;
  onPlay?: (practiceId: string) => void;
  onComplete?: (practiceId: string) => void;
}

const categoryColors = {
  Calming: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Energizing: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Grounding: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Dreamwork: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
};

export function PracticeCard({ practice, onPlay, onComplete }: PracticeCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onPlay?.(practice.id);
    console.log(`${isPlaying ? 'Paused' : 'Playing'} practice:`, practice.title);
  };

  const handleComplete = () => {
    onComplete?.(practice.id);
    console.log('Completed practice:', practice.title);
  };

  return (
    <Card className="p-4 space-y-4 hover-elevate transition-all">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-base leading-tight" data-testid={`text-practice-title-${practice.id}`}>
              {practice.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-practice-description-${practice.id}`}>
              {practice.description}
            </p>
          </div>
          <Badge 
            className={`${categoryColors[practice.category]} text-xs font-medium`}
            data-testid={`badge-category-${practice.id}`}
          >
            {practice.category}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span data-testid={`text-duration-${practice.id}`}>{practice.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span data-testid={`text-instructor-${practice.id}`}>{practice.instructor}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handlePlay} 
          className="flex-1"
          variant={isPlaying ? "secondary" : "default"}
          data-testid={`button-play-${practice.id}`}
        >
          <Play className={`h-4 w-4 mr-2 ${isPlaying ? 'fill-current' : ''}`} />
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        {!practice.completed && (
          <Button 
            onClick={handleComplete}
            variant="outline"
            data-testid={`button-complete-${practice.id}`}
          >
            Complete
          </Button>
        )}
        
        {practice.completed && (
          <Badge variant="default" className="px-3 py-1">
            ✓ Complete
          </Badge>
        )}
      </div>
    </Card>
  );
}