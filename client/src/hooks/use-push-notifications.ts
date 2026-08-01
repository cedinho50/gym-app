import { useState, useEffect, useCallback } from "react";

type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getVapidKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const { key } = await res.json();
    return key ?? null;
  } catch {
    return null;
  }
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(async () => {
    if (!("Notification" in window) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const sw = await getSwRegistration();
    if (!sw) {
      setState("unsupported");
      return;
    }
    const existing = await sw.pushManager.getSubscription();
    setState(existing ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setState("unsubscribed");
        alert("Push ist auf dem Server noch nicht eingerichtet (VAPID-Schluessel fehlen).");
        return;
      }
      const sw = await getSwRegistration();
      if (!sw) {
        setState("unsubscribed");
        return;
      }
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });
      setState("subscribed");
    } catch {
      setState("unsubscribed");
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState("loading");
    try {
      const sw = await getSwRegistration();
      const existing = await sw?.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      setState("unsubscribed");
    }
  }, []);

  const toggle = useCallback(async () => {
    if (state === "subscribed") {
      await unsubscribe();
    } else if (state === "unsubscribed" || state === "denied") {
      if (Notification.permission === "denied") {
        alert(
          "Benachrichtigungen sind in deinem Browser blockiert.\n\nBitte in den Browser-Einstellungen erlauben und die Seite neu laden.",
        );
        return;
      }
      await subscribe();
    }
  }, [state, subscribe, unsubscribe]);

  return { state, toggle };
}
