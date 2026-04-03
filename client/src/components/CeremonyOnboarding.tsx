import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Leaf } from "lucide-react";
import logoImage from "@assets/ChatGPT Image Nov 10, 2025, 05_44_07 PM_1762767858454.png";

type Step = "timing" | "medicine" | "done";

const TIMING_OPTIONS = [
  { label: "This week", weeksAgo: 0 },
  { label: "1–2 weeks ago", weeksAgo: 1 },
  { label: "3–4 weeks ago", weeksAgo: 3 },
  { label: "5–8 weeks ago", weeksAgo: 6 },
  { label: "3–6 months ago", weeksAgo: 16 },
  { label: "6+ months ago", weeksAgo: 32 },
  { label: "No ceremony", weeksAgo: -1 },
  { label: "Prefer not to say", weeksAgo: null },
];

const MEDICINE_OPTIONS = [
  "Ayahuasca",
  "Bufo alvarius",
  "Yopo",
  "Kambo",
];

export function CeremonyOnboarding() {
  const [step, setStep] = useState<Step>("timing");
  const [selectedWeeksAgo, setSelectedWeeksAgo] = useState<number | null | undefined>(undefined);
  const [selectedMedicine, setSelectedMedicine] = useState<string[]>([]);

  const saveCeremony = useMutation({
    mutationFn: async (data: { weeksAgo: number | null; medicine: string[] }) => {
      return apiRequest("POST", "/api/user/ceremony", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/phase"] });
    },
  });

  function toggleMedicine(med: string) {
    if (med === "Prefer not to say") {
      setSelectedMedicine(prev =>
        prev.includes(med) ? [] : [med]
      );
      return;
    }
    setSelectedMedicine(prev => {
      const withoutPrefer = prev.filter(m => m !== "Prefer not to say");
      return withoutPrefer.includes(med)
        ? withoutPrefer.filter(m => m !== med)
        : [...withoutPrefer, med];
    });
  }

  async function handleFinish() {
    const weeksAgo = selectedWeeksAgo === undefined ? null : selectedWeeksAgo;
    await saveCeremony.mutateAsync({
      weeksAgo,
      medicine: selectedMedicine,
    });
    setStep("done");
  }

  if (step === "done") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md mx-auto px-6 flex flex-col items-center gap-6">
        <img
          src={logoImage}
          alt="Integration Compass"
          className="w-16 h-16 rounded-full object-cover shadow-md"
        />

        {step === "timing" && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Your Ceremony Journey</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Knowing when you sat helps us offer grounded, phase-appropriate support along the way.
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
              {TIMING_OPTIONS.map((opt) => {
                const isSelected = selectedWeeksAgo === opt.weeksAgo;
                return (
                  <button
                    key={opt.label}
                    data-testid={`timing-option-${opt.label.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedWeeksAgo(opt.weeksAgo)}
                    className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-card-foreground border-border hover-elevate"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                      <span>{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              data-testid="button-timing-continue"
              disabled={selectedWeeksAgo === undefined}
              onClick={() => setStep("medicine")}
              className="w-full"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You can update this anytime in your profile settings.
            </p>
          </>
        )}

        {step === "medicine" && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Which medicine guided you?</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Select all that apply. This helps personalize your integration practices.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              {MEDICINE_OPTIONS.map((med) => {
                const isSelected = selectedMedicine.includes(med);
                return (
                  <button
                    key={med}
                    data-testid={`medicine-option-${med.replace(/\s+|[\/]/g, '-').toLowerCase()}`}
                    onClick={() => toggleMedicine(med)}
                    className={`rounded-md border px-4 py-3 text-sm text-left transition-colors flex items-center gap-3 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-card-foreground border-border hover-elevate"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      isSelected ? "bg-primary-foreground border-primary-foreground" : "border-muted-foreground"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    <span>{med}</span>
                  </button>
                );
              })}
            </div>

            <Button
              data-testid="button-ceremony-finish"
              onClick={handleFinish}
              disabled={saveCeremony.isPending}
              className="w-full"
            >
              {saveCeremony.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  Begin Your Journey
                </span>
              )}
            </Button>

            <button
              data-testid="button-medicine-skip"
              onClick={handleFinish}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
