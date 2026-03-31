import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, BookOpen, Activity, Target, TrendingUp, User,
  Flame, Brain, Palette, MessageSquare, Moon, Heart, Download,
} from "lucide-react";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalJournalEntries: number;
  totalPracticeCompletions: number;
  totalPromptCompletions: number;
}

interface UserData {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  createdAt: string | null;
  isAdmin: boolean;
}

interface UserStats {
  journalCount: number;
  practiceCompletions: number;
  promptCompletions: number;
  wellbeingCheckins: number;
  dreamEntries: number;
  creativeExpressions: number;
  communityPosts: number;
  totalPoints: number;
  journalStreak: number;
  practiceStreak: number;
  avgWellbeing: number;
}

interface UserAnalytics {
  user: UserData;
  stats: UserStats;
}

const FEATURES: { key: keyof UserStats; label: string; icon: any; color: string }[] = [
  { key: "journalCount",          label: "Journal",             icon: BookOpen,      color: "bg-blue-500" },
  { key: "practiceCompletions",   label: "Practices",           icon: Activity,      color: "bg-green-500" },
  { key: "promptCompletions",     label: "Integration Prompts", icon: Target,        color: "bg-purple-500" },
  { key: "wellbeingCheckins",     label: "Wellbeing Check-ins", icon: Heart,         color: "bg-red-400" },
  { key: "dreamEntries",          label: "Dream Journal",       icon: Moon,          color: "bg-indigo-500" },
  { key: "creativeExpressions",   label: "Creative Expression", icon: Palette,       color: "bg-amber-500" },
  { key: "communityPosts",        label: "Community Posts",     icon: MessageSquare, color: "bg-teal-500" },
];

function displayName(u: UserData) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email?.split("@")[0] || u.id;
}

function totalActivity(stats: UserStats) {
  return FEATURES.reduce((sum, f) => sum + (stats[f.key] as number), 0);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminAnalytics() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: platformStats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/analytics/stats"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/analytics/users"],
  });

  const { data: userAnalytics, isLoading: analyticsLoading } = useQuery<UserAnalytics>({
    queryKey: ["/api/admin/analytics/users", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/users/${selectedUserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user analytics");
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform activity and per-user feature usage breakdown</p>
        </div>
        <Button
          variant="outline"
          data-testid="button-export-csv"
          onClick={() => {
            const a = document.createElement('a');
            a.href = '/api/admin/export/users';
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Users",           value: platformStats?.totalUsers,             icon: Users },
          { label: "Active (30d)",          value: platformStats?.activeUsers,            icon: TrendingUp },
          { label: "Journal Entries",       value: platformStats?.totalJournalEntries,    icon: BookOpen },
          { label: "Practice Completions",  value: platformStats?.totalPracticeCompletions, icon: Activity },
          { label: "Prompt Completions",    value: platformStats?.totalPromptCompletions, icon: Target },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{statsLoading ? "—" : (value ?? 0)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No users yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="text-right">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedUserId(u.id)}
                    data-testid={`row-user-${u.id}`}
                  >
                    <TableCell>
                      <div className="font-medium">{displayName(u)}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.isAdmin ? (
                        <Badge data-testid={`badge-admin-${u.id}`}>Admin</Badge>
                      ) : (
                        <Badge variant="outline" data-testid={`badge-user-${u.id}`}>User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.id); }}
                        data-testid={`button-view-analytics-${u.id}`}
                      >
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-user-analytics">
          <DialogHeader>
            <DialogTitle>
              {userAnalytics ? displayName(userAnalytics.user) : "User Activity"}
            </DialogTitle>
            {userAnalytics && (
              <p className="text-sm text-muted-foreground">{userAnalytics.user.email}</p>
            )}
          </DialogHeader>

          {analyticsLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : userAnalytics ? (
            <div className="space-y-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xl font-bold">{totalActivity(userAnalytics.stats)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Total actions</div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xl font-bold flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {Math.max(userAnalytics.stats.journalStreak, userAnalytics.stats.practiceStreak)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Best streak</div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xl font-bold flex items-center justify-center gap-1">
                    <Brain className="h-4 w-4 text-primary" />
                    {userAnalytics.stats.totalPoints}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Points earned</div>
                </div>
              </div>

              {/* Feature breakdown with percentage bars */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Feature usage breakdown</p>
                {(() => {
                  const total = totalActivity(userAnalytics.stats);
                  return FEATURES.map(({ key, label, icon: Icon, color }) => {
                    const count = userAnalytics.stats[key] as number;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1" data-testid={`feature-bar-${key}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {label}
                          </span>
                          <span className="text-muted-foreground">
                            {count} <span className="text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
                {totalActivity(userAnalytics.stats) === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No activity recorded yet</p>
                )}
              </div>

              {/* Wellbeing */}
              {userAnalytics.stats.avgWellbeing > 0 && (
                <div className="rounded-md bg-muted p-3 flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-red-400" />
                    Avg. wellbeing score
                  </span>
                  <span className="font-semibold">{userAnalytics.stats.avgWellbeing.toFixed(1)} / 5</span>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
