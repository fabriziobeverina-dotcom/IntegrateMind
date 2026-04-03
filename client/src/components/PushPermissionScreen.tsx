import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { subscribeToPush, isPushSupported } from "@/lib/push";

interface Props {
  onDone: () => void;
}

export function PushPermissionScreen({ onDone }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const markAskedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/push/permission-asked"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
      onDone();
    },
  });

  async function handleAllow() {
    setLoading(true);
    await subscribeToPush();
    markAskedMutation.mutate();
  }

  function handleDecline() {
    markAskedMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Bell icon */}
        <div className="w-20 h-20 flex items-center justify-center rounded-full bg-muted">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10 text-[hsl(150,30%,45%)]"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Gentle reminders</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We keep notifications minimal — only when your practice might need a nudge. Never marketing, never noise.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={handleAllow}
            disabled={loading || markAskedMutation.isPending}
            className="w-full"
            data-testid="button-allow-notifications"
          >
            Yes, remind me
          </Button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={loading || markAskedMutation.isPending}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-decline-notifications"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
