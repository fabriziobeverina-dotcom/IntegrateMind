import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PulseCheckInterstitialProps {
  onComplete: () => void;
}

// Moon phase SVG icons for the 1–5 scale (crescent → full)
function MoonPhase({ phase, size = 40 }: { phase: 1|2|3|4|5; size?: number }) {
  // Each phase = different crescent coverage
  const configs: Record<number, { cx: number }> = {
    1: { cx: 20 },   // new/crescent
    2: { cx: 14 },
    3: { cx: 8 },    // half
    4: { cx: 2 },
    5: { cx: -20 },  // full moon (clip circle moved far left so whole circle shows)
  };
  const { cx } = configs[phase];
  const r = 12;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <clipPath id={`moon-clip-${phase}`}>
          {/* The visible part is the main circle minus the cutout */}
          <circle cx={center} cy={center} r={r} />
        </clipPath>
      </defs>
      {/* Moon body */}
      <circle cx={center} cy={center} r={r} className="fill-muted-foreground/30" />
      {/* Illuminated portion */}
      <ellipse
        cx={center}
        cy={center}
        rx={phase === 5 ? r : Math.abs(cx - center) * 0.8 + 2}
        ry={r}
        clipPath={`url(#moon-clip-${phase})`}
        className="fill-foreground/80"
        transform={phase <= 2 ? `translate(${cx - center + (size/2)}, 0)` : undefined}
      />
      {/* Simpler: just fill based on phase */}
    </svg>
  );
}

// Simpler nature-based scale using filled circles of increasing weight
function ScaleButton({
  value,
  selected,
  onClick,
  label,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  const fills = {
    1: "1/5",
    2: "2/5",
    3: "3/5",
    4: "4/5",
    5: "5/5",
  };

  // Moon phase visual: SVG circles with varying fill crescent
  const phasePercent = (value / 5) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`pulse-scale-${value}`}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all cursor-pointer
        ${selected
          ? "bg-primary/10 ring-2 ring-primary scale-110"
          : "hover:bg-muted/60"
        }`}
      title={label}
    >
      {/* Moon SVG */}
      <svg width="36" height="36" viewBox="0 0 36 36" aria-label={label}>
        <defs>
          <clipPath id={`mc-${value}`}>
            <circle cx="18" cy="18" r="13" />
          </clipPath>
        </defs>
        {/* Background circle */}
        <circle cx="18" cy="18" r="13"
          className={selected ? "fill-primary/20" : "fill-muted-foreground/20"} />
        {/* Illuminated sector — width grows with value */}
        <rect
          x={18 - 13 + (13 * 2 * (1 - value / 5))}
          y="5"
          width={13 * 2 * (value / 5)}
          height="26"
          clipPath={`url(#mc-${value})`}
          className={selected ? "fill-primary" : "fill-foreground/60"}
        />
        {/* Ring */}
        <circle cx="18" cy="18" r="13" fill="none"
          className={selected ? "stroke-primary stroke-2" : "stroke-muted-foreground/40 stroke-1"} />
      </svg>
      <span className={`text-xs font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </button>
  );
}

const QUESTIONS = [
  {
    id: "q1" as const,
    text: "How has your sleep been this week?",
    labels: ["Very poor", "Poor", "Okay", "Good", "Very good"],
  },
  {
    id: "q2" as const,
    text: "How easily have you managed daily tasks and responsibilities?",
    labels: ["Very hard", "Hard", "Okay", "Easily", "Effortlessly"],
  },
  {
    id: "q3" as const,
    text: "How connected have you felt to the people around you?",
    labels: ["Isolated", "Distant", "Neutral", "Connected", "Very connected"],
  },
];

export function PulseCheckInterstitial({ onComplete }: PulseCheckInterstitialProps) {
  const [answers, setAnswers] = useState<Record<"q1" | "q2" | "q3", number | null>>({
    q1: null, q2: null, q3: null,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { q1: number; q2: number; q3: number }) => {
      return apiRequest("POST", "/api/wellbeing/pulse", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing/pulse-status'] });
      onComplete();
    },
  });

  const allAnswered = answers.q1 !== null && answers.q2 !== null && answers.q3 !== null;

  const handleSubmit = () => {
    if (!allAnswered) return;
    submitMutation.mutate({
      q1: answers.q1!,
      q2: answers.q2!,
      q3: answers.q3!,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-2">
          <div>
            <h2 className="text-xl font-semibold">A quick check-in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Three questions. No right answers.
            </p>
          </div>
          <button
            type="button"
            onClick={onComplete}
            data-testid="button-pulse-dismiss"
            className="text-muted-foreground hover-elevate p-1 rounded-md"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium leading-snug">{q.text}</p>
              <div className="flex items-end justify-between gap-1">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <ScaleButton
                    key={v}
                    value={v}
                    selected={answers[q.id] === v}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                    label={q.labels[v - 1]}
                  />
                ))}
              </div>
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitMutation.isPending}
            className="w-full"
            data-testid="button-pulse-submit"
          >
            {submitMutation.isPending ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
