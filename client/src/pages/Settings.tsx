import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Clock, 
  Globe, 
  BookOpen, 
  BarChart3, 
  Calendar,
  TestTube,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { notificationManager } from "@/lib/notifications";

const reminderSettingsSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderTime: z.string(),
  reminderTimezone: z.string(),
  reminderTypes: z.array(z.string())
});

type ReminderSettingsFormData = z.infer<typeof reminderSettingsSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderTimezone: string;
  reminderTypes: string[];
}

// Common timezones for easier selection
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
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Shanghai", label: "CST (Shanghai)" },
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" }
];

const reminderTypeOptions = [
  {
    value: "journal",
    label: "Journal Reminders",
    description: "Daily prompts to write in your journal",
    icon: BookOpen
  },
  {
    value: "progress",
    label: "Progress Tracking",
    description: "Reminders to track your daily mood, sleep, and grounding",
    icon: BarChart3
  },
  {
    value: "practice",
    label: "Daily Practice",
    description: "Reminders to complete your daily meditation or mindfulness practice",
    icon: Calendar
  }
];

// Generate time options (every 15 minutes)
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      const time24 = `${hour}:${minute}`;
      
      // Convert to 12-hour format for display
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const time12 = `${hour12}:${minute} ${ampm}`;
      
      times.push({ value: time24, label: time12 });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function Settings() {
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Check notification support on component mount
  useEffect(() => {
    setNotificationSupported(notificationManager.isNotificationSupported());
    setNotificationPermission(notificationManager.getPermissionStatus());
  }, []);

  // Fetch current user settings
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Form setup with default values
  const form = useForm<ReminderSettingsFormData>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      reminderEnabled: user?.reminderEnabled || false,
      reminderTime: user?.reminderTime || "09:00",
      reminderTimezone: user?.reminderTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminderTypes: user?.reminderTypes || []
    }
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        reminderEnabled: user.reminderEnabled || false,
        reminderTime: user.reminderTime || "09:00",
        reminderTimezone: user.reminderTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        reminderTypes: user.reminderTypes || []
      });
    }
  }, [user, form]);

  // Save reminder settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: ReminderSettingsFormData) => {
      const response = await fetch('/api/user/reminder-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Settings saved",
        description: "Your reminder preferences have been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    }
  });

  // Request notification permission and set up push notifications
  const requestNotificationPermission = async () => {
    if (!notificationSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support push notifications.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Request permission and set up push notifications
      await notificationManager.enableNotifications();
      setNotificationPermission(notificationManager.getPermissionStatus());
      
      toast({
        title: "Notifications enabled!",
        description: "You'll now receive daily reminders when enabled in your settings."
      });
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      setNotificationPermission(notificationManager.getPermissionStatus());
      
      toast({
        title: "Error enabling notifications",
        description: error.message || "Failed to set up push notifications.",
        variant: "destructive"
      });
    }
  };

  // Test notification
  const sendTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      toast({
        title: "Permission required",
        description: "Please enable notifications first.",
        variant: "destructive"
      });
      return;
    }

    try {
      await notificationManager.sendTestNotification();
      toast({
        title: "Test notification sent!",
        description: "Check your system notifications to see how daily reminders will look."
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: ReminderSettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const selectedReminderTypes = form.watch("reminderTypes");
  const reminderEnabled = form.watch("reminderEnabled");

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and notification preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Notification Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Browser Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {notificationSupported 
                    ? "Your browser supports push notifications" 
                    : "Your browser doesn't support push notifications"
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notificationPermission === 'granted' ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Enabled
                  </Badge>
                ) : notificationPermission === 'denied' ? (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Info className="h-3 w-3" />
                    Not Set
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
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
                  Send Test Notification
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Reminder Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Enable/Disable Reminders */}
                <FormField
                  control={form.control}
                  name="reminderEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Daily Reminders
                        </FormLabel>
                        <FormDescription>
                          Receive daily notifications to support your integration journey
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-enable-reminders"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {reminderEnabled && (
                  <>
                    {/* Reminder Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="reminderTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reminder Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-reminder-time">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-48 overflow-y-auto">
                                {timeOptions.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Timezone */}
                      <FormField
                        control={form.control}
                        name="reminderTimezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Timezone
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-timezone">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-48 overflow-y-auto">
                                {commonTimezones.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Reminder Types */}
                    <FormField
                      control={form.control}
                      name="reminderTypes"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Types of Reminders</FormLabel>
                            <FormDescription>
                              Choose which activities you'd like to be reminded about
                            </FormDescription>
                          </div>
                          <div className="space-y-3">
                            {reminderTypeOptions.map((item) => {
                              const Icon = item.icon;
                              return (
                                <FormField
                                  key={item.value}
                                  control={form.control}
                                  name="reminderTypes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item.value}
                                        className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4"
                                      >
                                        <FormControl>
                                          <input
                                            type="checkbox"
                                            checked={field.value?.includes(item.value)}
                                            onChange={(e) => {
                                              const updatedTypes = e.target.checked
                                                ? [...(field.value || []), item.value]
                                                : (field.value || []).filter((value) => value !== item.value);
                                              field.onChange(updatedTypes);
                                            }}
                                            className="sr-only"
                                            data-testid={`checkbox-reminder-${item.value}`}
                                          />
                                        </FormControl>
                                        <div
                                          className={`flex items-center justify-center w-8 h-8 rounded-md border-2 cursor-pointer transition-colors ${
                                            field.value?.includes(item.value)
                                              ? 'bg-primary border-primary text-primary-foreground'
                                              : 'border-input hover:border-primary'
                                          }`}
                                          onClick={() => {
                                            const isChecked = field.value?.includes(item.value);
                                            const updatedTypes = isChecked
                                              ? (field.value || []).filter((value) => value !== item.value)
                                              : [...(field.value || []), item.value];
                                            field.onChange(updatedTypes);
                                          }}
                                        >
                                          <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1 leading-none">
                                          <FormLabel className="cursor-pointer">
                                            {item.label}
                                          </FormLabel>
                                          <FormDescription>
                                            {item.description}
                                          </FormDescription>
                                        </div>
                                      </FormItem>
                                    );
                                  }}
                                />
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Summary */}
                    {selectedReminderTypes.length > 0 && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Reminder Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          You'll receive daily reminders for{" "}
                          <span className="font-medium">
                            {selectedReminderTypes.map(type => 
                              reminderTypeOptions.find(opt => opt.value === type)?.label
                            ).join(", ")}
                          </span>{" "}
                          at{" "}
                          <span className="font-medium">
                            {timeOptions.find(t => t.value === form.watch("reminderTime"))?.label}
                          </span>.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <Separator />

                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending}
                  className="w-full md:w-auto"
                  data-testid="button-save-reminder-settings"
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}