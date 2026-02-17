import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface ReminderSettings {
  reminderEnabled: boolean;
  reminderTimezone: string;
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  eveningReminderEnabled: boolean;
  eveningReminderTime: string;
}

function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dateKey: string } {
  try {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = timeFormatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const dateKey = dateFormatter.format(now);
    return { hours, minutes, dateKey };
  } catch {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes(), dateKey: now.toDateString() };
  }
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

function showBrowserNotification(title: string, body: string, tag: string) {
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 30000);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

export function NotificationScheduler() {
  const lastMorningNotification = useRef<string>('');
  const lastEveningNotification = useRef<string>('');

  const { data: settings } = useQuery<ReminderSettings>({
    queryKey: ['/api/settings/reminders'],
    queryFn: async () => {
      const response = await fetch('/api/settings/reminders');
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const checkAndNotify = useCallback(() => {
    if (!settings) return;
    if (Notification.permission !== 'granted') return;
    if (!settings.reminderEnabled) return;

    const timezone = settings.reminderTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { hours: currentHours, minutes: currentMinutes, dateKey } = getCurrentTimeInTimezone(timezone);

    if (settings.morningReminderEnabled) {
      const morningTime = parseTime(settings.morningReminderTime || "08:00");
      const morningKey = `morning-${dateKey}`;

      if (
        currentHours === morningTime.hours &&
        currentMinutes >= morningTime.minutes &&
        currentMinutes < morningTime.minutes + 5 &&
        lastMorningNotification.current !== morningKey
      ) {
        lastMorningNotification.current = morningKey;
        showBrowserNotification(
          "Good Morning! Time for your integration journey",
          "Open Integration Compass to write your journal entry and complete today's integration prompt.",
          "morning-reminder"
        );
      }
    }

    if (settings.eveningReminderEnabled) {
      const eveningTime = parseTime(settings.eveningReminderTime || "20:00");
      const eveningKey = `evening-${dateKey}`;

      if (
        currentHours === eveningTime.hours &&
        currentMinutes >= eveningTime.minutes &&
        currentMinutes < eveningTime.minutes + 5 &&
        lastEveningNotification.current !== eveningKey
      ) {
        lastEveningNotification.current = eveningKey;
        showBrowserNotification(
          "Evening Wellbeing Check-in",
          "How are you feeling today? Take a moment to log your daily wellbeing.",
          "evening-reminder"
        );
      }
    }
  }, [settings]);

  useEffect(() => {
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 30000);
    return () => clearInterval(interval);
  }, [checkAndNotify]);

  return null;
}
