// Notification utilities for Integration Compass
// Handles service worker registration and push notification subscriptions

// VAPID public key - this should be generated for production
// For now, using a placeholder that would be replaced with actual VAPID keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLdHXfhchO0Wr6iQV6wSKL9T_F4EkjCXl9EjwfSqUhB9yQhI3bE_HV4';

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  
  constructor() {
    this.initializeServiceWorker();
  }
  
  // Initialize service worker
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }
    
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully:', this.swRegistration);
      
      // Handle service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available');
              // Could show update notification to user here
            }
          });
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
  
  // Check if notifications are supported
  public isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
  
  // Get current notification permission status
  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
  
  // Request notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported()) {
      throw new Error('Notifications not supported');
    }
    
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }
  
  // Convert VAPID public key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  // Subscribe to push notifications
  public async subscribeToPush(): Promise<NotificationSubscription | null> {
    if (!this.swRegistration) {
      await this.initializeServiceWorker();
    }
    
    if (!this.swRegistration) {
      throw new Error('Service Worker not available');
    }
    
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }
    
    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      console.log('Push subscription successful:', subscription);
      
      // Convert to our format
      const p256dhArray = new Uint8Array(subscription.getKey('p256dh')!);
      const authArray = new Uint8Array(subscription.getKey('auth')!);
      
      const subscriptionData: NotificationSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, Array.from(p256dhArray))),
          auth: btoa(String.fromCharCode.apply(null, Array.from(authArray)))
        }
      };
      
      return subscriptionData;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }
  
  // Get existing push subscription
  public async getExistingSubscription(): Promise<NotificationSubscription | null> {
    if (!this.swRegistration) {
      await this.initializeServiceWorker();
    }
    
    if (!this.swRegistration) {
      return null;
    }
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        return null;
      }
      
      const p256dhArray = new Uint8Array(subscription.getKey('p256dh')!);
      const authArray = new Uint8Array(subscription.getKey('auth')!);
      
      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, Array.from(p256dhArray))),
          auth: btoa(String.fromCharCode.apply(null, Array.from(authArray)))
        }
      };
    } catch (error) {
      console.error('Failed to get existing subscription:', error);
      return null;
    }
  }
  
  // Unsubscribe from push notifications
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications:', success);
        return success;
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }
  
  // Send subscription to backend
  public async sendSubscriptionToBackend(subscription: NotificationSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: navigator.userAgent
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save subscription to backend');
      }
      
      console.log('Subscription saved to backend successfully');
    } catch (error) {
      console.error('Error saving subscription to backend:', error);
      throw error;
    }
  }
  
  // Remove subscription from backend
  public async removeSubscriptionFromBackend(): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove subscription from backend');
      }
      
      console.log('Subscription removed from backend successfully');
    } catch (error) {
      console.error('Error removing subscription from backend:', error);
      throw error;
    }
  }
  
  // Complete subscription process (subscribe + send to backend)
  public async enableNotifications(): Promise<void> {
    const subscription = await this.subscribeToPush();
    if (subscription) {
      await this.sendSubscriptionToBackend(subscription);
    }
  }
  
  // Complete unsubscription process (unsubscribe + remove from backend)
  public async disableNotifications(): Promise<void> {
    await Promise.all([
      this.unsubscribeFromPush(),
      this.removeSubscriptionFromBackend()
    ]);
  }
  
  // Send test notification
  public async sendTestNotification(): Promise<void> {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Helper functions for easier usage
export const useNotifications = () => {
  return {
    isSupported: () => notificationManager.isNotificationSupported(),
    getPermission: () => notificationManager.getPermissionStatus(),
    requestPermission: () => notificationManager.requestPermission(),
    subscribe: () => notificationManager.subscribeToPush(),
    unsubscribe: () => notificationManager.unsubscribeFromPush(),
    enable: () => notificationManager.enableNotifications(),
    disable: () => notificationManager.disableNotifications(),
    sendTest: () => notificationManager.sendTestNotification(),
    getExisting: () => notificationManager.getExistingSubscription()
  };
};