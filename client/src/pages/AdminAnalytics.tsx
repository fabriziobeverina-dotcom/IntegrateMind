import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Activity, Target, TrendingUp, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalJournalEntries: number;
  totalPracticeCompletions: number;
  totalPromptCompletions: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  isAdmin: boolean;
}

interface UserAnalytics {
  user: UserData;
  stats: {
    journalCount: number;
    practiceCompletions: number;
    promptCompletions: number;
    totalPoints: number;
    journalStreak: number;
    practiceStreak: number;
    wellbeingCheckins: number;
    avgWellbeing: number;
  };
}

export default function AdminAnalytics() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: platformStats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/analytics/stats'],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ['/api/admin/analytics/users'],
  });

  const { data: userAnalytics, isLoading: analyticsLoading } = useQuery<UserAnalytics>({
    queryKey: ['/api/admin/analytics/users', selectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/users/${selectedUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user analytics');
      return response.json();
    },
    enabled: !!selectedUserId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze user engagement and platform activity
        </p>
      </div>

      {/* Platform Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {statsLoading ? '...' : platformStats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-users">
              {statsLoading ? '...' : platformStats?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-journal-entries">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-journal-entries">
              {statsLoading ? '...' : platformStats?.totalJournalEntries || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-practice-completions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Completions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-practice-completions">
              {statsLoading ? '...' : platformStats?.totalPracticeCompletions || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-prompt-completions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prompt Completions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-prompt-completions">
              {statsLoading ? '...' : platformStats?.totalPromptCompletions || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View detailed analytics for each user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.name || user.email.split('@')[0]}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="default" data-testid={`badge-admin-${user.id}`}>Admin</Badge>
                      ) : (
                        <Badge variant="outline" data-testid={`badge-user-${user.id}`}>User</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                        data-testid={`button-view-analytics-${user.id}`}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Analytics Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-user-analytics">
          <DialogHeader>
            <DialogTitle>User Analytics</DialogTitle>
            <DialogDescription>
              Detailed activity and engagement metrics
            </DialogDescription>
          </DialogHeader>
          
          {analyticsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading analytics...
            </div>
          ) : userAnalytics ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg" data-testid="text-analytics-user-name">
                  {userAnalytics.user.firstName && userAnalytics.user.lastName
                    ? `${userAnalytics.user.firstName} ${userAnalytics.user.lastName}`
                    : userAnalytics.user.name}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-analytics-user-email">
                  {userAnalytics.user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Joined {formatDate(userAnalytics.user.createdAt)}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-user-journal-count">
                      {userAnalytics.stats.journalCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Streak: {userAnalytics.stats.journalStreak} days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Practice Completions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-user-practice-count">
                      {userAnalytics.stats.practiceCompletions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Streak: {userAnalytics.stats.practiceStreak} days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Integration Prompts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-user-prompt-count">
                      {userAnalytics.stats.promptCompletions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Wellbeing Check-Ins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-user-wellbeing-count">
                      {userAnalytics.stats.wellbeingCheckins}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: {userAnalytics.stats.avgWellbeing > 0 ? userAnalytics.stats.avgWellbeing.toFixed(1) : 'N/A'} / 5
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-user-total-points">
                      {userAnalytics.stats.totalPoints}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Earned
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
