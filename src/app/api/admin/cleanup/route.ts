import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const adminDb = createAdminClient();

    // 1. Azzeramento suggerimenti
    await adminDb.from("suggerimenti").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Azzeramento voti e contestazioni
    await adminDb.from("voti_bloopers").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Reset contatori conferme e contestazioni su errori
    await adminDb.from("errori").update({ conferme: 0, contestazioni: 0 }).neq("id", 0);

    // 4. Azzeramento moderazioni (elimina segnalazioni non approvate)
    await adminDb.from("errori").delete().eq("approvato", false);

    // 5. Eliminazione film e bloopers di test
    await adminDb.from("errori").delete().eq("film_id", 233);
    await adminDb.from("films").delete().eq("id", 233);

    // 6. Reset classifiche (punti a zero)
    await adminDb.from("profiles").update({
      punti: 0,
      punti_premiati: 0,
      calls_today: 0,
    }).neq("id", "00000000-0000-0000-0000-000000000000");

    // 7. Reset log ricerche
    await adminDb.from("log_ricerche").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    return NextResponse.json({
      success: true,
      message: "Pulizia ambiente di produzione completata con successo! Dati di test, ricerche, voti e classifiche azzerati.",
    });
  } catch (err: any) {
    console.error("Errore pulizia produzione:", err);
    return NextResponse.json({ error: err.message || "Errore pulizia produzione" }, { status: 500 });
  }
}
