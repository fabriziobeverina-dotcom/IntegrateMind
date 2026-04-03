import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar, AVATAR_PRESETS } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { Save, Loader2, Check, Leaf } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { BadgeGrid } from "@/components/BadgeGrid";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const { data: gamification } = useGamification();

  const userData = user as any;

  useEffect(() => {
    if (userData?.avatar) {
      setSelectedAvatar(userData.avatar);
    }
  }, [userData?.avatar]);

  const displayName =
    [userData?.firstName, userData?.lastName].filter(Boolean).join(" ") ||
    userData?.username ||
    userData?.name ||
    userData?.email?.split("@")[0] ||
    "User";

  const saveMutation = useMutation({
    mutationFn: async (avatarKey: string) => {
      return apiRequest("PUT", "/api/auth/profile", { avatar: avatarKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Avatar saved", description: "Your profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save avatar.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (selectedAvatar) saveMutation.mutate(selectedAvatar);
  };

  const showGamification = gamification?.hasEarnedFirstSeeds;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Choose how you appear in the community</p>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <UserAvatar
              avatarKey={selectedAvatar}
              profileImageUrl={userData?.profileImageUrl}
              name={displayName}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              {showGamification && (
                <div className="flex items-center gap-1 mt-1" data-testid="seeds-total-display">
                  <Leaf className="w-3.5 h-3.5 text-chart-2" />
                  <span className="text-sm font-medium text-chart-2">{gamification!.seedsTotal.toLocaleString()} seeds</span>
                  <span className="text-xs text-muted-foreground ml-1 capitalize">· {gamification!.plantStage}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges — only shown after first seeds earned */}
      {showGamification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeGrid unlockedIds={gamification!.badgesUnlocked} />
          </CardContent>
        </Card>
      )}

      {/* Avatar picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose your avatar color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {AVATAR_PRESETS.map((preset) => {
              const isSelected = selectedAvatar === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.key)}
                  data-testid={`avatar-preset-${preset.key}`}
                  className={cn(
                    "relative h-10 w-10 rounded-full transition-all",
                    preset.bg,
                    isSelected
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "hover:scale-105"
                  )}
                  title={preset.key}
                >
                  {isSelected && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending || !selectedAvatar || selectedAvatar === userData?.avatar}
        className="gap-2"
        data-testid="button-save-profile"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saveMutation.isPending ? "Saving…" : "Save Avatar"}
      </Button>
    </div>
  );
}
