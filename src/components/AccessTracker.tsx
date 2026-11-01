"use client";

import { useEffect, useRef } from "react";
import { createPublicClient } from "@/lib/supabase/public";

export default function AccessTracker() {
  const hasRunInitial = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Non tracciare MAI le visite all'interno del pannello admin
    if (window.location.pathname.startsWith("/admin")) {
      return;
    }

    const checkAndTrack = async (customUser?: any) => {
      try {
        // 2. Dispositivo admin permanentemente escluso
        if (localStorage.getItem("fbh_admin_device") === "1") {
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

        const supabase = createPublicClient();
        const user = customUser !== undefined ? customUser : (await supabase.auth.getUser()).data?.user;

        // Se è l'admin, escludi permanentemente
        if (user?.email && (user.email.toLowerCase().includes("mrtrrt67") || user.email.toLowerCase() === "mrtrrt67@gmail.com")) {
          localStorage.setItem("fbh_admin_device", "1");
          return;
        }

        // Se l'utente è autenticato, traccia come utente se non ancora tracciato per questo ID in questa sessione
        if (user?.id) {
          const trackedUser = sessionStorage.getItem("fbh_tracked_user_id");
          if (trackedUser === user.id) {
            return;
          }
          sessionStorage.setItem("fbh_tracked_user_id", user.id);
          sessionStorage.setItem("fbh_session_tracked", "1");
          localStorage.setItem("fbh_last_visit_ts", Date.now().toString());

          fetch("/api/track-visit", {
            method: "POST",
            credentials: "include",
            headers: {
              "x-page-path": window.location.pathname,
            },
          }).catch(() => {});
          return;
        }

        // Se è un ospite anonimo:
        const sessionTracked = sessionStorage.getItem("fbh_session_tracked");
        if (sessionTracked) return;

        const now = Date.now();
        const lastVisit = localStorage.getItem("fbh_last_visit_ts");
        if (lastVisit && now - parseInt(lastVisit, 10) < 60000) {
          return;
        }

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
    };

    if (!hasRunInitial.current) {
      hasRunInitial.current = true;
      checkAndTrack();
    }

    // Ascolta cambi di autenticazione: se l'utente effettua login o si registra, traccia immediatamente la visita autenticata!
    const supabase = createPublicClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        checkAndTrack(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
