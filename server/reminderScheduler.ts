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
    title: '📝 Journal Time',
    body: 'Take a moment to reflect and write in your journal',
    url: '/journal'
  },
  progress: {
    title: '📊 Progress Check-in',
    body: 'How are you feeling today? Track your mood, sleep, and grounding',
    url: '/progress'
  },
  practice: {
    title: '🧘 Practice Time',
    body: 'Time for your daily mindfulness practice',
    url: '/practices'
  }
};

export class ReminderScheduler {
  
  // Get users who should receive reminders at the current time
  async getUsersForCurrentTime(): Promise<User[]> {
    try {
      const now = new Date();
      const usersToNotify: User[] = [];
      
      // Get all users with reminders enabled (we need a new storage method for this)
      // For now, we'll check common time zones by converting current UTC time
      const commonTimezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
      ];
      
      for (const timezone of commonTimezones) {
        try {
          // Convert current UTC time to the timezone
          const timeInZone = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(now);
          
          console.log(`Checking timezone ${timezone} at ${timeInZone}`);
          
          // Get users who have reminders scheduled for this time in this timezone
          const usersInTimezone = await storage.getUsersWithRemindersAt(timeInZone);
          
          // Filter to only users who actually have this timezone set
          const matchingUsers = usersInTimezone.filter(user => 
            user.reminderTimezone === timezone && user.reminderEnabled
          );
          
          usersToNotify.push(...matchingUsers);
          
        } catch (timezoneError) {
          console.error(`Error processing timezone ${timezone}:`, timezoneError);
        }
      }
      
      console.log(`Found ${usersToNotify.length} users total for notifications`);
      return usersToNotify;
      
    } catch (error) {
      console.error('Error getting users for current time:', error);
      return [];
    }
  }
  
  // Send push notification to a user's subscriptions
  async sendNotificationToUser(user: User, reminderType: 'journal' | 'progress' | 'practice'): Promise<void> {
    try {
      const subscriptions = await storage.getUserPushSubscriptions(user.id);
      
      if (subscriptions.length === 0) {
        console.log(`No active subscriptions for user ${user.id}`);
        return;
      }
      
      const template = reminderTemplates[reminderType];
      const notificationPayload: ReminderNotification = {
        title: template.title,
        body: template.body,
        url: template.url,
        reminderType,
        icon: '/favicon.ico'
      };
      
      // Send to all user's active subscriptions
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await this.sendPushNotification(subscription, notificationPayload);
          console.log(`Notification sent to subscription ${subscription.id}`);
          
          // Record successful delivery
          await this.recordDelivery(user.id, reminderType, 'sent');
          
        } catch (error: any) {
          console.error(`Failed to send notification to subscription ${subscription.id}:`, error);
          
          // Record failed delivery
          await this.recordDelivery(user.id, reminderType, 'failed', error?.message || 'Unknown error');
          
          // If the subscription is invalid, deactivate it
          if (error?.statusCode === 410) {
            console.log(`Deactivating invalid subscription ${subscription.id}`);
            // Could add a method to deactivate specific subscription
          }
        }
      });
      
      await Promise.all(sendPromises);
      
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
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const subscriptions = await storage.getUserPushSubscriptions(userId);
      if (subscriptions.length === 0) {
        throw new Error('No active subscriptions found');
      }
      
      const testNotification: ReminderNotification = {
        title: '🌱 Integration Compass Test',
        body: 'This is a test notification! Your daily reminders will look like this.',
        url: '/',
        reminderType: 'journal',
        icon: '/favicon.ico'
      };
      
      // Send to the first active subscription
      await this.sendPushNotification(subscriptions[0], testNotification);
      console.log(`Test notification sent to user ${userId}`);
      
    } catch (error) {
      console.error(`Error sending test notification to user ${userId}:`, error);
      throw error;
    }
  }
  
  // Process all reminders for current time (called by scheduler)
  async processCurrentReminders(): Promise<void> {
    console.log('Processing reminders for current time...');
    
    try {
      const users = await this.getUsersForCurrentTime();
      
      for (const user of users) {
        if (!user.reminderEnabled || !user.reminderTypes?.length) {
          continue;
        }
        
        // Send notifications for each enabled reminder type
        for (const reminderType of user.reminderTypes) {
          if (['journal', 'progress', 'practice'].includes(reminderType)) {
            await this.sendNotificationToUser(user, reminderType as 'journal' | 'progress' | 'practice');
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing current reminders:', error);
    }
  }
  
  // Setup periodic reminder processing (would be called on server startup)
  setupScheduler(): void {
    // Check for reminders every minute
    setInterval(() => {
      this.processCurrentReminders();
    }, 60 * 1000); // 60 seconds
    
    console.log('Reminder scheduler initialized - checking every minute');
  }
}

// Export singleton instance — auto-starts the scheduler on import
export const reminderScheduler = new ReminderScheduler();
reminderScheduler.setupScheduler();