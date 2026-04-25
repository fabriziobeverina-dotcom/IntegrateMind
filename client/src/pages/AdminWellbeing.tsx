import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Eye, CheckCircle2, Flag, TrendingDown, BookOpen, Repeat2, ZapOff, Flame, Activity } from "lucide-react";
import { format } from "date-fns";

interface WellbeingRow {
  userId: string;
  displayName: string;
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
    "Their journal entries previously averaged 80+ words. Over the last 3 days, the average has dropped below 30 words — suggesting withdrawal or disengagement.",
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

function pulseReasons(pulse: WellbeingRow["lastPulse"], delta: number | null): string[] {
  if (!pulse) return [];
  const reasons: string[] = [];
  if (pulse.q1 === 1) reasons.push("Q1 (emotional state) answered at minimum (1/5)");
  if (pulse.q2 === 1) reasons.push("Q2 (body / grounding) answered at minimum (1/5)");
  if (pulse.q3 === 1) reasons.push("Q3 (support / connection) answered at minimum (1/5)");
  const lowCount = [pulse.q1, pulse.q2, pulse.q3].filter(q => q <= 2).length;
  if (lowCount >= 2 && pulse.q1 !== 1 && pulse.q2 !== 1 && pulse.q3 !== 1) {
    reasons.push(`${lowCount} of 3 answers were very low (≤ 2/5)`);
  }
  if (pulse.composite <= 6 && reasons.length === 0) {
    reasons.push(`Overall score very low (${pulse.composite}/15)`);
  }
  if (delta !== null && delta <= -5) {
    reasons.push(`Sharp decline of ${Math.abs(delta)} points from previous check-in`);
  }
  return reasons;
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
  if (!row) return null;
  const pulse = row.lastPulse;
  const reasons = pulseReasons(pulse, row.scoreDelta);
  const flags = Array.isArray(row.flags) ? (row.flags as Array<{ name: string; setAt: string }>) : [];
  const hasJournalFlags = flags.length > 0;
  const hasPulseAlert = reasons.length > 0;

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="dialog-flag-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Flag report — {row.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Alert summary */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <StatusBadge status={row.alertStatus} />
              {row.alertTriggeredAt && (
                <span className="text-xs text-muted-foreground">
                  Since {format(new Date(row.alertTriggeredAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              The reasons detected are listed below. This view is only visible to facilitators.
            </p>
          </div>

          {/* Pulse check findings */}
          {pulse && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" />
                Pulse check score
              </div>
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

              {row.scoreDelta !== null && (
                <p className="text-xs text-muted-foreground">
                  Change from previous check-in:{" "}
                  <span className={row.scoreDelta <= -5 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                    {row.scoreDelta > 0 ? "+" : ""}{row.scoreDelta} points
                  </span>
                </p>
              )}

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
          {hasJournalFlags && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Flag className="h-4 w-4 text-amber-500" />
                Journal behaviour signals
              </div>
              <div className="space-y-2">
                {flags.map((f) => {
                  const Icon = FLAG_ICONS[f.name] ?? Flag;
                  return (
                    <div key={f.name} className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 px-3 py-2.5 space-y-1">
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

          {/* Journal activity */}
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

          {/* Facilitator note if present */}
          {row.facilitatorNote && (
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Previous facilitator note</p>
              <p className="text-xs italic">{row.facilitatorNote}</p>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={onClose}>
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
                  {/* Name + status */}
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

                    {/* Metrics row */}
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

                    {/* Active flags */}
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

                    {/* Facilitator note */}
                    {row.facilitatorNote && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        Note: {row.facilitatorNote}
                      </p>
                    )}
                  </div>

                  {/* Action */}
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
      <FlagReportDialog row={reportUser} onClose={() => setReportUser(null)} />

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
              <Button variant="outline" onClick={() => setResolvingUser(null)}>
                Cancel
              </Button>
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
