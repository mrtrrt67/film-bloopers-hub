import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    // Elimina a cicli di 300 per superare il limite standard di 1000 righe di PostgREST
    let totalDeleted = 0;
    const chunkSize = 300;

    while (true) {
      const { data: batchErrori, error: errFetch } = await db
        .from("errori")
        .select("id")
        .gte("creato_il", "2026-10-26T00:00:00")
        .limit(chunkSize);

      if (errFetch) throw errFetch;
      if (!batchErrori || batchErrori.length === 0) break;

      const ids = batchErrori.map((e: any) => e.id);

      // Elimina prima eventuali voti associati per evitare vincoli foreign key
      try {
        await db.from("voti_bloopers").delete().in("errore_id", ids);
      } catch (e) {
        console.warn("Nessun voto collegato eliminato o tabella assente:", e);
      }

      // Elimina il blocco di bloopers generati
      const { error: errDel } = await db.from("errori").delete().in("id", ids);
      if (errDel) {
        console.error("Errore durante eliminazione chunk errori:", errDel);
        throw errDel;
      }

      totalDeleted += ids.length;
    }

    const { count: finalTotal } = await db.from("errori").select("id", { count: "exact" });

    return NextResponse.json({
      success: true,
      message: totalDeleted > 0
        ? `Ripristino completato con successo! Rimossi ${totalDeleted} bloopers sintetici generati dai batch. Catalogo ripristinato ai ${finalTotal} bloopers originali autentici e verificati.`
        : `Nessun blooper sintetico da rimuovere. Il catalogo contiene già solo i ${finalTotal} bloopers autentici!`,
      deletedCount: totalDeleted,
      remainingBloopers: finalTotal || 0,
    });
  } catch (err: any) {
    console.error("Errore bloopers cleanup:", err);
    return NextResponse.json({ error: err.message || "Errore interno durante la pulizia" }, { status: 500 });
  }
}
