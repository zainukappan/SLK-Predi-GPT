"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useLanguage } from "./provider";

export function OnlineCounter({ className = "" }: { className?: string }) {
  const { t, lang } = useLanguage();
  const [onlineCount, setOnlineCount] = useState(1);
  const clientId = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let id = "";
    try {
      id = sessionStorage.getItem("sbk_presence_id") || "";
      if (!id) {
        id = "u_" + Math.random().toString(36).substring(2, 11);
        try {
          sessionStorage.setItem("sbk_presence_id", id);
        } catch {
          // Safari Private Browsing mode throws SecurityError
        }
      }
    } catch {
      id = "u_" + Math.random().toString(36).substring(2, 11);
    }
    clientId.current = id;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    let supabase: any = null;
    let channel: any = null;

    try {
      supabase = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      channel = supabase.channel("sbk-online-presence", {
        config: {
          presence: {
            key: clientId.current,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel.presenceState();
            const activeCount = Object.keys(state).length;
            if (activeCount > 0) {
              setOnlineCount(activeCount);
            }
          } catch {}
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                online_at: new Date().toISOString(),
              });
            } catch {}
          }
        });
    } catch (err) {
      console.warn("Online presence initialization skipped:", err);
    }

    return () => {
      try {
        if (channel && supabase) {
          channel.unsubscribe?.().catch?.(() => {});
          supabase.removeChannel?.(channel)?.catch?.(() => {});
        }
      } catch {}
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
