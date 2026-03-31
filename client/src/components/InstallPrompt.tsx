import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsVisible(false);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setIsDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || isDismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-card border rounded-md shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
      data-testid="pwa-install-prompt"
    >
      <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Add to home screen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Install Integration Compass for quick access from your device.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleInstall} data-testid="button-pwa-install">
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} data-testid="button-pwa-dismiss">
            Not now
          </Button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-pwa-close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
