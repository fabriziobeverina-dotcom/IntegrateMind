import { Sprout, Leaf, Star, Award, TreePine, Flower2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  hint: string;
  Icon: any;
  color: string;
}

export const ALL_BADGES: BadgeDef[] = [
  {
    id: 'first_root',
    name: 'First Root',
    description: 'You wrote your first journal entry.',
    hint: 'Write your first journal entry',
    Icon: Sprout,
    color: 'hsl(130 45% 40%)',
  },
  {
    id: 'body_awakened',
    name: 'Body Awakened',
    description: 'You completed your first somatic practice.',
    hint: 'Complete a somatic practice',
    Icon: Leaf,
    color: 'hsl(160 40% 38%)',
  },
  {
    id: 'full_spectrum',
    name: 'Full Spectrum',
    description: 'You worked with all 6 integration categories.',
    hint: 'Complete a prompt in every category',
    Icon: Star,
    color: 'hsl(45 80% 48%)',
  },
  {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'You wrote a journal entry of 500+ words.',
    hint: 'Write 500+ words in a single entry',
    Icon: Award,
    color: 'hsl(210 60% 48%)',
  },
  {
    id: 'the_long_walk',
    name: 'The Long Walk',
    description: 'You maintained a 21-day journal streak.',
    hint: 'Journal for 21 days in a row',
    Icon: TreePine,
    color: 'hsl(30 55% 40%)',
  },
  {
    id: 'full_circle',
    name: 'Full Circle',
    description: 'You completed the full 77-day cycle.',
    hint: 'Complete all 77 daily prompts',
    Icon: Flower2,
    color: 'hsl(10 65% 50%)',
  },
  {
    id: 'witness',
    name: 'Witness',
    description: 'You completed 10 wellbeing pulse check-ins.',
    hint: 'Complete 10 pulse check-ins',
    Icon: Star,
    color: 'hsl(260 50% 52%)',
  },
  {
    id: 'tender',
    name: 'Tender',
    description: 'Your plant has reached the Flowering stage.',
    hint: 'Earn 701+ seeds to reach Flowering',
    Icon: Flower2,
    color: 'hsl(330 55% 52%)',
  },
];

interface BadgeGridProps {
  unlockedIds: string[];
}

export function BadgeGrid({ unlockedIds }: BadgeGridProps) {
  const unlockedSet = new Set(unlockedIds);

  return (
    <div className="grid grid-cols-4 gap-3" data-testid="badge-grid">
      {ALL_BADGES.map(badge => {
        const unlocked = unlockedSet.has(badge.id);
        const { Icon } = badge;
        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <div
                data-testid={`badge-${badge.id}`}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-md transition-opacity ${unlocked ? 'opacity-100' : 'opacity-30'}`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: unlocked ? `${badge.color}22` : 'hsl(var(--muted))' }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: unlocked ? badge.color : 'hsl(var(--muted-foreground))' }}
                  />
                </div>
                <span className="text-[10px] text-center text-muted-foreground leading-tight">
                  {badge.name}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[180px] text-center">
              {unlocked ? (
                <span>{badge.description}</span>
              ) : (
                <span className="italic text-muted-foreground">{badge.hint}</span>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
