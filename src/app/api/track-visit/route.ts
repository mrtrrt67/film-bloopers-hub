import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestAccount, shouldExcludeTestAccounts } from "@/lib/test-accounts";

// Cache in memoria per deduplicare chiamate identiche arrivate entro pochi secondi
const recentVisitsCache = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();

    // L'amministratore non viene mai tracciato per non inquinare le visite
    if (user && (user.email?.toLowerCase() === adminEmail || user.email?.toLowerCase().includes("mrtrrt67"))) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const excludeTests = shouldExcludeTestAccounts(request);

    // In PRODUZIONE ignoriamo le visite degli utenti di test.
    // In STAGING invece tracciamo regolarmente per consentire i test di verifica.
    if (excludeTests && user && isTestAccount(user.email, user.user_metadata?.username)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    let tipo = "ospite";

    if (user) {
      // Recupera lo username dal profilo per registrarlo chiaramente
      const { data: prof } = await db
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (excludeTests && isTestAccount(user.email, prof?.username)) {
        return NextResponse.json({ ok: true, ignored: true });
      }

      const username =
        prof?.username ||
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        `utente_${user.id.slice(0, 8)}`;

      tipo = `utente:${username}`;
    }

    // 1. Deduplicazione Server-Side in memoria (IP + Tipo entro 5 secondi)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown_ip";

    const cacheKey = `${clientIp}_${tipo}`;
    const now = Date.now();
    const lastSeen = recentVisitsCache.get(cacheKey);

    if (lastSeen && now - lastSeen < 5000) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }
    recentVisitsCache.set(cacheKey, now);

    // Pulizia periodica della cache in memoria
    if (recentVisitsCache.size > 500) {
      const cutoff = now - 30000;
      for (const [k, time] of recentVisitsCache.entries()) {
        if (time < cutoff) recentVisitsCache.delete(k);
      }
    }

    // 2. Deduplicazione Database: controlla se lo stesso tipo è stato registrato negli ultimi 3 secondi
    const threeSecondsAgo = new Date(now - 3000).toISOString();
    const { data: recentDbRow } = await db
      .from("log_accessi")
      .select("id")
      .eq("tipo", tipo)
      .gte("created_at", threeSecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentDbRow) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    await db.from("log_accessi").insert({ tipo });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
