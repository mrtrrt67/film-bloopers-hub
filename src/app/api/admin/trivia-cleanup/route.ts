import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    const body = await request.json().catch(() => ({}));
    const scope = body?.scope || "all"; // "all" (elimina batch fittizio completo) oppure "junk_only" (elimina solo righe vuote e __TEST__)

    let deletedJunk = 0;
    let deletedTotal = 0;

    // 1. Elimina prima tutte le righe palesemente corrotte o di test (descrizione vuota o titolo TEST)
    const { data: junkRows } = await db
      .from("movie_trivia")
      .select("id")
      .or("descrizione.eq.,titolo.ilike.%test%");

    if (junkRows && junkRows.length > 0) {
      const junkIds = junkRows.map((r: any) => r.id);
      await db.from("movie_trivia").delete().in("id", junkIds);
      deletedJunk = junkIds.length;
    }

    if (scope === "junk_only") {
      const { count: remainingCount } = await db.from("movie_trivia").select("id", { count: "exact" });
      return NextResponse.json({
        success: true,
        message: `Bonifica completata: rimosse ${deletedJunk} curiosità corrotte/di test. Totale curiosità attuali: ${remainingCount}.`,
        deletedCount: deletedJunk,
        remainingTrivia: remainingCount || 0,
      });
    }

    // 2. Se scope === "all", elimina a cicli di 300 tutte le curiosità generate dai batch automatici per ripristinare il catalogo
    const chunkSize = 300;
    while (true) {
      const { data: batchRows, error: errFetch } = await db
        .from("movie_trivia")
        .select("id")
        .limit(chunkSize);

      if (errFetch) throw errFetch;
      if (!batchRows || batchRows.length === 0) break;

      const ids = batchRows.map((r: any) => r.id);
      const { error: errDel } = await db.from("movie_trivia").delete().in("id", ids);
      if (errDel) throw errDel;

      deletedTotal += ids.length;
    }

    const { count: finalTotal } = await db.from("movie_trivia").select("id", { count: "exact" });

    return NextResponse.json({
      success: true,
      message: `Pulizia curiosità completata con successo! Rimosse ${deletedTotal} curiosità complessive (comprese ${deletedJunk} corrotte). Il catalogo è ora pronto per la scansione autentica a zero allucinazioni.`,
      deletedCount: deletedTotal,
      remainingTrivia: finalTotal || 0,
    });
  } catch (err: any) {
    console.error("Errore pulizia curiosità:", err);
    return NextResponse.json({ error: err.message || "Errore durante la pulizia curiosità" }, { status: 500 });
  }
}

