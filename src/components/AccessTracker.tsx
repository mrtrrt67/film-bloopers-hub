"use client";

import { useEffect, useRef } from "react";

// Guard a livello di modulo in memoria: previene rigorosamente la doppia esecuzione
// causata da React StrictMode o cicli di idratazione concorrente nello stesso frame JS.
let isModuleTracked = false;

export default function AccessTracker() {
  const hasRun = useRef(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // 1. Non tracciare MAI le visite all'interno del pannello admin
      if (window.location.pathname.startsWith("/admin")) {
        return;
      }

      // 2. Blocco immediato in memoria (elimina doppie esecuzioni entro millisecondi)
      if (isModuleTracked || hasRun.current) return;
      hasRun.current = true;
      isModuleTracked = true;

      // 3. Rilevamento istantaneo dell'amministratore da localStorage (sessione Supabase o flag dispositivo)
      const isAdminDevice = localStorage.getItem("fbh_admin_device") === "1";
      if (isAdminDevice) {
        return;
      }

      // Controllo proattivo se esiste un token auth Supabase legato all'admin
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          const val = localStorage.getItem(key) || "";
          if (val.toLowerCase().includes("mrtrrt67")) {
            localStorage.setItem("fbh_admin_device", "1");
            return;
          }
        }
      }

      // 4. Debounce temporale su localStorage: previene duplicati su refresh rapidi (60s)
      const now = Date.now();
      const lastVisit = localStorage.getItem("fbh_last_visit_ts");
      if (lastVisit && now - parseInt(lastVisit, 10) < 60000) {
        return;
      }

      // 5. Blocco a livello di sessione tab
      const sessionTracked = sessionStorage.getItem("fbh_session_tracked");
      if (sessionTracked) return;

      sessionStorage.setItem("fbh_session_tracked", "1");
      localStorage.setItem("fbh_last_visit_ts", now.toString());

      fetch("/api/track-visit", {
        method: "POST",
        credentials: "include",
        headers: {
          "x-page-path": window.location.pathname,
        },
      }).catch(() => {});
    } catch {}
  }, []);

  return null;
}
