import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UserRecord {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  isAdmin: boolean;
  createdAt: string | null;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/analytics/users"],
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { isAdmin });
      return res.json();
    },
    onSuccess: (updated: UserRecord) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] });
      toast({
        title: updated.isAdmin ? "Admin access granted" : "Admin access removed",
        description: `${updated.email || updated.username || updated.id} is ${updated.isAdmin ? "now an admin" : "no longer an admin"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  const displayName = (u: UserRecord) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Grant or remove administrator access for any user.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((u) => {
              const isCurrentUser = u.id === (currentUser as any)?.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                  data-testid={`row-user-${u.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" data-testid={`text-username-${u.id}`}>
                      {displayName(u)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" data-testid={`text-email-${u.id}`}>
                      {u.email || "No email"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {u.isAdmin && (
                      <Badge data-testid={`badge-admin-${u.id}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={u.isAdmin ? "outline" : "default"}
                      disabled={isCurrentUser || toggleAdminMutation.isPending}
                      onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                      data-testid={`button-toggle-admin-${u.id}`}
                    >
                      {u.isAdmin ? (
                        <>
                          <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5 mr-1.5" />
                          Make Admin
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
