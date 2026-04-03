// Simplified push notification utilities per spec

const VAPID_PUBLIC_KEY = 'BAxn3Tx25-0HBqNt_M8TaV883K59UOxbt46cDfbNAHGSUhOrDgE3XNvdrAiNW9JdTPHkyB_LiH7UCWUeVlP5ppc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getPushSubscriptionStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (!isPushSupported()) return 'denied';
  return Notification.permission as 'granted' | 'denied' | 'default';
}

export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await savePushSubscription(subscription);
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;
    const sub = await registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await fetch('/api/push/unsubscribe', { method: 'POST', credentials: 'include' });
  } catch {
    // silent
  }
}
