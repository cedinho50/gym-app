// ------------------------------------------------------------------
// Web-Push-Benachrichtigungen. Portiert aus dem Projekt "Betriebslage".
// Funktioniert nur, wenn VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY gesetzt
// sind. Ohne Schluessel ist Push still deaktiviert und nichts bricht.
// VAPID-Schluessel erzeugen:  npx web-push generate-vapid-keys
// ------------------------------------------------------------------

import webpush from "web-push";
import { storage } from "./storage";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || "mailto:admin@example.com";

let pushEnabled = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    pushEnabled = true;
    console.log("[push] VAPID konfiguriert, Push aktiv");
  } catch (err: any) {
    console.error(`[push] VAPID-Fehler: ${err.message}. Push deaktiviert.`);
  }
} else {
  console.warn("[push] VAPID-Keys nicht gesetzt, Push deaktiviert");
}

export function isPushEnabled(): boolean {
  return pushEnabled;
}

export function getVapidPublicKey(): string | null {
  return pushEnabled ? (vapidPublicKey ?? null) : null;
}

// Verschickt eine Benachrichtigung an alle gespeicherten Abos.
export async function pushToAll(opts: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  if (!pushEnabled) return;
  const subscriptions = await storage.getAllPushSubscriptions();
  if (subscriptions.length === 0) return;
  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    url: opts.url || "/",
    tag: opts.tag || "gym",
  });
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await storage.deletePushSubscription(sub.endpoint);
          console.log(`[push] Abgelaufenes Abo entfernt: ${sub.endpoint}`);
        } else {
          console.error("[push] Fehler beim Senden an", sub.endpoint, err.message);
        }
      }
    }),
  );
}
