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

      // 1. Blocco immediato in memoria (elimina doppie esecuzioni entro millisecondi)
      if (isModuleTracked || hasRun.current) return;
      hasRun.current = true;
      isModuleTracked = true;

      // 2. Dispositivo dell'amministratore permanentemente escluso
      if (localStorage.getItem("fbh_admin_device") === "1") {
        return;
      }

      // 3. Debounce temporale su localStorage: previene duplicati su refresh rapidi (60s)
      const now = Date.now();
      const lastVisit = localStorage.getItem("fbh_last_visit_ts");
      if (lastVisit && now - parseInt(lastVisit, 10) < 60000) {
        return;
      }

      // 4. Blocco a livello di sessione
      const sessionTracked = sessionStorage.getItem("fbh_session_tracked");
      if (sessionTracked) return;

      sessionStorage.setItem("fbh_session_tracked", "1");
      localStorage.setItem("fbh_last_visit_ts", now.toString());

      fetch("/api/track-visit", { method: "POST" }).catch(() => {});
    } catch {}
  }, []);

  return null;
}
