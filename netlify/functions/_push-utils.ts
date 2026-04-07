/**
 * Shared push notification utility for scheduled functions.
 * Sends to all subscribers, auto-cleans expired subscriptions.
 */
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToAll(
  payload: PushPayload
): Promise<{ sent: number; expired: number }> {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const store = getStore({
    name: 'push-subscriptions',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const subscriptions: any[] =
    (await store.get('subscriptions', { type: 'json' })) || [];

  if (subscriptions.length === 0) {
    return { sent: 0, expired: 0 };
  }

  const expiredEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (stored) => {
      try {
        await webpush.sendNotification(
          stored.subscription,
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(stored.subscription.endpoint);
        } else {
          console.warn(`Push failed for ${stored.email}:`, err.message);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    const cleaned = subscriptions.filter(
      (s) => !expiredEndpoints.includes(s.subscription.endpoint)
    );
    await store.setJSON('subscriptions', cleaned);
  }

  return { sent, expired: expiredEndpoints.length };
}

/**
 * Format a Date to YYYY-MM-DD string (local date, no UTC shift)
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
