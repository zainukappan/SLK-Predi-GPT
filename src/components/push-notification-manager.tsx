"use client";

import { useEffect, useState } from "react";
import { Bell, Check, AlertCircle, X, Send } from "lucide-react";
import { type Key } from "@/lib/i18n";
import { action } from "./provider";

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
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone = "standalone" in navigator && (navigator as any).standalone;
        if (isIos && !isStandalone) {
          setIsIosBrowser(true);
        }

        if (
          "serviceWorker" in navigator &&
          "PushManager" in window &&
          typeof Notification !== "undefined"
        ) {
          setSupported(true);
          try {
            setPermission(Notification.permission);
          } catch {}

          navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
              if (reg && reg.pushManager) {
                reg.pushManager.getSubscription().then((sub) => {
                  if (sub) {
                    setSubscribed(true);
                  }
                }).catch(() => {});
              }
            })
            .catch((err) => {
              console.warn("Service worker registration failed:", err);
            });
        }
      } catch (err) {
        console.warn("Push notification setup error:", err);
      }
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

  const handleTestNotification = async () => {
    setTestBusy(true);
    setMessage("");
    try {
      await action("testPush");
      setMessage(t("testSent"));
    } catch (e: any) {
      setMessage(e.message || "Failed to send test notification");
    } finally {
      setTestBusy(false);
    }
  };

  if (!supported) {
    if (isIosBrowser && !compact && !dismissed) {
      return (
        <div
          style={{
            background: "rgba(239, 246, 255, 0.95)",
            border: "1px solid #93c5fd",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "12.5px",
            color: "#1e3a8a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "12px 0",
            gap: "8px",
          }}
        >
          <span>
            📱 <b>iPhone/iPad:</b> നോട്ടിഫിക്കേഷനുകൾ ലഭിക്കാൻ Safari-യിൽ താഴെയുള്ള Share ബട്ടൺ അമർത്തി <b>'Add to Home Screen'</b> ചെയ്യുക.
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#1e3a8a" }}
          >
            <X size={16} />
          </button>
        </div>
      );
    }
    return null;
  }

  if (dismissed && !compact) return null;

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

  // Already subscribed view (show confirmation and Test Notification button)
  if (permission === "granted" && subscribed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "10px 14px",
          background: "rgba(34, 197, 94, 0.08)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "10px",
          margin: "10px 0 16px 0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Check size={16} style={{ color: "#16a34a" }} />
          <span style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>
            {t("notificationsEnabled")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={testBusy}
            className="button secondary small"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "4px 10px" }}
          >
            <Send size={12} />
            {testBusy ? "..." : t("testNotification")}
          </button>
        </div>
        {message && (
          <span style={{ width: "100%", fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>
            {message}
          </span>
        )}
      </div>
    );
  }

  // Unsubscribed prompt banner
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 16px",
        background: "linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.95))",
        border: "1.5px solid #3b82f6",
        borderRadius: "12px",
        margin: "12px 0 18px 0",
        boxShadow: "0 2px 10px rgba(59, 130, 246, 0.12)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "240px" }}>
        <div
          style={{
            background: "#2563eb",
            color: "#ffffff",
            padding: "8px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bell size={18} />
        </div>
        <div>
          <strong style={{ fontSize: "14px", color: "#1e3a8a", display: "block" }}>
            {t("enableNotifications")}
          </strong>
          <span style={{ fontSize: "12.5px", color: "#3b82f6", display: "block", marginTop: "2px" }}>
            Get alerted 30 minutes before match predictions lock so you never miss points!
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={subscribeUser}
          disabled={busy || permission === "denied"}
          className="button primary small"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 700,
            padding: "8px 14px",
          }}
        >
          <Bell size={14} />
          {busy ? "..." : t("enableNotifications")}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
          aria-label={t("close")}
        >
          <X size={17} />
        </button>
      </div>
      {message && (
        <span style={{ width: "100%", fontSize: "12px", color: permission === "denied" ? "#dc2626" : "#2563eb", marginTop: "4px" }}>
          {message}
        </span>
      )}
    </div>
  );
}
