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
  Brain, Loader2, ChevronDown, ChevronUp, Copy, BarChart2, Bell,
} from "lucide-react";
import { format } from "date-fns";

interface PulseRecord {
  date: string;
  q1: number;
  q2: number;
  q3: number;
  composite: number;
}

interface FlagStats {
  journaling_dropout?: { previousWeekCount: number; daysWithout: number | null };
  entry_length_collapse?: { prevAvgWords: number | null; recentAvgWords: number | null; entriesAnalyzed: number };
  obsessive_repetition?: { dominantWord: string; relatedForms: string[]; pct: number; occurrences: number; totalWords: number; entriesAnalyzed: number };
  streak_break?: { streakLength: number };
  sustained_low_mood?: { checkins: Array<{ date: string; q1: number; q2: number; q3: number; composite: number }>; avgComposite: number };
}

interface WellbeingRow {
  userId: string;
  displayName: string;
  email: string | null;
  daysSinceJournal: number | null;
  lastPulse: PulseRecord | null;
  scoreDelta: number | null;
  recentPulseHistory: PulseRecord[];
  flags: Array<{ name: string; setAt: string }>;
  flagStats: FlagStats;
  alertStatus: "none" | "watching" | "triggered" | "resolved";
  alertTriggeredAt: string | null;
  alertResolvedAt: string | null;
  facilitatorNote: string | null;
  resolveNote: string | null;
  resolvedByName: string | null;
}

// ─── "New flag" tracking via localStorage ──────────────────────────────────────
const SEEN_KEY = "ic_admin_wellbeing_seen";

function getSeenMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}"); } catch { return {}; }
}

function markAsSeen(userId: string) {
  const map = getSeenMap();
  map[userId] = new Date().toISOString();
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
}

function isNewFlag(row: WellbeingRow): boolean {
  if (!row.alertTriggeredAt) return false;
  if (row.alertStatus !== "triggered" && row.alertStatus !== "watching") return false;
  const seen = getSeenMap()[row.userId];
  if (!seen) return true;
  return new Date(row.alertTriggeredAt) > new Date(seen);
}

const FLAG_LABELS: Record<string, string> = {
  journaling_dropout: "Journal dropout",
  entry_length_collapse: "Entry length drop",
  obsessive_repetition: "Repetitive themes",
  streak_break: "Streak broken",
  sustained_low_mood: "Sustained low mood",
};

function getFlagDescription(flagName: string, stats: FlagStats): string {
  if (flagName === 'journaling_dropout') {
    const s = stats.journaling_dropout;
    if (s) {
      const daysStr = s.daysWithout != null ? `${s.daysWithout} consecutive day${s.daysWithout === 1 ? '' : 's'}` : 'several days';
      return `They wrote at least ${s.previousWeekCount} journal entries in the prior week, then stopped entirely for ${daysStr}. Our system flags this when a previously active journaller suddenly goes quiet for 4 or more days in a row.`;
    }
    return "This person was journaling 3 or more times in the previous week, then stopped completely for 4 or more consecutive days — a significant behavioral change.";
  }
  if (flagName === 'entry_length_collapse') {
    const s = stats.entry_length_collapse;
    if (s && s.prevAvgWords != null && s.recentAvgWords != null) {
      const drop = s.prevAvgWords - s.recentAvgWords;
      return `Their journal entries averaged ${s.prevAvgWords} words in the previous week. Over the most recent ${s.entriesAnalyzed} ${s.entriesAnalyzed === 1 ? 'day' : 'days'} that dropped to an average of ${s.recentAvgWords} words — a reduction of ${drop} words (${Math.round((drop / s.prevAvgWords) * 100)}%). We flag this when entries collapse below 30 words after previously averaging 80 or more, as it often signals withdrawal or emotional shutdown.`;
    }
    return "Their journal entries previously averaged 80+ words. Over the last 3 days the average has dropped below 30 words — suggesting withdrawal or disengagement.";
  }
  if (flagName === 'obsessive_repetition') {
    const s = stats.obsessive_repetition;
    if (s) {
      const formsStr = s.relatedForms.length > 1 ? ` (and related forms: ${s.relatedForms.slice(1).join(', ')})` : '';
      return `The word "${s.dominantWord}"${formsStr} appears ${s.occurrences} times across their last ${s.entriesAnalyzed} journal entries — accounting for ${s.pct}% of all meaningful words. Our threshold is 40%. This level of repetition can indicate a looping thought pattern or unresolved fixation on a particular experience or concern.`;
    }
    return "One word or theme dominates more than 40% of content across their last 5 journal entries — a possible sign of fixation or looping thought patterns.";
  }
  if (flagName === 'streak_break') {
    const s = stats.streak_break;
    if (s) {
      return `They had maintained a journaling streak of ${s.streakLength} consecutive day${s.streakLength === 1 ? '' : 's'} and then stopped today. While a missed day is not always significant, breaking a streak of this length after consistent daily engagement is worth noting — particularly during an active integration phase.`;
    }
    return "They maintained a journaling streak of 7 or more consecutive days, then missed today — breaking an established pattern of engagement.";
  }
  if (flagName === 'sustained_low_mood') {
    const s = stats.sustained_low_mood;
    if (s) {
      return `Their last ${s.checkins.length} pulse check-ins have all scored ${s.avgComposite}/15 on average — consistently at or below the midpoint across emotional, body, and connection dimensions. No single check-in reached crisis level, but the sustained pattern across multiple weeks is a signal worth responding to. This differs from an acute crisis: it suggests a slow, ongoing struggle rather than a sudden drop.`;
    }
    return "Their last 3 or more pulse check-ins have all scored 9/15 or below — consistently low across emotional, physical, and connection dimensions without ever hitting the acute crisis threshold. This sustained pattern indicates ongoing difficulty that warrants a facilitator check-in.";
  }
  return "Unusual pattern detected in journal behaviour.";
}

const FLAG_ICONS: Record<string, typeof Flag> = {
  journaling_dropout: BookOpen,
  entry_length_collapse: TrendingDown,
  obsessive_repetition: Repeat2,
  streak_break: Flame,
  sustained_low_mood: BarChart2,
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
  const flagStats = (row as any).flagStats as FlagStats ?? {};
  for (const flag of flags) {
    parts.push(getFlagDescription(flag.name, flagStats));
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

interface AiAnalysis {
  report: string;
  emailDraft: string;
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
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiReport, setShowAiReport] = useState(true);
  const [showAiEmail, setShowAiEmail] = useState(false);

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

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch(`/api/admin/wellbeing/${row.userId}/ai-analysis`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Analysis failed");
      }
      const data = await res.json();
      setAiAnalysis(data);
      setShowAiReport(true);
      setShowAiEmail(false);
    } catch (e: any) {
      toast({ title: "AI analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleEmail = (draft?: string) => {
    const subject = encodeURIComponent(`Checking in — Integration Compass`);
    const body = encodeURIComponent(draft ?? buildEmailBody(row));
    const to = row.email ?? "";
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
                  const stats = row.flagStats ?? {};
                  return (
                    <div
                      key={f.name}
                      className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 px-3 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-semibold">{FLAG_LABELS[f.name] ?? f.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Detected {format(new Date(f.setAt), "MMM d, yyyy")}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {getFlagDescription(f.name, stats)}
                      </p>

                      {/* Inline stat callout for entry length collapse */}
                      {f.name === 'entry_length_collapse' && stats.entry_length_collapse?.prevAvgWords != null && stats.entry_length_collapse?.recentAvgWords != null && (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="rounded bg-muted/50 px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-muted-foreground">Previous avg</p>
                            <p className="text-sm font-semibold">{stats.entry_length_collapse.prevAvgWords} <span className="text-[10px] font-normal text-muted-foreground">words</span></p>
                          </div>
                          <div className="rounded bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-muted-foreground">Recent avg</p>
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{stats.entry_length_collapse.recentAvgWords} <span className="text-[10px] font-normal text-muted-foreground">words</span></p>
                          </div>
                        </div>
                      )}

                      {/* Inline stat callout for obsessive repetition */}
                      {f.name === 'obsessive_repetition' && stats.obsessive_repetition && (
                        <div className="rounded bg-muted/50 px-2.5 py-2 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">Dominant word</p>
                            <p className="text-xs font-semibold">"{stats.obsessive_repetition.dominantWord}"</p>
                            {stats.obsessive_repetition.relatedForms.length > 1 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Also: {stats.obsessive_repetition.relatedForms.slice(1).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Share of content</p>
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{stats.obsessive_repetition.pct}%</p>
                            <p className="text-[10px] text-muted-foreground">{stats.obsessive_repetition.occurrences} of {stats.obsessive_repetition.totalWords} words</p>
                          </div>
                        </div>
                      )}

                      {/* Inline stat callout for streak break */}
                      {f.name === 'streak_break' && stats.streak_break && (
                        <div className="rounded bg-muted/50 px-2.5 py-1.5 flex items-center gap-2">
                          <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Streak was <span className="font-semibold text-foreground">{stats.streak_break.streakLength} days</span> before it broke
                          </p>
                        </div>
                      )}

                      {/* Inline stat callout for journaling dropout */}
                      {f.name === 'journaling_dropout' && stats.journaling_dropout && (
                        <div className="rounded bg-muted/50 px-2.5 py-1.5 flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{stats.journaling_dropout.previousWeekCount} entries</span> the week before, then silent for <span className="font-semibold text-foreground">{stats.journaling_dropout.daysWithout ?? '4+'} days</span>
                          </p>
                        </div>
                      )}

                      {/* Inline stat callout for sustained low mood */}
                      {f.name === 'sustained_low_mood' && stats.sustained_low_mood && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stats.sustained_low_mood.checkins.length}, minmax(0, 1fr))` }}>
                            {stats.sustained_low_mood.checkins.map((c, i) => (
                              <div key={i} className="rounded bg-muted/50 px-2 py-1.5 text-center">
                                <p className="text-[10px] text-muted-foreground">{format(new Date(c.date), "MMM d")}</p>
                                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{c.composite}<span className="text-[10px] font-normal text-muted-foreground">/15</span></p>
                                <p className="text-[10px] text-muted-foreground">{c.q1}·{c.q2}·{c.q3}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">
                            Average: <span className="font-semibold">{stats.sustained_low_mood.avgComposite}/15</span> across these check-ins (threshold: 9/15)
                          </p>
                        </div>
                      )}
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

          {/* AI Analysis section */}
          <div className="rounded-lg border px-3 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  AI Analysis
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generate a facilitator report and personalised email draft based on this participant's journal, prompts, and pulse data.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunAiAnalysis}
                disabled={aiLoading}
                data-testid="button-ai-analysis"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Brain className="h-3.5 w-3.5 mr-1.5" />
                )}
                {aiLoading ? "Analysing…" : aiAnalysis ? "Re-analyse" : "Run analysis"}
              </Button>
            </div>

            {aiAnalysis && (
              <div className="space-y-2">
                {/* Report section */}
                <button
                  className="w-full flex items-center justify-between text-xs font-medium py-1 text-left"
                  onClick={() => setShowAiReport(v => !v)}
                  data-testid="toggle-ai-report"
                >
                  <span>Facilitator report</span>
                  {showAiReport ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showAiReport && (
                  <div className="rounded-md bg-muted/40 px-3 py-2.5">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" data-testid="text-ai-report">{aiAnalysis.report}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 w-full text-xs text-muted-foreground"
                      onClick={() => { navigator.clipboard.writeText(aiAnalysis.report); toast({ title: "Report copied" }); }}
                      data-testid="button-copy-ai-report"
                    >
                      <Copy className="h-3 w-3 mr-1.5" />
                      Copy report
                    </Button>
                  </div>
                )}

                {/* AI email draft section */}
                <button
                  className="w-full flex items-center justify-between text-xs font-medium py-1 text-left"
                  onClick={() => setShowAiEmail(v => !v)}
                  data-testid="toggle-ai-email"
                >
                  <span>AI email draft</span>
                  {showAiEmail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showAiEmail && (
                  <div className="space-y-1.5">
                    <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded-md px-3 py-2.5 leading-relaxed font-sans" data-testid="text-ai-email">{aiAnalysis.emailDraft}</pre>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { navigator.clipboard.writeText(aiAnalysis.emailDraft); toast({ title: "Email draft copied" }); }}
                        data-testid="button-copy-ai-email"
                      >
                        <Copy className="h-3 w-3 mr-1.5" />
                        Copy draft
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEmail(aiAnalysis.emailDraft)}
                        disabled={!row.email}
                        data-testid="button-open-ai-email"
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Open in mail
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Standard email section */}
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
                onClick={() => handleEmail()}
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
                    onClick={() => { navigator.clipboard.writeText(buildEmailBody(row)); }}
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
  // Force re-render after marking seen (so badge disappears without re-fetch)
  const [, forceUpdate] = useState(0);

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

  function openReport(row: WellbeingRow) {
    markAsSeen(row.userId);
    forceUpdate(n => n + 1);
    setReportUser(row);
  }

  const filtered = showOnlyTriggered
    ? rows.filter(r => r.alertStatus === "triggered" || r.alertStatus === "watching")
    : rows;

  const newFlagCount = rows.filter(r => isNewFlag(r)).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Participant Wellbeing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Behavioral signals and check-in data. All information is confidential.
        </p>
      </div>

      {/* New flags banner */}
      {!isLoading && newFlagCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50"
          data-testid="banner-new-flags"
        >
          <Bell className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            {newFlagCount === 1
              ? "1 new red flag has appeared since your last visit."
              : `${newFlagCount} new red flags have appeared since your last visit.`}
          </p>
        </div>
      )}

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
          {filtered.map((row) => {
            const isNew = isNewFlag(row);
            return (
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
                        onClick={() => (row.alertStatus === "triggered" || row.alertStatus === "watching") && openReport(row)}
                      />
                      {isNew && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white"
                          data-testid={`badge-new-flag-${row.userId}`}
                        >
                          <Bell className="h-2.5 w-2.5" />
                          NEW
                        </span>
                      )}
                      {(row.alertStatus === "triggered" || row.alertStatus === "watching") && (
                        <button
                          className="text-[10px] text-muted-foreground underline underline-offset-2"
                          onClick={() => openReport(row)}
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

                    {row.alertStatus === "resolved" && row.resolveNote && (
                      <div
                        className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"
                        data-testid={`resolve-note-${row.userId}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                        <span>
                          <span className="font-medium text-foreground">
                            {row.resolvedByName ?? "Admin"}
                          </span>
                          {row.alertResolvedAt && (
                            <span className="text-muted-foreground">
                              {" "}on {format(new Date(row.alertResolvedAt), "MMM d")}
                            </span>
                          )}
                          {": "}
                          {row.resolveNote}
                        </span>
                      </div>
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
          ); })}
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
              Describe what action was taken for{" "}
              <strong>{resolvingUser?.displayName}</strong>. This note will be
              visible to all administrators.
            </p>
            <Textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder="e.g. Followed up via WhatsApp — participant feeling better"
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
