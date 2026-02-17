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

function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dateKey: string; dayOfWeek: number; dayOfMonth: number } {
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
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const parts = timeFormatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const dateKey = dateFormatter.format(now);
    const dayStr = dayFormatter.format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayStr] ?? now.getDay();
    const dayOfMonthFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, day: 'numeric' });
    const dayOfMonth = parseInt(dayOfMonthFormatter.format(now), 10);
    return { hours, minutes, dateKey, dayOfWeek, dayOfMonth };
  } catch {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes(), dateKey: now.toDateString(), dayOfWeek: now.getDay(), dayOfMonth: now.getDate() };
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
  const lastDreamNotification = useRef<string>('');
  const lastCreativeNotification = useRef<string>('');

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
    const { hours: currentHours, minutes: currentMinutes, dateKey, dayOfWeek, dayOfMonth } = getCurrentTimeInTimezone(timezone);

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

    const isDreamDayNow = dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4;
    if (isDreamDayNow && settings.morningReminderEnabled) {
      const morningTime = parseTime(settings.morningReminderTime || "08:00");
      let earlyMinutes = morningTime.minutes;
      let earlyHours = morningTime.hours - 1;
      if (earlyHours < 0) {
        earlyHours = 23;
      }
      const dreamKey = `dream-${dateKey}`;

      if (
        currentHours === earlyHours &&
        currentMinutes >= earlyMinutes &&
        currentMinutes < earlyMinutes + 5 &&
        lastDreamNotification.current !== dreamKey
      ) {
        lastDreamNotification.current = dreamKey;
        showBrowserNotification(
          "Capture Your Dream",
          "It's a dream journal day! Write down your dream before it fades away.",
          "dream-reminder"
        );
      }
    }

    const isCreativeDay = dayOfMonth === 1 || dayOfMonth === 15;
    if (isCreativeDay) {
      const morningTime = parseTime(settings.morningReminderTime || "08:00");
      const creativeKey = `creative-${dateKey}`;

      if (
        currentHours === morningTime.hours &&
        currentMinutes >= morningTime.minutes &&
        currentMinutes < morningTime.minutes + 5 &&
        lastCreativeNotification.current !== creativeKey
      ) {
        lastCreativeNotification.current = creativeKey;
        showBrowserNotification(
          "Creative Expression",
          "Give form to what cannot yet be said in words. Try a scribble drawing today.",
          "creative-reminder"
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
