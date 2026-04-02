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
import { AlertTriangle, Eye, CheckCircle2, Clock, Flag } from "lucide-react";
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

function StatusBadge({ status }: { status: WellbeingRow["alertStatus"] }) {
  if (status === "triggered") {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Triggered
      </Badge>
    );
  }
  if (status === "watching") {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 gap-1">
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

export default function AdminWellbeing() {
  const { toast } = useToast();
  const [showOnlyTriggered, setShowOnlyTriggered] = useState(true);
  const [resolvingUser, setResolvingUser] = useState<WellbeingRow | null>(null);
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
                      <StatusBadge status={row.alertStatus} />
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
