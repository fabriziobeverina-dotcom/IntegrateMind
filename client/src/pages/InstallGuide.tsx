import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Apple,
  Share2,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
        {number}
      </div>
      <p className="text-sm text-foreground leading-relaxed pt-0.5">{text}</p>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2">
      <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Tick({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

function Section({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <button
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid={`button-toggle-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <span className="font-semibold text-base">{label}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <>
          <Separator />
          <CardContent className="pt-5 pb-5 space-y-4">{children}</CardContent>
        </>
      )}
    </Card>
  );
}

export default function InstallGuide() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="mb-2">Installation Guide</Badge>
          <h1 className="text-2xl font-bold tracking-tight">Install Integration Compass</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Add the app to your phone's home screen for a full-screen, native-like experience — no app store required.
          </p>
        </div>

        {/* Android */}
        <Section
          icon={<Smartphone className="w-5 h-5 text-green-700 dark:text-green-300" />}
          label="Android"
          color="bg-green-100 dark:bg-green-900/40"
        >
          <div className="space-y-1 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Option A — Install APK directly
            </p>
          </div>

          <div className="space-y-3">
            <Step number={1} text="Download the Integration Compass APK file sent to you by your facilitator." />
            <Step number={2} text='Open your file manager or the Downloads folder and tap the APK file. If prompted, allow "Install from unknown sources" in your settings.' />
            <Step number={3} text='Tap "Install" and wait for it to finish. Once complete, tap "Open" or find the app icon on your home screen.' />
          </div>

          <Note text='If you see a warning about unknown sources, go to Settings → Security (or Privacy) → enable "Install unknown apps" for your browser or file manager, then try again.' />

          <Separator />

          <div className="space-y-1 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Option B — Add to home screen from Chrome
            </p>
          </div>

          <div className="space-y-3">
            <Step number={1} text="Open Chrome on your Android device and go to the Integration Compass website." />
            <Step number={2} text='Tap the three-dot menu (⋮) in the top right corner.' />
            <Step number={3} text='"Add to Home screen" — tap it and confirm.' />
            <Step number={4} text="The app icon will appear on your home screen. Tap it to open in full-screen mode." />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">What you get:</p>
            <Tick text="Full-screen experience, no browser bar" />
            <Tick text="Works offline (cached content)" />
            <Tick text="Push notification support" />
          </div>
        </Section>

        {/* iOS */}
        <Section
          icon={<Apple className="w-5 h-5 text-blue-700 dark:text-blue-300" />}
          label="iPhone / iPad (iOS)"
          color="bg-blue-100 dark:bg-blue-900/40"
        >
          <Note text="iOS does not support APK files. Use the steps below to add the app directly from Safari — it only takes 30 seconds." />

          <div className="space-y-3">
            <Step
              number={1}
              text="Open Safari on your iPhone or iPad. (It must be Safari — Chrome and other browsers on iOS do not support this feature.)"
            />
            <Step
              number={2}
              text="Go to the Integration Compass website address provided by your facilitator."
            />
            <Step
              number={3}
              text='Tap the Share button at the bottom of the screen — it looks like a box with an arrow pointing up.'
            />
            <Step
              number={4}
              text='"Add to Home Screen" — scroll down in the share sheet until you find it, then tap it.'
            />
            <Step
              number={5}
              text='Tap "Add" in the top right corner. The app icon will appear on your home screen.'
            />
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">What the icons look like</span>
            </div>
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">Share</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground text-center leading-tight">Add to<br/>Home Screen</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">What you get:</p>
            <Tick text="Full-screen experience, no Safari bar" />
            <Tick text="App icon on your home screen like any other app" />
            <Tick text="Works offline for previously visited content" />
          </div>

          <Note text="On iOS 16.4 and later, you can also receive push notifications after installing. Tap 'Allow' if the app asks for notification permission." />
        </Section>

        {/* Troubleshooting */}
        <Section
          icon={<AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />}
          label="Troubleshooting"
          color="bg-amber-100 dark:bg-amber-900/40"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">The app opens in Chrome instead of full-screen (Android APK)</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This usually resolves itself after reinstalling. Uninstall the APK completely, restart your phone, then reinstall it.
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">I can't find "Add to Home Screen" on iPhone</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Make sure you're using Safari, not Chrome or another browser. The share button is the box-with-arrow icon at the bottom centre of Safari.
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">The app asks me to log in every time</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your session is stored for 30 days. If you're asked to log in frequently, make sure you're not using Private/Incognito mode, as it doesn't save sessions.
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">I don't have access to the APK file</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Contact your facilitator — they can share the APK file directly via WhatsApp, email, or Google Drive.
              </p>
            </div>
          </div>
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Integration Compass · Questions? Reach out to your facilitator.
        </p>
      </div>
    </div>
  );
}
