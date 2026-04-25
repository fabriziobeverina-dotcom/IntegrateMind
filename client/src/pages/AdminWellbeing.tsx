import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Eye, CheckCircle2, Flag, TrendingDown,
  BookOpen, Repeat2, Flame, Activity, Mail, Save, Info,
} from "lucide-react";
import { format } from "date-fns";

interface WellbeingRow {
  userId: string;
  displayName: string;
  email: string | null;
  daysSinceJournal: number | null;
  lastPulse: { q1: number; q2: number; q3: number; composite: number; date: string } | null;
  scoreDelta: number | null;
  flags: Array<{ name: string; setAt: string }>;
  alertStatus: "none" | "watching" | "triggered" | "resolved";
  alertTriggeredAt: string | null;
  facilitatorNote: string | null;
}

const FLAG_LABELS: Record<string, string> = {
  journaling_dropout: "Journal dropout",
  entry_length_collapse: "Entry length drop",
  obsessive_repetition: "Repetitive themes",
  streak_break: "Streak broken",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  journaling_dropout:
    "This person was journaling 3 or more times in the previous week, then stopped completely for 4 or more consecutive days — a significant behavioral change.",
  entry_length_collapse:
    "Their journal entries previously averaged 80+ words. Over the last 3 days the average has dropped below 30 words — suggesting withdrawal or disengagement.",
  obsessive_repetition:
    "One word or theme dominates more than 40% of content across their last 5 journal entries — a possible sign of fixation or looping thought patterns.",
  streak_break:
    "They maintained a journaling streak of 7 or more consecutive days, then missed today — breaking an established pattern of engagement.",
};

const FLAG_ICONS: Record<string, typeof Flag> = {
  journaling_dropout: BookOpen,
  entry_length_collapse: TrendingDown,
  obsessive_repetition: Repeat2,
  streak_break: Flame,
};

const PULSE_QUESTIONS = [
  {
    key: "q1",
    label: "Emotional",
    description:
      "How emotionally regulated and stable this person has been feeling. A score of 1–2 suggests they may be feeling overwhelmed, numb, or in emotional distress.",
  },
  {
    key: "q2",
    label: "Body",
    description:
      "How present and connected they feel in their physical body — sleep, appetite, somatic grounding. Low scores can indicate physical symptoms of dysregulation.",
  },
  {
    key: "q3",
    label: "Connection",
    description:
      "How supported and connected they feel to others. A low score may indicate social isolation or difficulty reaching out — important context for follow-up.",
  },
];

function buildSummary(row: WellbeingRow): string {
  const firstName = row.displayName.split(" ")[0];
  const flags = Array.isArray(row.flags) ? (row.flags as Array<{ name: string }>) : [];
  const pulse = row.lastPulse;
  const parts: string[] = [];

  // --- Pulse-based reasons ---
  if (pulse) {
    const atMinimum = (["q1", "q2", "q3"] as const).filter(k => pulse[k] === 1);
    const veryLow = (["q1", "q2", "q3"] as const).filter(k => pulse[k] <= 2);
    const labelMap: Record<string, string> = { q1: "emotional state", q2: "physical grounding", q3: "sense of connection" };

    if (atMinimum.length > 0) {
      const labels = atMinimum.map(k => labelMap[k]).join(" and ");
      parts.push(`${firstName} scored 1 out of 5 on ${labels} in their most recent pulse check — the lowest possible score, which automatically triggers a review under our monitoring criteria.`);
    } else if (veryLow.length >= 2) {
      const labels = veryLow.map(k => labelMap[k]).join(" and ");
      parts.push(`${firstName} scored 2 or below on ${labels} in their most recent pulse check (total: ${pulse.composite}/15). Our threshold for concern is two or more very low scores (≤ 2/5), which this check-in crossed.`);
    } else if (pulse.composite <= 6) {
      parts.push(`${firstName}'s overall pulse check score was ${pulse.composite} out of 15 — below the threshold of 6 that indicates a need for closer attention.`);
    }

    if (row.scoreDelta !== null && row.scoreDelta <= -5) {
      parts.push(`Their score also dropped ${Math.abs(row.scoreDelta)} points compared to their previous check-in, which meets our criterion for a sudden significant decline (≥ 5 points).`);
    }
  }

  // --- Journal-based flags ---
  const flagSentences: Record<string, string> = {
    journaling_dropout: `${firstName} had been journaling at least 3 times in the prior week but then made no entries for 4 or more consecutive days. Our system flags this pattern as a meaningful drop in engagement.`,
    entry_length_collapse: `The length of ${firstName}'s journal entries dropped sharply — from an average of 80 or more words to fewer than 30 words over the most recent 3 days. This collapse in depth is a recognised signal of possible emotional withdrawal.`,
    obsessive_repetition: `Analysis of ${firstName}'s last 5 journal entries found that a single word or theme accounts for more than 40% of all written content. This level of repetition may reflect a looping thought pattern or unresolved fixation.`,
    streak_break: `${firstName} had maintained a journaling streak of 7 or more consecutive days and then stopped. While a missed day can be ordinary, a streak break after consistent engagement is worth noting in the context of integration support.`,
  };

  for (const flag of flags) {
    const sentence = flagSentences[flag.name];
    if (sentence) parts.push(sentence);
  }

  // --- Composite context ---
  if (parts.length === 0) {
    const pulseNote = pulse
      ? `Their most recent pulse check recorded an emotional score of ${pulse.q1}/5, a physical grounding score of ${pulse.q2}/5, and a connection score of ${pulse.q3}/5 (total: ${pulse.composite}/15).`
      : "No pulse check has been completed yet.";
    const journalNote =
      row.daysSinceJournal === null
        ? "They have never written a journal entry."
        : row.daysSinceJournal === 0
          ? "They wrote a journal entry today."
          : `Their last journal entry was ${row.daysSinceJournal} day${row.daysSinceJournal === 1 ? "" : "s"} ago.`;
    const statusNote =
      row.alertStatus === "triggered"
        ? `The system moved ${firstName} to Triggered status, which may have occurred during a previous check when the data showed a more acute pattern. The signals may have since shifted — review the full detail below and use your facilitator judgement.`
        : `The system moved ${firstName} to Watching status, indicating early-stage signals were present at the time of detection. The situation warrants observation even if the individual metrics look borderline now.`;
    return `${pulseNote} ${journalNote} ${statusNote}`;
  }

  const statusContext =
    row.alertStatus === "triggered"
      ? `Based on the above, the system has automatically moved ${firstName} to Triggered status, meaning facilitator follow-up is recommended.`
      : `Based on the above, the system has moved ${firstName} to Watching status. No immediate action is required but the situation warrants ongoing observation.`;

  return parts.join(" ") + " " + statusContext;
}

function pulseReasons(pulse: WellbeingRow["lastPulse"], delta: number | null): string[] {
  if (!pulse) return [];
  const reasons: string[] = [];
  if (pulse.q1 === 1) reasons.push("Emotional score at minimum (1/5)");
  if (pulse.q2 === 1) reasons.push("Body score at minimum (1/5)");
  if (pulse.q3 === 1) reasons.push("Connection score at minimum (1/5)");
  const lowCount = [pulse.q1, pulse.q2, pulse.q3].filter(q => q <= 2).length;
  if (lowCount >= 2 && pulse.q1 !== 1 && pulse.q2 !== 1 && pulse.q3 !== 1) {
    reasons.push(`${lowCount} of 3 scores were very low (≤ 2/5)`);
  }
  if (pulse.composite <= 6 && reasons.length === 0) {
    reasons.push(`Overall score very low (${pulse.composite}/15)`);
  }
  if (delta !== null && delta <= -5) {
    reasons.push(`Sharp decline of ${Math.abs(delta)} points from previous check-in`);
  }
  return reasons;
}

function buildEmailBody(row: WellbeingRow): string {
  const flags = Array.isArray(row.flags) ? (row.flags as Array<{ name: string }>) : [];
  const flagLines = flags.map(f => `- ${FLAG_LABELS[f.name] ?? f.name}`).join("\n");
  const pulseInfo = row.lastPulse
    ? `Pulse check scores — Emotional: ${row.lastPulse.q1}/5, Body: ${row.lastPulse.q2}/5, Connection: ${row.lastPulse.q3}/5 (Total: ${row.lastPulse.composite}/15)`
    : "";
  return [
    `Hi ${row.displayName.split(" ")[0]},`,
    "",
    "I wanted to reach out and check in with you personally. I noticed some signals in your Integration Compass activity and wanted to make sure you're doing okay.",
    "",
    pulseInfo,
    flagLines ? `Signals detected:\n${flagLines}` : "",
    "",
    "Please know that support is available. Feel free to reply to this email or reach out directly whenever you're ready.",
    "",
    "With care,",
  ]
    .filter(Boolean)
    .join("\n");
}

function StatusBadge({
  status,
  onClick,
}: {
  status: WellbeingRow["alertStatus"];
  onClick?: () => void;
}) {
  if (status === "triggered") {
    return (
      <Badge
        className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 gap-1 cursor-pointer"
        onClick={onClick}
        data-testid="badge-triggered"
      >
        <AlertTriangle className="h-3 w-3" />
        Triggered
      </Badge>
    );
  }
  if (status === "watching") {
    return (
      <Badge
        className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 gap-1 cursor-pointer"
        onClick={onClick}
        data-testid="badge-watching"
      >
        <Eye className="h-3 w-3" />
        Watching
      </Badge>
    );
  }
  if (status === "resolved") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Resolved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Clear
    </Badge>
  );
}

function ScoreDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground text-sm">—</span>;
  if (delta < 0) return <span className="text-red-600 dark:text-red-400 font-medium text-sm">{delta}</span>;
  if (delta > 0) return <span className="text-green-600 dark:text-green-400 font-medium text-sm">+{delta}</span>;
  return <span className="text-muted-foreground text-sm">0</span>;
}

function FlagReportDialog({
  row,
  onClose,
}: {
  row: WellbeingRow | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState(row?.facilitatorNote ?? "");

  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      apiRequest("POST", `/api/admin/wellbeing/${row!.userId}/note`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wellbeing'] });
      toast({ title: "Note saved" });
    },
  });

  if (!row) return null;
  const pulse = row.lastPulse;
  const reasons = pulseReasons(pulse, row.scoreDelta);
  const flags = Array.isArray(row.flags) ? (row.flags as Array<{ name: string; setAt: string }>) : [];

  const [showEmailDraft, setShowEmailDraft] = useState(false);

  const handleEmail = () => {
    const subject = encodeURIComponent(`Checking in — Integration Compass`);
    const body = encodeURIComponent(buildEmailBody(row));
    const to = row.email ?? "";
    // Try mailto link; also show draft in case browser has no mail handler
    const a = document.createElement("a");
    a.href = `mailto:${to}?subject=${subject}&body=${body}`;
    a.click();
    setShowEmailDraft(true);
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-flag-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Flag report — {row.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Alert summary */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <StatusBadge status={row.alertStatus} />
              {row.alertTriggeredAt && (
                <span className="text-xs text-muted-foreground">
                  Since {format(new Date(row.alertTriggeredAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This report is only visible to facilitators. The participant does not see these flags.
            </p>
          </div>

          {/* Narrative summary */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Why this person was flagged</p>
            <p className="text-sm leading-relaxed">{buildSummary(row)}</p>
          </div>

          {/* Pulse check scores */}
          {pulse && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" />
                Pulse check scores
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Emotional", value: pulse.q1 },
                  { label: "Body", value: pulse.q2 },
                  { label: "Connection", value: pulse.q3 },
                  { label: "Total", value: `${pulse.composite}/15` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 py-2 px-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`font-semibold text-sm mt-0.5 ${
                      typeof item.value === "number" && item.value <= 2
                        ? "text-red-600 dark:text-red-400"
                        : "text-foreground"
                    }`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Score explanations */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                  <Info className="h-3 w-3" />
                  What each score measures
                </div>
                {PULSE_QUESTIONS.map((q) => {
                  const score = pulse[q.key as "q1" | "q2" | "q3"];
                  return (
                    <div key={q.key} className="rounded-lg bg-muted/30 px-3 py-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{q.label}</span>
                        <span className={`text-xs font-semibold ${
                          score <= 2 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                        }`}>
                          {score}/5
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Score delta */}
              {row.scoreDelta !== null && (
                <p className="text-xs text-muted-foreground">
                  Change from previous check-in:{" "}
                  <span className={row.scoreDelta <= -5 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                    {row.scoreDelta > 0 ? "+" : ""}{row.scoreDelta} points
                  </span>
                </p>
              )}

              {/* Trigger reasons */}
              {reasons.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What triggered the alert</p>
                  {reasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Journal behaviour flags */}
          {flags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Flag className="h-4 w-4 text-amber-500" />
                Journal behaviour signals
              </div>
              <div className="space-y-2">
                {flags.map((f) => {
                  const Icon = FLAG_ICONS[f.name] ?? Flag;
                  return (
                    <div
                      key={f.name}
                      className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 px-3 py-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-medium">{FLAG_LABELS[f.name] ?? f.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Detected {format(new Date(f.setAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {FLAG_DESCRIPTIONS[f.name] ?? "Unusual pattern detected in journal behaviour."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last journal activity */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Last journal entry:{" "}
              <span className="text-foreground font-medium">
                {row.daysSinceJournal === null
                  ? "Never written"
                  : row.daysSinceJournal === 0
                    ? "Today"
                    : `${row.daysSinceJournal} day${row.daysSinceJournal === 1 ? "" : "s"} ago`}
              </span>
            </p>
          </div>

          {/* Facilitator note */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Save className="h-4 w-4 text-primary" />
              Facilitator note
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Followed up via WhatsApp on Apr 25 — they mentioned feeling isolated after returning home from retreat."
              rows={3}
              className="resize-none text-xs"
              data-testid="input-facilitator-note"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={note === (row.facilitatorNote ?? "") || noteMutation.isPending}
              onClick={() => noteMutation.mutate(note)}
              data-testid="button-save-note"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {noteMutation.isPending ? "Saving…" : "Save note"}
            </Button>
          </div>

          {/* Email section */}
          <div className="rounded-lg border px-3 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-medium">Send a check-in email</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {row.email ? `To: ${row.email}` : "No email address on record."}
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleEmail}
                disabled={!row.email}
                data-testid="button-send-email"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Open email
              </Button>
            </div>

            {showEmailDraft && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  If your email app didn't open, copy the message below and paste it manually:
                </p>
                <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium">To:</span> {row.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium">Subject:</span> Checking in — Integration Compass
                  </p>
                </div>
                <div className="relative">
                  <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded-md px-3 py-2.5 leading-relaxed font-sans">
                    {buildEmailBody(row)}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(buildEmailBody(row));
                    }}
                    data-testid="button-copy-email"
                  >
                    Copy message
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={onClose} data-testid="button-close-report">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminWellbeing() {
  const { toast } = useToast();
  const [showOnlyTriggered, setShowOnlyTriggered] = useState(true);
  const [resolvingUser, setResolvingUser] = useState<WellbeingRow | null>(null);
  const [reportUser, setReportUser] = useState<WellbeingRow | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const { data: rows = [], isLoading } = useQuery<WellbeingRow[]>({
    queryKey: ['/api/admin/wellbeing'],
  });

  const resolveMutation = useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) =>
      apiRequest("POST", `/api/admin/wellbeing/${userId}/resolve`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wellbeing'] });
      setResolvingUser(null);
      setResolveNote("");
      toast({ title: "Marked as resolved" });
    },
  });

  const filtered = showOnlyTriggered
    ? rows.filter(r => r.alertStatus === "triggered" || r.alertStatus === "watching")
    : rows;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Participant Wellbeing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Behavioral signals and check-in data. All information is confidential.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Switch
          id="filter-triggered"
          checked={showOnlyTriggered}
          onCheckedChange={setShowOnlyTriggered}
          data-testid="toggle-show-triggered"
        />
        <Label htmlFor="filter-triggered" className="cursor-pointer text-sm">
          Show only flagged participants
        </Label>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {rows.length} participants
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All clear</p>
            <p className="text-sm mt-1">No participants need attention right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <Card
              key={row.userId}
              data-testid={`wellbeing-row-${row.userId}`}
              className={row.alertStatus === "triggered" ? "border-red-200 dark:border-red-900/50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-medium">{row.displayName}</span>
                      <StatusBadge
                        status={row.alertStatus}
                        onClick={() => (row.alertStatus === "triggered" || row.alertStatus === "watching") && setReportUser(row)}
                      />
                      {(row.alertStatus === "triggered" || row.alertStatus === "watching") && (
                        <button
                          className="text-[10px] text-muted-foreground underline underline-offset-2"
                          onClick={() => setReportUser(row)}
                          data-testid={`button-view-report-${row.userId}`}
                        >
                          View report
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Last journal</p>
                        <p className="font-medium">
                          {row.daysSinceJournal === null
                            ? "Never"
                            : row.daysSinceJournal === 0
                              ? "Today"
                              : `${row.daysSinceJournal}d ago`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Last pulse</p>
                        {row.lastPulse ? (
                          <p className="font-medium">
                            {row.lastPulse.composite}/15
                            <span className="text-xs text-muted-foreground ml-1">
                              ({row.lastPulse.q1}·{row.lastPulse.q2}·{row.lastPulse.q3})
                            </span>
                          </p>
                        ) : (
                          <p className="text-muted-foreground">None yet</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Score change</p>
                        <ScoreDelta delta={row.scoreDelta} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Alert since</p>
                        <p className="font-medium">
                          {row.alertTriggeredAt
                            ? format(new Date(row.alertTriggeredAt), "MMM d")
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(row.flags) && row.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(row.flags as Array<{ name: string }>).map((f) => (
                          <span
                            key={f.name}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          >
                            <Flag className="h-2.5 w-2.5" />
                            {FLAG_LABELS[f.name] ?? f.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {row.facilitatorNote && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        Note: {row.facilitatorNote}
                      </p>
                    )}
                  </div>

                  {(row.alertStatus === "triggered" || row.alertStatus === "watching") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setResolvingUser(row); setResolveNote(""); }}
                      data-testid={`button-resolve-${row.userId}`}
                      className="shrink-0"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Flag report dialog */}
      {reportUser && (
        <FlagReportDialog key={reportUser.userId} row={reportUser} onClose={() => setReportUser(null)} />
      )}

      {/* Resolve dialog */}
      <Dialog open={!!resolvingUser} onOpenChange={(o) => { if (!o) setResolvingUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as resolved</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add an optional note about what action was taken for{" "}
              <strong>{resolvingUser?.displayName}</strong>.
            </p>
            <Textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder="e.g. Followed up via WhatsApp on Apr 2"
              className="resize-none"
              rows={3}
              data-testid="input-resolve-note"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResolvingUser(null)}>Cancel</Button>
              <Button
                onClick={() => resolveMutation.mutate({ userId: resolvingUser!.userId, note: resolveNote })}
                disabled={resolveMutation.isPending}
                data-testid="button-confirm-resolve"
              >
                {resolveMutation.isPending ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
