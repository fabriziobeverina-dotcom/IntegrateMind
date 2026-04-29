import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Moon, Sun, Check, ArrowRight } from "lucide-react";
import logoImage from "@assets/ChatGPT Image Nov 10, 2025, 05_44_07 PM_1762767858454.png";

type Step = "welcome" | "notifications" | "times" | "done";

interface OnboardingState {
  notificationsEnabled: boolean;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [state, setState] = useState<OnboardingState>({
    notificationsEnabled: true,
    morningEnabled: true,
    morningTime: "08:00",
    eveningEnabled: true,
    eveningTime: "20:00",
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const completeOnboarding = useMutation({
    mutationFn: async (data: {
      reminderEnabled: boolean;
      morningReminderEnabled: boolean;
      morningReminderTime: string;
      eveningReminderEnabled: boolean;
      eveningReminderTime: string;
      reminderTimezone: string;
    }) => {
      return apiRequest("POST", "/api/settings/complete-onboarding", data);
    },
  });

  async function requestPermissionAndProceed() {
    if (state.notificationsEnabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
    }
    await completeOnboarding.mutateAsync({
      reminderEnabled: state.notificationsEnabled,
      morningReminderEnabled: state.notificationsEnabled && state.morningEnabled,
      morningReminderTime: state.morningTime,
      eveningReminderEnabled: state.notificationsEnabled && state.eveningEnabled,
      eveningReminderTime: state.eveningTime,
      reminderTimezone: browserTimezone,
    });
    setStep("done");
  }

  async function skipNotifications() {
    await completeOnboarding.mutateAsync({
      reminderEnabled: false,
      morningReminderEnabled: false,
      morningReminderTime: state.morningTime,
      eveningReminderEnabled: false,
      eveningReminderTime: state.eveningTime,
      reminderTimezone: browserTimezone,
    });
    setState(s => ({ ...s, notificationsEnabled: false }));
    setStep("done");
  }

  function formatTimeDisplay(time: string) {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      data-testid="onboarding-overlay"
    >
      <div className="w-full max-w-md mx-4">

        {/* STEP: Welcome */}
        {step === "welcome" && (
          <div className="text-center space-y-6 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="flex justify-center">
              <img
                src={logoImage}
                alt="Integration Compass"
                className="h-28 w-28 rounded-2xl shadow-lg"
                data-testid="img-onboarding-logo"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">Welcome to Integration Compass</h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                Your 77-day journey of healing, reflection, and integration starts here.
                Let's take a moment to set up a few things to support you along the way.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => setStep("notifications")}
              data-testid="button-onboarding-start"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP: Notifications toggle */}
        {step === "notifications" && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-7 w-7 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Daily Reminders</h2>
              <p className="text-muted-foreground">
                Gentle nudges help you stay consistent on your integration journey.
              </p>
            </div>

            <div className="bg-card border rounded-md p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Enable reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified for journaling, check-ins, and special days
                  </p>
                </div>
                <Switch
                  checked={state.notificationsEnabled}
                  onCheckedChange={(v) => setState(s => ({ ...s, notificationsEnabled: v }))}
                  data-testid="switch-notifications-enabled"
                />
              </div>

              {state.notificationsEnabled && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <div>
                        <Label className="text-sm font-medium">Morning reminder</Label>
                        <p className="text-xs text-muted-foreground">Daily journaling & prompts</p>
                      </div>
                    </div>
                    <Switch
                      checked={state.morningEnabled}
                      onCheckedChange={(v) => setState(s => ({ ...s, morningEnabled: v }))}
                      data-testid="switch-morning-enabled"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-indigo-400" />
                      <div>
                        <Label className="text-sm font-medium">Evening reminder</Label>
                        <p className="text-xs text-muted-foreground">Wellbeing check-in</p>
                      </div>
                    </div>
                    <Switch
                      checked={state.eveningEnabled}
                      onCheckedChange={(v) => setState(s => ({ ...s, eveningEnabled: v }))}
                      data-testid="switch-evening-enabled"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full gap-2"
                disabled={completeOnboarding.isPending}
                onClick={() => {
                  if (state.notificationsEnabled && (state.morningEnabled || state.eveningEnabled)) {
                    setStep("times");
                  } else {
                    requestPermissionAndProceed();
                  }
                }}
                data-testid="button-notifications-next"
              >
                {completeOnboarding.isPending
                  ? "Saving..."
                  : state.notificationsEnabled && (state.morningEnabled || state.eveningEnabled)
                  ? "Set reminder times"
                  : "Continue"}
                {!completeOnboarding.isPending && <ArrowRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={completeOnboarding.isPending}
                onClick={skipNotifications}
                data-testid="button-skip-notifications"
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Time selection */}
        {step === "times" && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Choose your times</h2>
              <p className="text-muted-foreground">
                Pick the times that feel right for your daily practice.
              </p>
            </div>

            <div className="bg-card border rounded-md p-5 space-y-5">
              {state.morningEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <Label className="font-medium">Morning reminder</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={state.morningTime}
                      onChange={(e) => setState(s => ({ ...s, morningTime: e.target.value }))}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="input-morning-time"
                    />
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      {formatTimeDisplay(state.morningTime)}
                    </span>
                  </div>
                </div>
              )}

              {state.morningEnabled && state.eveningEnabled && (
                <div className="border-t" />
              )}

              {state.eveningEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <Label className="font-medium">Evening reminder</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={state.eveningTime}
                      onChange={(e) => setState(s => ({ ...s, eveningTime: e.target.value }))}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="input-evening-time"
                    />
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      {formatTimeDisplay(state.eveningTime)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={requestPermissionAndProceed}
                disabled={completeOnboarding.isPending}
                data-testid="button-times-confirm"
              >
                {completeOnboarding.isPending ? "Saving..." : "Confirm & Continue"}
                {!completeOnboarding.isPending && <ArrowRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setStep("notifications")}
                data-testid="button-times-back"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div className="text-center space-y-6 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-500" strokeWidth={2.5} />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground leading-relaxed">
                {state.notificationsEnabled
                  ? permissionStatus === "granted"
                    ? "Your reminders are configured. We'll send gentle nudges to support your journey."
                    : "Your preferences are saved. You can enable browser notifications anytime in Settings."
                  : "Your journey begins now. You can set up reminders anytime from Settings."}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })}
              data-testid="button-onboarding-complete"
            >
              Begin My Journey
            </Button>
          </div>
        )}

        {/* Step indicators */}
        {step !== "done" && (
          <div className="flex justify-center gap-1.5 mt-8">
            {(["welcome", "notifications", "times"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 bg-primary"
                    : s === "times" && !state.notificationsEnabled
                    ? "hidden"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
