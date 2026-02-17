import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Sun,
  Moon,
  Globe, 
  TestTube,
  CheckCircle,
  XCircle,
  Info,
  BookOpen,
  Compass,
  Heart,
  Save,
  Loader2
} from "lucide-react";
import { notificationManager } from "@/lib/notifications";

interface ReminderSettings {
  reminderEnabled: boolean;
  reminderTimezone: string;
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  eveningReminderEnabled: boolean;
  eveningReminderTime: string;
}

const commonTimezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Europe/Berlin", label: "CET (Berlin)" },
  { value: "Europe/Rome", label: "CET (Rome)" },
  { value: "Europe/Madrid", label: "CET (Madrid)" },
  { value: "Europe/Amsterdam", label: "CET (Amsterdam)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Shanghai", label: "CST (Shanghai)" },
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
  { value: "America/Sao_Paulo", label: "BRT (Sao Paulo)" },
  { value: "America/Mexico_City", label: "CST (Mexico City)" },
  { value: "UTC", label: "UTC" }
];

const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      const time24 = `${hour}:${minute}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const time12 = `${hour12}:${minute.padStart(2, '0')} ${ampm}`;
      times.push({ value: time24, label: time12 });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function Settings() {
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [localSettings, setLocalSettings] = useState<ReminderSettings>({
    reminderEnabled: true,
    reminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    morningReminderEnabled: true,
    morningReminderTime: "08:00",
    eveningReminderEnabled: true,
    eveningReminderTime: "20:00",
  });
  const { toast } = useToast();

  useEffect(() => {
    setNotificationSupported(notificationManager.isNotificationSupported());
    setNotificationPermission(notificationManager.getPermissionStatus());
  }, []);

  const { data: settings, isLoading } = useQuery<ReminderSettings>({
    queryKey: ['/api/settings/reminders'],
    queryFn: async () => {
      const response = await fetch('/api/settings/reminders');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        reminderEnabled: settings.reminderEnabled ?? true,
        reminderTimezone: settings.reminderTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        morningReminderEnabled: settings.morningReminderEnabled ?? true,
        morningReminderTime: settings.morningReminderTime || "08:00",
        eveningReminderEnabled: settings.eveningReminderEnabled ?? true,
        eveningReminderTime: settings.eveningReminderTime || "20:00",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: ReminderSettings) => {
      const response = await fetch('/api/settings/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  });

  const requestNotificationPermission = async () => {
    if (!notificationSupported) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive"
      });
      return;
    }

    try {
      await notificationManager.enableNotifications();
      setNotificationPermission(notificationManager.getPermissionStatus());
      toast({
        title: "Notifications enabled!",
        description: "You'll receive daily reminders based on your settings.",
      });
    } catch (error: any) {
      setNotificationPermission(notificationManager.getPermissionStatus());
      toast({
        title: "Error",
        description: error.message || "Failed to enable notifications.",
        variant: "destructive",
      });
    }
  };

  const sendTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      toast({
        title: "Permission required",
        description: "Please enable notifications first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await notificationManager.sendTestNotification();
      toast({
        title: "Test sent!",
        description: "Check your notifications.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  const getTimeLabel = (timeValue: string) => {
    return timeOptions.find(t => t.value === timeValue)?.label || timeValue;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8" />
          Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your notification preferences</p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-5 w-5" />
              Notification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Browser Notifications</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {notificationSupported 
                    ? "Your browser supports notifications" 
                    : "Your browser doesn't support notifications"
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notificationPermission === 'granted' ? (
                  <Badge variant="default" className="gap-1" data-testid="badge-notification-status">
                    <CheckCircle className="h-3 w-3" />
                    Enabled
                  </Badge>
                ) : notificationPermission === 'denied' ? (
                  <Badge variant="destructive" className="gap-1" data-testid="badge-notification-status">
                    <XCircle className="h-3 w-3" />
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-notification-status">
                    <Info className="h-3 w-3" />
                    Not Set
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {notificationPermission !== 'granted' && (
                <Button
                  onClick={requestNotificationPermission}
                  disabled={!notificationSupported}
                  data-testid="button-enable-notifications"
                >
                  Enable Notifications
                </Button>
              )}
              {notificationPermission === 'granted' && (
                <Button
                  variant="outline"
                  onClick={sendTestNotification}
                  className="gap-2"
                  data-testid="button-test-notification"
                >
                  <TestTube className="h-4 w-4" />
                  Test Notification
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-5 w-5" />
              Timezone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Your timezone</Label>
              <Select 
                value={localSettings.reminderTimezone} 
                onValueChange={(value) => setLocalSettings(s => ({ ...s, reminderTimezone: value }))}
              >
                <SelectTrigger data-testid="select-timezone" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="h-48 overflow-y-auto">
                  {commonTimezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Enable All Reminders</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Master switch to turn all daily reminders on or off
                </p>
              </div>
              <Switch
                checked={localSettings.reminderEnabled}
                onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, reminderEnabled: checked }))}
                data-testid="switch-master-reminder"
              />
            </div>
          </CardContent>
        </Card>

        {localSettings.reminderEnabled && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sun className="h-5 w-5 text-amber-500" />
                  Morning Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">Enable morning reminder</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Get reminded to write your journal and complete your daily integration prompt
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.morningReminderEnabled}
                    onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, morningReminderEnabled: checked }))}
                    data-testid="switch-morning-reminder"
                  />
                </div>

                {localSettings.morningReminderEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm">Reminder time</Label>
                      <Select 
                        value={localSettings.morningReminderTime} 
                        onValueChange={(value) => setLocalSettings(s => ({ ...s, morningReminderTime: value }))}
                      >
                        <SelectTrigger data-testid="select-morning-time" className="w-full sm:w-48">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="h-48 overflow-y-auto">
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                      <p className="text-xs sm:text-sm font-medium">This reminder will prompt you to:</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Write your daily journal entry</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Compass className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Complete your daily integration prompt</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Moon className="h-5 w-5 text-indigo-400" />
                  Evening Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">Enable evening reminder</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Get reminded to log your daily wellbeing check-in
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.eveningReminderEnabled}
                    onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, eveningReminderEnabled: checked }))}
                    data-testid="switch-evening-reminder"
                  />
                </div>

                {localSettings.eveningReminderEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm">Reminder time</Label>
                      <Select 
                        value={localSettings.eveningReminderTime} 
                        onValueChange={(value) => setLocalSettings(s => ({ ...s, eveningReminderTime: value }))}
                      >
                        <SelectTrigger data-testid="select-evening-time" className="w-full sm:w-48">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="h-48 overflow-y-auto">
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                      <p className="text-xs sm:text-sm font-medium">This reminder will prompt you to:</p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Heart className="h-3.5 w-3.5 flex-shrink-0 text-pink-500" />
                        <span>Log your daily wellbeing by selecting how you feel</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {(localSettings.morningReminderEnabled || localSettings.eveningReminderEnabled) && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Reminder Summary</p>
                    <div className="space-y-2">
                      {localSettings.morningReminderEnabled && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Sun className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span>
                            Morning at <span className="font-medium text-foreground">{getTimeLabel(localSettings.morningReminderTime)}</span> - Journal & Integration
                          </span>
                        </div>
                      )}
                      {localSettings.eveningReminderEnabled && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Moon className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                          <span>
                            Evening at <span className="font-medium text-foreground">{getTimeLabel(localSettings.eveningReminderTime)}</span> - Wellbeing Check-in
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto gap-2"
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
