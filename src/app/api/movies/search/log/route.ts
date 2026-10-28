import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();

    // 1. Esclude rigorosamente le ricerche dell'amministratore
    if (user && user.email?.toLowerCase() === adminEmail) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const body = await request.json().catch(() => ({}));
    const rawTerm = (body.filmTitle || body.query || "").trim();

    // Non registrare ricerche vuote o troppo corte (almeno 2 caratteri)
    if (!rawTerm || rawTerm.length < 2) {
      return NextResponse.json({ ok: false, error: "Termine troppo corto" }, { status: 400 });
    }

    // Normalizza spazi multipli
    const cleanTerm = rawTerm.replace(/\s+/g, " ");

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    // 2. Controllo anti-frammenti: se negli ultimi 45 secondi è stata registrata
    // una ricerca che è prefisso del termine attuale, aggiorna la riga esistente
    const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000).toISOString();
    const { data: recentSearches } = await db
      .from("log_ricerche")
      .select("id, termine")
      .gte("created_at", fortyFiveSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(3);

    const lowerClean = cleanTerm.toLowerCase();
    const matchingPrefix = (recentSearches || []).find((r) => {
      const prev = (r.termine || "").toLowerCase();
      // Se il termine precedente è una sottostringa o prefisso di quello nuovo
      return lowerClean.startsWith(prev) || prev === lowerClean;
    });

    if (matchingPrefix) {
      // Aggiorna la riga esistente con il termine più completo
      await db
        .from("log_ricerche")
        .update({ termine: cleanTerm })
        .eq("id", matchingPrefix.id);

      return NextResponse.json({ ok: true, updated: true });
    }

    // 3. Altrimenti registra il nuovo termine completo
    await db.from("log_ricerche").insert({ termine: cleanTerm });

    return NextResponse.json({ ok: true, inserted: true });
  } catch (err: any) {
    console.error("Errore salvataggio log_ricerche:", err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
