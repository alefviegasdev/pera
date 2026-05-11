import { useEffect, useRef } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const LAST_PROMPT_KEY = 'pera_push_last_prompt';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    initialized.current = true;

    const init = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!VAPID_PUBLIC_KEY) return;

      const permission = Notification.permission;

      // Se já negou, não perguntar mais
      if (permission === 'denied') return;

      // Se já concedeu, registrar diretamente
      if (permission === 'granted') {
        await registerSubscription(userId);
        return;
      }

      // Se ainda não decidiu, verificar cadência de 1x por dia
      const lastPrompt = localStorage.getItem(LAST_PROMPT_KEY);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (lastPrompt && now - parseInt(lastPrompt) < oneDayMs) return;

      localStorage.setItem(LAST_PROMPT_KEY, String(now));
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await registerSubscription(userId);
      }
    };

    init();
  }, [userId]);
}

async function registerSubscription(userId: string) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(userId, existing);
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY
      )
    });
    await saveSubscription(userId, subscription);
  } catch (e) {
    console.error('[Push] Erro ao registrar:', e);
  }
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  const sub = subscription.toJSON();
  await fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: (sub.keys as any)?.p256dh,
      auth: (sub.keys as any)?.auth
    })
  });
}
