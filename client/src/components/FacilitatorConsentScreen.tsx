import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export function FacilitatorConsentScreen() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (consent: boolean) =>
      apiRequest("POST", "/api/user/facilitator-consent", { consent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your words, held with care</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our team of facilitators may read what you write here — your journal entries, reflections, and responses — to better support your integration journey.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is entirely optional. You can still use the app fully either way.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
            className="w-full"
            data-testid="button-consent-agree"
          >
            Yes, facilitators may read my writing
          </Button>
          <button
            type="button"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-consent-decline"
          >
            Keep my writing private
          </button>
        </div>
      </div>
    </div>
  );
}
