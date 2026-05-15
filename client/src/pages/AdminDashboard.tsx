import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon, BookIcon, VideoIcon, ActivityIcon, BarChart3, MessageCircle, Save, Bell, BellOff, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { subscribeToPush, unsubscribeFromPush, isPushSupported, getPushSubscriptionStatus } from "@/lib/push";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.isAdmin;

  const { data: practices = [] } = useQuery({
    queryKey: ['/api/admin/practices'],
    enabled: isAdmin,
  }) as { data: any[] };

  const { data: readings = [] } = useQuery({
    queryKey: ['/api/admin/readings'],
    enabled: isAdmin,
  }) as { data: any[] };

  const { data: videos = [] } = useQuery({
    queryKey: ['/api/admin/videos'],
    enabled: isAdmin,
  }) as { data: any[] };

  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/site-settings'],
    enabled: isAdmin,
  });

  const [whatsappInput, setWhatsappInput] = useState<string | null>(null);
  const whatsappValue = whatsappInput !== null ? whatsappInput : (siteSettings['whatsapp_number'] ?? '');

  const [cateWhatsappInput, setCateWhatsappInput] = useState<string | null>(null);
  const cateWhatsappValue = cateWhatsappInput !== null ? cateWhatsappInput : (siteSettings['cate_whatsapp_number'] ?? '');

  const [tomiWhatsappInput, setTomiWhatsappInput] = useState<string | null>(null);
  const tomiWhatsappValue = tomiWhatsappInput !== null ? tomiWhatsappInput : (siteSettings['tomi_whatsapp_number'] ?? '');

  const [dominicWhatsappInput, setDominicWhatsappInput] = useState<string | null>(null);
  const dominicWhatsappValue = dominicWhatsappInput !== null ? dominicWhatsappInput : (siteSettings['tarot_whatsapp_number'] ?? '');

  // Push notification state for wellbeing alerts
  type PushState = 'checking' | 'unsupported' | 'blocked' | 'enabled' | 'disabled';
  const [pushState, setPushState] = useState<PushState>('checking');
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    async function detectPushState() {
      if (!isPushSupported()) { setPushState('unsupported'); return; }
      const permission = await getPushSubscriptionStatus();
      if (permission === 'denied') { setPushState('blocked'); return; }
      // Check if there's an active SW subscription
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setPushState(sub ? 'enabled' : 'disabled');
      } catch {
        setPushState('disabled');
      }
    }
    detectPushState();
  }, []);

  async function handleEnableAlerts() {
    setPushLoading(true);
    const ok = await subscribeToPush();
    setPushLoading(false);
    if (ok) {
      setPushState('enabled');
      toast({ title: "Alerts enabled", description: "You'll receive a daily notification when red flags are detected." });
    } else {
      toast({ title: "Could not enable alerts", description: "Please allow notifications in your browser settings, then try again.", variant: "destructive" });
      setPushState('blocked');
    }
  }

  async function handleDisableAlerts() {
    setPushLoading(true);
    await unsubscribeFromPush();
    setPushLoading(false);
    setPushState('disabled');
    toast({ title: "Alerts disabled", description: "You will no longer receive wellbeing alert notifications." });
  }

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      return apiRequest('PUT', '/api/admin/site-settings', updates);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
      if ('whatsapp_number' in variables) setWhatsappInput(null);
      if ('cate_whatsapp_number' in variables) setCateWhatsappInput(null);
      if ('tomi_whatsapp_number' in variables) setTomiWhatsappInput(null);
      if ('tarot_whatsapp_number' in variables) setDominicWhatsappInput(null);
      toast({ title: "Settings saved", description: "Site settings updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
          <Link href="/">
            <Button className="mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage content and monitor platform activity</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Practices</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-practices-count">{practices.length}</div>
            <p className="text-xs text-muted-foreground">Meditation & wellness practices</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <BookIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-readings-count">{readings.length}</div>
            <p className="text-xs text-muted-foreground">Articles & educational content</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <VideoIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-videos-count">{videos.length}</div>
            <p className="text-xs text-muted-foreground">Educational videos & workshops</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Meditation Practices
            </CardTitle>
            <CardDescription>
              Manage guided meditation and wellness practices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active practices</span>
              <Badge variant="secondary">{practices.length}</Badge>
            </div>
            <div className="space-y-2">
              <Link href="/admin/practices">
                <Button className="w-full" data-testid="button-manage-practices">
                  <ActivityIcon className="h-4 w-4 mr-2" />
                  Manage Practices
                </Button>
              </Link>
              <Link href="/practices/create">
                <Button variant="outline" className="w-full" data-testid="button-create-practice">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Practice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookIcon className="h-5 w-5" />
              Reading Library
            </CardTitle>
            <CardDescription>
              Curate articles and educational reading materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Published readings</span>
              <Badge variant="secondary">{readings.length}</Badge>
            </div>
            <div className="space-y-2">
              <Link href="/admin/readings">
                <Button className="w-full" data-testid="button-manage-readings">
                  <BookIcon className="h-4 w-4 mr-2" />
                  Manage Readings
                </Button>
              </Link>
              <Link href="/readings/create">
                <Button variant="outline" className="w-full" data-testid="button-create-reading">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Reading
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              Video Library
            </CardTitle>
            <CardDescription>
              Manage educational videos and workshop content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Published videos</span>
              <Badge variant="secondary">{videos.length}</Badge>
            </div>
            <div className="space-y-2">
              <Link href="/admin/videos">
                <Button className="w-full" data-testid="button-manage-videos">
                  <VideoIcon className="h-4 w-4 mr-2" />
                  Manage Videos
                </Button>
              </Link>
              <Link href="/videos/create">
                <Button variant="outline" className="w-full" data-testid="button-create-video">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Video
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Overview
          </CardTitle>
          <CardDescription>
            Monitor content engagement and user activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Content Distribution</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Meditation Practices</span>
                  <span className="text-muted-foreground">{practices.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Educational Readings</span>
                  <span className="text-muted-foreground">{readings.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Video Content</span>
                  <span className="text-muted-foreground">{videos.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Content Status</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Premium Content</span>
                  <span className="text-muted-foreground">
                    {[...practices, ...readings, ...videos].filter((item: any) => item.isPremium).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Featured Content</span>
                  <span className="text-muted-foreground">
                    {[...practices, ...readings, ...videos].filter((item: any) => item.isFeatured).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Items</span>
                  <span className="text-muted-foreground">
                    {practices.length + readings.length + videos.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Site Settings
          </CardTitle>
          <CardDescription>
            Configure platform-wide settings visible to all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Enter WhatsApp numbers for each practitioner. Leave a field empty to hide that person's button from the dashboard.
          </p>

          {/* Psychological Integration — Eva */}
          <div className="space-y-3">
            <Label htmlFor="input-whatsapp-eva">Eva — Psychological Integration</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="input-whatsapp-eva"
                data-testid="input-whatsapp-number"
                placeholder="15551234567"
                value={whatsappValue}
                onChange={(e) => setWhatsappInput(e.target.value)}
                className="max-w-xs"
              />
              <Button
                data-testid="button-save-whatsapp"
                disabled={updateSettingsMutation.isPending}
                onClick={() => updateSettingsMutation.mutate({ whatsapp_number: whatsappValue })}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {whatsappValue && (
              <p className="text-xs text-muted-foreground font-mono">https://wa.me/{whatsappValue.replace(/[^0-9]/g, '')}</p>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Breathwork — Caterina */}
          <div className="space-y-3">
            <Label htmlFor="input-whatsapp-cate">Caterina — Breathwork Integration</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="input-whatsapp-cate"
                data-testid="input-whatsapp-cate"
                placeholder="15551234567"
                value={cateWhatsappValue}
                onChange={(e) => setCateWhatsappInput(e.target.value)}
                className="max-w-xs"
              />
              <Button
                data-testid="button-save-cate-whatsapp"
                disabled={updateSettingsMutation.isPending}
                onClick={() => updateSettingsMutation.mutate({ cate_whatsapp_number: cateWhatsappValue })}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {cateWhatsappValue && (
              <p className="text-xs text-muted-foreground font-mono">https://wa.me/{cateWhatsappValue.replace(/[^0-9]/g, '')}</p>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Breathwork — Tomi */}
          <div className="space-y-3">
            <Label htmlFor="input-whatsapp-tomi">Tomi — Breathwork Integration</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="input-whatsapp-tomi"
                data-testid="input-whatsapp-tomi"
                placeholder="15551234567"
                value={tomiWhatsappValue}
                onChange={(e) => setTomiWhatsappInput(e.target.value)}
                className="max-w-xs"
              />
              <Button
                data-testid="button-save-tomi-whatsapp"
                disabled={updateSettingsMutation.isPending}
                onClick={() => updateSettingsMutation.mutate({ tomi_whatsapp_number: tomiWhatsappValue })}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {tomiWhatsappValue && (
              <p className="text-xs text-muted-foreground font-mono">https://wa.me/{tomiWhatsappValue.replace(/[^0-9]/g, '')}</p>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Wellbeing alert notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <Label>Wellbeing Alert Notifications</Label>
              {pushState === 'enabled' && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-alerts-status">Active</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Receive a daily push notification on this device whenever one or more users have an active red flag. No notification is sent if everyone is clear.
            </p>

            {pushState === 'checking' && (
              <p className="text-sm text-muted-foreground">Checking notification status…</p>
            )}

            {pushState === 'unsupported' && (
              <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
            )}

            {pushState === 'blocked' && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
                <BellOff className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  Notifications are blocked in your browser. Open your browser's site settings and allow notifications for this site, then refresh the page.
                </p>
              </div>
            )}

            {pushState === 'disabled' && (
              <Button
                data-testid="button-enable-wellbeing-alerts"
                onClick={handleEnableAlerts}
                disabled={pushLoading}
                variant="outline"
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                {pushLoading ? "Enabling…" : "Enable alerts on this device"}
              </Button>
            )}

            {pushState === 'enabled' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bell className="h-4 w-4 text-green-600" />
                  Alerts are active on this device
                </div>
                <Button
                  data-testid="button-disable-wellbeing-alerts"
                  onClick={handleDisableAlerts}
                  disabled={pushLoading}
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                >
                  <BellOff className="h-4 w-4" />
                  {pushLoading ? "Disabling…" : "Disable"}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Tarot & Spiritual Integration — Dominic */}
          <div className="space-y-3">
            <Label htmlFor="input-whatsapp-dominic">Dominic — Tarot & Spiritual Integration</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="input-whatsapp-dominic"
                data-testid="input-tarot-whatsapp-number"
                placeholder="15551234567"
                value={dominicWhatsappValue}
                onChange={(e) => setDominicWhatsappInput(e.target.value)}
                className="max-w-xs"
              />
              <Button
                data-testid="button-save-tarot-whatsapp"
                disabled={updateSettingsMutation.isPending}
                onClick={() => updateSettingsMutation.mutate({ tarot_whatsapp_number: dominicWhatsappValue })}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {dominicWhatsappValue && (
              <p className="text-xs text-muted-foreground font-mono">https://wa.me/{dominicWhatsappValue.replace(/[^0-9]/g, '')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
