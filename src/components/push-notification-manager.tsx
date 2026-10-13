"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, AlertCircle } from "lucide-react";
import { type Key } from "@/lib/i18n";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDCZApyxlJsYwRBowAzCiJBZx6qAvTAjKAaNJG3FxTNDqHAfIirRLq-xLyu51DcRIH5jMPlxbAs6mKUKqXn8kBI";

export function PushNotificationManager({
  t,
  compact = false,
}: {
  t: (key: Key) => string;
  compact?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscribed(true);
          }
        });
      }).catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);

  const subscribeUser = async () => {
    if (!supported) return;
    setBusy(true);
    setMessage("");

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setMessage(t("notificationsBlocked"));
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
      }

      const subData = JSON.parse(JSON.stringify(sub));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subData }),
      });

      if (res.ok) {
        setSubscribed(true);
        setMessage(t("notificationsEnabled"));
      } else {
        setMessage("Unable to save push subscription.");
      }
    } catch (e: any) {
      console.error("Push subscribe error:", e);
      setMessage(e.message || "Failed to enable notifications");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  if (compact) {
    if (subscribed) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          <Check size={14} />
          {t("notificationsEnabled")}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={subscribeUser}
        disabled={busy || permission === "denied"}
        className="button secondary small"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
        }}
      >
        <Bell size={14} />
        {busy ? "..." : t("enableNotifications")}
      </button>
    );
  }

  // Banner prompt for un-subscribed users
  if (permission === "granted" && subscribed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#166534",
          marginTop: "12px",
        }}
      >
        <Check size={16} />
        <span>{t("notificationsEnabled")}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 16px",
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        borderRadius: "10px",
        margin: "12px 0",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Bell size={18} style={{ color: "#2563eb", flexShrink: 0 }} />
        <span style={{ fontSize: "13.5px", color: "#1e3a8a", fontWeight: 500 }}>
          {t("enableNotifications")} (30 mins before deadline)
        </span>
      </div>
      <button
        type="button"
        onClick={subscribeUser}
        disabled={busy || permission === "denied"}
        className="button primary small"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
      >
        <Bell size={14} />
        {busy ? "..." : t("enableNotifications")}
      </button>
      {message && (
        <span style={{ width: "100%", fontSize: "12px", color: "#2563eb" }}>
          {message}
        </span>
      )}
    </div>
  );
}
