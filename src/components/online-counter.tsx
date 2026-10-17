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

    let id = sessionStorage.getItem("sbk_presence_id");
    if (!id) {
      id = "u_" + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("sbk_presence_id", id);
    }
    clientId.current = id;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const channel = supabase.channel("sbk-online-presence", {
      config: {
        presence: {
          key: clientId.current,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeCount = Object.keys(state).length;
        if (activeCount > 0) {
          setOnlineCount(activeCount);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
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
