import { useState, type ComponentType } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { X, Leaf, Sprout, TreePine, Flower, Flame } from "lucide-react";

interface PhaseData {
  phase: string;
  label: string;
  description: string;
  daysSinceCeremony: number | null;
  weeksSinceCeremony: number | null;
  medicine: string[];
  onboardingCeremonyComplete: boolean;
  phaseTransitionShown: Record<string, boolean>;
}

const PHASE_CONFIG: Record<string, {
  color: string;
  bg: string;
  icon: ComponentType<{ className?: string }>;
  shortLabel: string;
  detail: string;
  guidance: string;
}> = {
  acute: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    icon: Flame,
    shortLabel: "Acute",
    detail: "First 2 weeks after ceremony",
    guidance: "Focus on rest, hydration, and gentle grounding. Avoid major life decisions. Your nervous system is still integrating.",
  },
  integration: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    icon: Sprout,
    shortLabel: "Integration",
    detail: "Weeks 2–8 after ceremony",
    guidance: "This is a rich time to journal, reflect, and begin embodying your insights through daily practice.",
  },
  deepening: {
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800",
    icon: TreePine,
    shortLabel: "Deepening",
    detail: "Weeks 8–24 after ceremony",
    guidance: "Your insights are settling in. Focus on sustainable habits and sharing what you've learned with your community.",
  },
  long_term: {
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",
    icon: Flower,
    shortLabel: "Long-term",
    detail: "6+ months after ceremony",
    guidance: "You are in sustained integration. Your growth is becoming a stable foundation. Consider how to give back.",
  },
  none: {
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-muted",
    icon: Leaf,
    shortLabel: "Journey",
    detail: "General integration support",
    guidance: "Follow the daily prompts at your own pace and explore practices that resonate with you.",
  },
};

export function PhaseIndicator() {
  const [expanded, setExpanded] = useState(false);

  const { data: phaseData } = useQuery<PhaseData>({
    queryKey: ["/api/user/phase"],
    staleTime: 10 * 60 * 1000,
  });

  if (!phaseData || !phaseData.onboardingCeremonyComplete) return null;

  const phase = phaseData.phase || "none";
  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG.none;
  const Icon = config.icon;

  return (
    <>
      <button
        data-testid="phase-indicator-chip"
        onClick={() => setExpanded(v => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors hover-elevate ${config.bg} ${config.color}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{config.shortLabel}</span>
        {phaseData.weeksSinceCeremony !== null && (
          <span className="opacity-70">· Week {phaseData.weeksSinceCeremony}</span>
        )}
      </button>

      {expanded && (
        <div
          data-testid="phase-detail-sheet"
          className={`mt-3 rounded-md border p-4 text-sm ${config.bg} ${config.color}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold">{phaseData.label}</div>
              <div className="text-xs opacity-70">{config.detail}</div>
            </div>
            <button
              data-testid="button-close-phase-detail"
              onClick={() => setExpanded(false)}
              className="opacity-60 hover:opacity-100 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="leading-relaxed opacity-90">{config.guidance}</p>
          {phaseData.medicine.length > 0 && !phaseData.medicine.includes("Prefer not to say") && (
            <div className="mt-3 pt-3 border-t border-current/20 flex flex-wrap gap-1">
              {phaseData.medicine.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-background/40 border border-current/20">{m}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function PhaseTransitionInterstitial() {
  const { data: phaseData, refetch } = useQuery<PhaseData>({
    queryKey: ["/api/user/phase"],
    staleTime: 10 * 60 * 1000,
  });

  const markSeen = useMutation({
    mutationFn: async (phase: string) => {
      return apiRequest("POST", "/api/user/phase/transition-seen", { phase });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/phase"] });
    },
  });

  if (!phaseData || !phaseData.onboardingCeremonyComplete) return null;

  const phase = phaseData.phase;
  if (phase === "none") return null;

  const alreadySeen = phaseData.phaseTransitionShown?.[phase];
  if (alreadySeen) return null;

  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG.none;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-6">
      <div className={`w-full max-w-sm rounded-xl border p-8 flex flex-col items-center text-center gap-4 ${config.bg} ${config.color}`}>
        <div className="w-16 h-16 rounded-full bg-background/40 flex items-center justify-center">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">Entering {phaseData.label}</h2>
          <p className="text-xs opacity-70 mb-3">{config.detail}</p>
          <p className="text-sm leading-relaxed opacity-90">{config.guidance}</p>
        </div>
        <Button
          data-testid="button-phase-transition-continue"
          onClick={() => markSeen.mutate(phase)}
          disabled={markSeen.isPending}
          variant="outline"
          className="w-full"
        >
          Continue My Journey
        </Button>
      </div>
    </div>
  );
}
