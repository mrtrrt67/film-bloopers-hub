import { translateFilmText } from "@/lib/translator";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("configurazioni")
      .select("*")
      .order("chiave", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ configs: data || [] });
  } catch (err: any) {
    console.error("Errore configurazioni admin:", err);
    return NextResponse.json({ error: err.message || "Errore configurazioni" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { items } = await request.json(); // array di { chiave, valore, visibile }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Formato non valido, atteso array 'items'" }, { status: 400 });
    }

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    for (const item of items) {
      if (item.chiave) {
        const { error: updErr } = await adminDb
          .from("configurazioni")
          .upsert({
            chiave: item.chiave,
            valore: item.valore,
            visibile: item.visibile !== undefined ? item.visibile : true,
          }, { onConflict: "chiave" });

        if (updErr) {
          console.error("Errore aggiornamento configurazione:", item.chiave, updErr);
        }

        // Se è una chiave testuale (es. banner promo, annunci), genera automaticamente le traduzioni per le altre 4 lingue
        const isTranslatableKey = /^(home_banner_top_(titolo|testo|badge|btn)|annuncio_|promo_)/.test(item.chiave);
        if (isTranslatableKey && typeof item.valore === "string" && item.valore.trim().length > 0) {
          try {
            const trans = await translateFilmText(item.valore, "general");
            for (const lang of ["en", "es", "fr", "de"] as const) {
              const langVal = trans[lang];
              if (langVal) {
                await adminDb.from("configurazioni").upsert({
                  chiave: `${item.chiave}_${lang}`,
                  valore: langVal,
                  visibile: item.visibile !== undefined ? item.visibile : true,
                }, { onConflict: "chiave" });
              }
            }
          } catch (tErr) {
            console.warn("Auto-traduzione configurazione fallita per:", item.chiave, tErr);
          }
        }
      }
    }

    // Invalida la cache delle pagine interessate per mostrare subito le nuove configurazioni
    revalidatePath("/");
    revalidatePath("/pricing");
    revalidatePath("/classifica");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Errore salvataggio configurazioni:", err);
    return NextResponse.json({ error: err.message || "Errore salvataggio configurazioni" }, { status: 500 });
  }
}
