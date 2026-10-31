"use client";

import { useEffect, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { useLanguage } from "./provider";

// --- Global Presence Manager (Singleton across the browser tab) ---
// This ensures page navigations (e.g. /home -> /match -> /top-scorers -> /news)
// do not close and reopen the WebSocket connection or drop presence tracking.

let sharedClient: SupabaseClient | null = null;
let sharedChannel: RealtimeChannel | null = null;
const listeners = new Set<(count: number) => void>();
let globalOnlineCount = 1;
let keepaliveInterval: any = null;
let initialized = false;

function countFromState(state: Record<string, any[]>): number {
  let total = 0;
  for (const k of Object.keys(state)) {
    const arr = state[k];
    total += Array.isArray(arr) ? arr.length : 1;
  }
  return Math.max(1, total);
}

function notifyListeners() {
  if (!sharedChannel) return;
  try {
    const state = sharedChannel.presenceState();
    const count = countFromState(state);
    globalOnlineCount = count;
    listeners.forEach((fn) => {
      try {
        fn(count);
      } catch {}
    });
  } catch {}
}

async function trackCurrentPresence() {
  if (!sharedChannel) return;
  try {
    await sharedChannel.track({
      online_at: new Date().toISOString(),
    });
  } catch {}
}

function initPresenceManager() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  try {
    sharedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    sharedChannel = sharedClient.channel("sbk-online-presence");

    sharedChannel
      .on("presence", { event: "sync" }, () => notifyListeners())
      .on("presence", { event: "join" }, () => notifyListeners())
      .on("presence", { event: "leave" }, () => notifyListeners())
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentPresence();
          notifyListeners();
        }
      });

    // Mobile / Carrier keepalive ping every 25 seconds
    if (!keepaliveInterval) {
      keepaliveInterval = setInterval(() => {
        if (document.visibilityState === "visible") {
          trackCurrentPresence();
        }
      }, 25000);
    }

    // When phone screen unlocks or user switches back from another app/tab
    const handleResume = () => {
      if (document.visibilityState === "visible") {
        if (!sharedChannel || sharedChannel.state !== "joined") {
          try {
            sharedChannel?.subscribe(async (status: string) => {
              if (status === "SUBSCRIBED") {
                await trackCurrentPresence();
                notifyListeners();
              }
            });
          } catch {}
        } else {
          trackCurrentPresence();
          notifyListeners();
        }
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("online", handleResume);

    // Clean untrack on window close
    window.addEventListener("beforeunload", () => {
      try {
        sharedChannel?.untrack?.();
      } catch {}
    });
  } catch (err) {
    console.warn("Presence manager init skipped:", err);
  }
}

export function OnlineCounter({ className = "" }: { className?: string }) {
  const { t, lang } = useLanguage();
  const [onlineCount, setOnlineCount] = useState(globalOnlineCount);

  useEffect(() => {
    initPresenceManager();

    const handleCountChange = (count: number) => {
      setOnlineCount(count);
    };

    listeners.add(handleCountChange);
    // Sync current global count immediately
    setOnlineCount(globalOnlineCount);

    return () => {
      listeners.delete(handleCountChange);
    };
  }, []);

  return (
    <div
      className={`online-presence-badge ${className}`}
      title="Live users currently on the website"
      aria-label={`${onlineCount} ${t("onlineNow")}`}
    >
      <span className="online-presence-dot" aria-hidden="true" />
      <strong className="online-presence-count">{onlineCount}</strong>
      <span className="online-presence-label">
        {lang === "ml" ? ` ${t("onlineNow")}` : ` ${t("onlineNow")}`}
      </span>
    </div>
  );
}
