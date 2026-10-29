"use client";

import { useEffect } from "react";

export default function AccessTracker() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // Esclude permanentemente il dispositivo dell'amministratore dalle statistiche
        if (localStorage.getItem("fbh_admin_device") === "1") {
          return;
        }

        const tracked = sessionStorage.getItem("fbh_session_tracked");
        if (!tracked) {
          sessionStorage.setItem("fbh_session_tracked", "1");
          fetch("/api/track-visit", { method: "POST" }).catch(() => {});
        }
      }
    } catch {}
  }, []);

  return null;
}
