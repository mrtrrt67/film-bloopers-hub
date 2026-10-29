import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestAccount, isTestAccessType, shouldExcludeTestAccounts } from "@/lib/test-accounts";
import { deduplicateAccessRecords } from "@/lib/dedup-visits";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "500", 10), 10), 1000);
    const excludeTests = shouldExcludeTestAccounts(request);

    const [errRes, callsRes, accessRes, profilesRes] = await Promise.all([
      supabase.from("log_errori_ia").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("statistiche_ia").select("*").order("data_chiamata", { ascending: false }).limit(limit),
      supabase.from("log_accessi").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("profiles").select("id, username, email"),
    ]);

    const adminIdPrefix = user.id.slice(0, 8);

    // Mappa per risolvere gli username reali dei visitatori registrati
    const profileMap = new Map<string, string>();
    const testPrefixes = new Set<string>();
    testPrefixes.add(adminIdPrefix.toLowerCase());

    (profilesRes.data || []).forEach((p: any) => {
      const uName = p.username || p.email?.split("@")[0] || "Utente";
      if (p.id) {
        profileMap.set(p.id.slice(0, 8).toLowerCase(), uName);
        profileMap.set(p.id.toLowerCase(), uName);
      }
      if (p.email) {
        profileMap.set(p.email.toLowerCase(), uName);
      }

      // Raccoglie i prefissi e username di test SOLO se excludeTests è attivo (produzione)
      if (excludeTests && isTestAccount(p.email, p.username)) {
        if (p.id) {
          testPrefixes.add(p.id.slice(0, 8).toLowerCase());
          testPrefixes.add(p.id.toLowerCase());
        }
        if (p.username) testPrefixes.add(p.username.toLowerCase());
        if (p.email) testPrefixes.add(p.email.toLowerCase());
      }
    });

    // 1. Filtra admin e account test (in produzione)
    const filteredRawAccess = (accessRes.data || []).filter((a: any) => {
      const t = (a.tipo || "").toLowerCase();
      if (t.includes(adminIdPrefix) || t.includes("mrtrrt67") || t.includes(adminEmail) || t === "admin") {
        return false;
      }
      if (excludeTests && isTestAccessType(a.tipo, testPrefixes)) {
        return false;
      }
      return true;
    });

    // 2. Deduplica cloni generati entro 4 secondi (doppio mount React, chiamate parallele)
    const { uniqueRecords: deduplicatedAccess, duplicateIds } = deduplicateAccessRecords(filteredRawAccess, 4000);

    // 3. Pulizia permanente dei duplicati storici dal database con i privilegi dell'admin
    if (duplicateIds.length > 0) {
      const dbToClean = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
      void (async () => {
        try {
          for (let i = 0; i < duplicateIds.length; i += 100) {
            const batch = duplicateIds.slice(i, i + 100);
            await dbToClean.from("log_accessi").delete().in("id", batch);
          }
        } catch (cleanupErr) {
          console.warn("Pulizia duplicati log_accessi non riuscita:", cleanupErr);
        }
      })();
    }

    // 4. Mappatura finale per UI
    const recentAccess = deduplicatedAccess
      .map((a: any) => {
        const rawTipo = a.tipo || "ospite";
        if (rawTipo === "ospite") {
          return {
            ...a,
            isGuest: true,
            username: null,
          };
        }

        let resolvedUsername = "Utente";
        if (rawTipo.startsWith("utente:")) {
          resolvedUsername = rawTipo.slice(7);
        } else if (rawTipo.startsWith("utente_")) {
          const prefix = rawTipo.slice(7).toLowerCase();
          resolvedUsername = profileMap.get(prefix) || prefix;
        } else if (rawTipo.includes("@")) {
          resolvedUsername = profileMap.get(rawTipo.toLowerCase()) || rawTipo.split("@")[0];
        } else {
          resolvedUsername = profileMap.get(rawTipo.toLowerCase()) || rawTipo;
        }

        return {
          ...a,
          isGuest: false,
          username: resolvedUsername,
        };
      })
      .filter((a: any) => {
        if (a.isGuest) return true;
        if (excludeTests && isTestAccount(null, a.username)) return false;
        return true;
      });

    return NextResponse.json({
      aiErrors: errRes.data || [],
      recentAiCalls: callsRes.data || [],
      recentAccess,
    });
  } catch (err: any) {
    console.error("Errore log admin:", err);
    return NextResponse.json({ error: err.message || "Errore recupero log" }, { status: 500 });
  }
}
