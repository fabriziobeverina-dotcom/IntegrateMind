// Daily reminder scheduling system for Integration Compass
// Handles sending push notifications based on user preferences

import webpush from 'web-push';
import { storage } from './storage';
import type { User, PushSubscription, InsertReminderDelivery } from '@shared/schema';

// VAPID keys for web push - these MUST be properly configured
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@integrationcompass.com';

// Validate VAPID configuration
function validateVapidConfig(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error(`
❌ VAPID CONFIGURATION ERROR ❌
Push notifications require valid VAPID keys to be configured.

Missing environment variables:
${!VAPID_PUBLIC_KEY ? '- VAPID_PUBLIC_KEY' : ''}
${!VAPID_PRIVATE_KEY ? '- VAPID_PRIVATE_KEY' : ''}

To fix this:
1. Generate VAPID keys using: npx web-push generate-vapid-keys
2. Set environment variables:
   export VAPID_PUBLIC_KEY="your-public-key"
   export VAPID_PRIVATE_KEY="your-private-key" 
   export VAPID_EMAIL="mailto:your-email@domain.com"

Push notifications will be disabled until VAPID keys are configured.
`);
    return false;
  }
  
  // Basic validation
  if (VAPID_PUBLIC_KEY.length < 80 || VAPID_PRIVATE_KEY.length < 40) {
    console.error('❌ VAPID keys appear to be invalid (too short)');
    return false;
  }
  
  return true;
}

const VAPID_CONFIGURED = validateVapidConfig();

// Configure web-push only if VAPID keys are valid
if (VAPID_CONFIGURED) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  console.log('✅ VAPID keys configured successfully for push notifications');
} else {
  console.warn('⚠️  Push notifications disabled due to missing VAPID configuration');
}

interface ReminderNotification {
  title: string;
  body: string;
  url: string;
  reminderType: 'journal' | 'progress' | 'practice';
  icon?: string;
}

const reminderTemplates = {
  journal: {
    title: 'Good morning',
    body: "Set your intention for today, then take a moment to journal.",
    url: '/journal'
  },
  progress: {
    title: 'Evening check-in',
    body: "How was your day? Reflect and log your wellbeing before you rest.",
    url: '/progress'
  },
  practice: {
    title: 'Time for your practice',
    body: 'Your daily mindfulness practice is waiting.',
    url: '/practices'
  }
};

export class ReminderScheduler {
  private reminderRunning = false;

  // Get users who should receive morning or evening reminders right now
  async getUsersForCurrentTime(): Promise<{ user: User; reminderType: 'journal' | 'progress' }[]> {
    try {
      const now = new Date();
      const results: { user: User; reminderType: 'journal' | 'progress' }[] = [];

      // Fetch all distinct timezones actually stored in the database, plus UTC as fallback
      let timezones = await storage.getDistinctReminderTimezones();
      if (!timezones.includes('UTC')) timezones = ['UTC', ...timezones];

      for (const timezone of timezones) {
        try {
          // Validate the timezone is supported before using it
          Intl.DateTimeFormat('en-US', { timeZone: timezone });

          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).formatToParts(now);

          const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
          const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
          const timeInZone = `${hour}:${minute}`;

          // Morning reminders
          const morningUsers = await storage.getUsersForMorningReminder(timeInZone, timezone);
          for (const user of morningUsers) {
            results.push({ user, reminderType: 'journal' });
          }

          // Evening reminders
          const eveningUsers = await storage.getUsersForEveningReminder(timeInZone, timezone);
          for (const user of eveningUsers) {
            results.push({ user, reminderType: 'progress' });
          }

        } catch (timezoneError) {
          console.error(`Error processing timezone ${timezone}:`, timezoneError);
        }
      }

      if (results.length > 0) {
        console.log(`Found ${results.length} users for notifications`);
      }
      return results;

    } catch (error) {
      console.error('Error getting users for current time:', error);
      return [];
    }
  }

  // Send push notification to a user using the stored JSONB subscription
  async sendNotificationToUser(user: User, reminderType: 'journal' | 'progress' | 'practice'): Promise<void> {
    try {
      if (!VAPID_CONFIGURED) return;

      const pushSub = (user as any).pushSubscription as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      } | null;

      if (!pushSub?.endpoint) {
        console.log(`No push subscription for user ${user.id}`);
        return;
      }

      const template = reminderTemplates[reminderType];
      const payload = JSON.stringify({
        title: template.title,
        body: template.body,
        url: template.url,
        tag: `reminder-${reminderType}`,
        reminderType,
        icon: '/icon-192.png',
      });

      try {
        await webpush.sendNotification(
          { endpoint: pushSub.endpoint, keys: { p256dh: pushSub.keys.p256dh, auth: pushSub.keys.auth } },
          payload,
          {
            TTL: 24 * 60 * 60,
            urgency: 'normal',
            vapidDetails: { subject: VAPID_EMAIL, publicKey: VAPID_PUBLIC_KEY!, privateKey: VAPID_PRIVATE_KEY! }
          }
        );
        await storage.updateUser(user.id, { lastNotificationSentAt: new Date() } as any);
        console.log(`[Reminder] Sent ${reminderType} notification to user ${user.id}`);
      } catch (err: any) {
        console.error(`[Reminder] Push failed for user ${user.id}:`, err?.message);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await storage.updateUser(user.id, { pushSubscription: null } as any);
        }
      }

    } catch (error) {
      console.error(`Error sending notification to user ${user.id}:`, error);
    }
  }
  
  // Send individual push notification
  private async sendPushNotification(subscription: PushSubscription, notification: ReminderNotification): Promise<void> {
    if (!VAPID_CONFIGURED) {
      throw new Error('Push notifications are disabled: VAPID keys not configured');
    }
    
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };
    
    const payload = JSON.stringify(notification);
    
    const options = {
      TTL: 24 * 60 * 60, // 24 hours
      urgency: 'normal' as const,
      vapidDetails: {
        subject: VAPID_EMAIL,
        publicKey: VAPID_PUBLIC_KEY!,
        privateKey: VAPID_PRIVATE_KEY!
      }
    };
    
    await webpush.sendNotification(pushSubscription, payload, options);
  }
  
  // Record delivery attempt
  private async recordDelivery(
    userId: string, 
    reminderType: 'journal' | 'progress' | 'practice', 
    status: 'sent' | 'failed', 
    errorMessage?: string
  ): Promise<void> {
    try {
      const deliveryRecord: InsertReminderDelivery = {
        userId,
        reminderType,
        scheduledFor: new Date(),
        status,
        errorMessage: errorMessage || null
      };
      
      // We need to add this method to storage
      // await storage.createReminderDelivery(deliveryRecord);
      console.log(`Delivery recorded: ${userId} - ${reminderType} - ${status}`);
      
    } catch (error) {
      console.error('Error recording delivery:', error);
    }
  }
  
  // Send test notification
  async sendTestNotification(userId: string): Promise<void> {
    if (!VAPID_CONFIGURED) throw new Error('Push notifications not configured');

    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const pushSub = (user as any).pushSubscription as {
      endpoint: string; keys: { p256dh: string; auth: string };
    } | null;
    if (!pushSub?.endpoint) throw new Error('No active push subscription found');

    const payload = JSON.stringify({
      title: 'Integration Compass',
      body: 'This is a test notification — your reminders will look like this.',
      url: '/',
      tag: 'test',
      icon: '/icon-192.png',
    });

    await webpush.sendNotification(
      { endpoint: pushSub.endpoint, keys: pushSub.keys },
      payload,
      { TTL: 3600, urgency: 'normal', vapidDetails: { subject: VAPID_EMAIL, publicKey: VAPID_PUBLIC_KEY!, privateKey: VAPID_PRIVATE_KEY! } }
    );
    console.log(`Test notification sent to user ${userId}`);
  }
  
  // Process all reminders for current time (called by scheduler)
  async processCurrentReminders(): Promise<void> {
    if (this.reminderRunning) return; // skip if previous run hasn't finished
    this.reminderRunning = true;
    try {
      const entries = await this.getUsersForCurrentTime();
      for (const { user, reminderType } of entries) {
        if (!user.reminderEnabled) continue;
        await this.sendNotificationToUser(user, reminderType);
      }
    } catch (error) {
      console.error('Error processing current reminders:', error);
    } finally {
      this.reminderRunning = false;
    }
  }
  
  // Global notification throttle — max 1 push per user per 20 hours
  private async canSendPushToday(userId: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;
    const lastSent = (user as any).lastNotificationSentAt;
    if (!lastSent) return true;
    const hoursSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 20;
  }

  // Send somatic nudge to a single user
  async sendSomaticNudge(userId: string): Promise<boolean> {
    if (!VAPID_CONFIGURED) return false;
    if (!(await this.canSendPushToday(userId))) return false;

    const user = await storage.getUser(userId);
    if (!user) return false;
    const pushSub = (user as any).pushSubscription as { endpoint: string; keys: { p256dh: string; auth: string } } | null;
    if (!pushSub?.endpoint) return false;

    const payload = JSON.stringify({
      title: "Your body is part of this too",
      body: "Integration doesn't only happen in the mind. There's a somatic practice waiting for you — it takes 5 minutes.",
      tag: "somatic-nudge",
      url: "/practices?category=somatic",
    });

    try {
      await webpush.sendNotification(
        { endpoint: pushSub.endpoint, keys: { p256dh: pushSub.keys.p256dh, auth: pushSub.keys.auth } },
        payload,
        {
          TTL: 24 * 60 * 60,
          urgency: 'normal',
          vapidDetails: { subject: VAPID_EMAIL, publicKey: VAPID_PUBLIC_KEY!, privateKey: VAPID_PRIVATE_KEY! }
        }
      );
      await storage.updateUser(userId, {
        somaticNudgeSentAt: new Date(),
        lastNotificationSentAt: new Date(),
      } as any);
      return true;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await storage.updateUser(userId, { pushSubscription: null } as any);
      }
      console.error(`Somatic nudge push failed for user ${userId}:`, err?.message);
      return false;
    }
  }

  // Run the somatic nudge cron job — called from POST /api/push/send-somatic-nudge
  async runSomaticNudgeJob(): Promise<number> {
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Only run between 08:00–21:00 UTC
    if (utcHour < 8 || utcHour >= 21) {
      console.log(`[Somatic nudge] Skipping — UTC hour ${utcHour} is outside send window`);
      return 0;
    }

    const eligibleUsers = await storage.getSomaticNudgeEligibleUsers();
    console.log(`[Somatic nudge] ${eligibleUsers.length} eligible users`);
    let sent = 0;
    for (const user of eligibleUsers) {
      const success = await this.sendSomaticNudge(user.id);
      if (success) sent++;
    }
    console.log(`[Somatic nudge] Sent ${sent} notifications`);
    return sent;
  }

  // Setup periodic reminder processing (would be called on server startup)
  setupScheduler(): void {
    // Check for reminders every minute
    setInterval(() => {
      this.processCurrentReminders();
    }, 60 * 1000); // 60 seconds

    // Run somatic nudge job daily around 09:00 UTC
    const scheduleSomaticJob = () => {
      const now = new Date();
      const nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0, 0));
      if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      const delay = nextRun.getTime() - now.getTime();
      setTimeout(async () => {
        try { await this.runSomaticNudgeJob(); } catch (e) { console.error('[Somatic nudge] Job error:', e); }
        scheduleSomaticJob();
      }, delay);
    };
    scheduleSomaticJob();
    
    console.log('Reminder scheduler initialized - checking every minute');
  }
}

// Export singleton instance — auto-starts the scheduler on import
export const reminderScheduler = new ReminderScheduler();
reminderScheduler.setupScheduler();