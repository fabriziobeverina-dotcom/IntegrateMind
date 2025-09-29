// Integration Compass Service Worker
// Handles push notifications for daily reminders

const CACHE_NAME = 'integration-compass-v1';
const urlsToCache = [
  '/',
  '/journal',
  '/progress', 
  '/practices',
  '/settings'
];

// Install service worker and cache core resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache install failed:', error);
      })
  );
  
  // Force the service worker to activate immediately
  self.skipWaiting();
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Handle push events and display notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  let notificationData = {
    title: 'Integration Compass',
    body: 'Time for your daily practice!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'daily-reminder',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: '/',
      reminderType: 'general'
    }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      
      // Override default values with pushed data
      if (pushData.title) notificationData.title = pushData.title;
      if (pushData.body) notificationData.body = pushData.body;
      if (pushData.url) notificationData.data.url = pushData.url;
      if (pushData.reminderType) notificationData.data.reminderType = pushData.reminderType;
      if (pushData.icon) notificationData.icon = pushData.icon;
      
      // Customize notification based on reminder type
      switch (pushData.reminderType) {
        case 'journal':
          notificationData.title = '📝 Journal Time';
          notificationData.body = pushData.body || 'Take a moment to reflect and write in your journal';
          notificationData.data.url = '/journal';
          notificationData.tag = 'journal-reminder';
          break;
          
        case 'progress':
          notificationData.title = '📊 Progress Check-in';
          notificationData.body = pushData.body || 'How are you feeling today? Track your mood, sleep, and grounding';
          notificationData.data.url = '/progress';
          notificationData.tag = 'progress-reminder';
          break;
          
        case 'practice':
          notificationData.title = '🧘 Practice Time';
          notificationData.body = pushData.body || 'Time for your daily mindfulness practice';
          notificationData.data.url = '/practices';
          notificationData.tag = 'practice-reminder';
          break;
          
        default:
          notificationData.title = '🌱 Integration Compass';
          notificationData.body = pushData.body || 'Your daily reminder is here!';
          break;
      }
      
    } catch (error) {
      console.error('[ServiceWorker] Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      renotify: true
    }).catch((error) => {
      console.error('[ServiceWorker] Error showing notification:', error);
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received:', event);
  
  // Close the notification
  event.notification.close();
  
  // Handle action clicks
  if (event.action === 'dismiss') {
    console.log('[ServiceWorker] Notification dismissed');
    return;
  }
  
  // Get the URL to open (default or from notification data)
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    // Check if there's already a window/tab open
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If there's a window already open, focus it and navigate to the right page
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          return client.focus().then(() => {
            // Navigate to the specific page
            return client.navigate(urlToOpen);
          });
        }
      }
      
      // If no window is open, open a new one
      return clients.openWindow(urlToOpen);
    }).catch((error) => {
      console.error('[ServiceWorker] Error handling notification click:', error);
      // Fallback: just open the homepage
      return clients.openWindow('/');
    })
  );
});

// Handle notification close events (for analytics/tracking)
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);
  
  // You could send analytics data here if needed
  // fetch('/api/analytics/notification-closed', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     tag: event.notification.tag,
  //     timestamp: Date.now()
  //   })
  // });
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Basic fetch handler for offline functionality
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for navigation
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip non-navigation requests for now (API calls, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Fetch failed:', error);
        // Could return a custom offline page here
        throw error;
      })
  );
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});