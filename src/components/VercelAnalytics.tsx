"use client";

import { Analytics } from "@vercel/analytics/next";

export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (typeof window === "undefined") return event;

        try {
          // 1. Escludi se si trova nel percorso del pannello admin
          if (window.location.pathname.startsWith("/admin")) {
            return null;
          }

          // 2. Escludi se il dispositivo è marcato come admin
          if (localStorage.getItem("fbh_admin_device") === "1") {
            return null;
          }

          // 3. Controllo preventivo token di autenticazione admin in localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
              const val = localStorage.getItem(key) || "";
              if (val.toLowerCase().includes("mrtrrt67")) {
                localStorage.setItem("fbh_admin_device", "1");
                return null;
              }
            }
          }
        } catch {
          // In caso di errore di accesso a storage locale (es. restrizioni iframe/privacy), mantieni l'evento
        }

        return event;
      }}
    />
  );
}

