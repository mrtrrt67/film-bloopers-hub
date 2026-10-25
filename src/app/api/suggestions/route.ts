import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminDb = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { email, messaggio } = body;

    if (!messaggio || !messaggio.trim()) {
      return NextResponse.json(
        { error: "Il messaggio o suggerimento non può essere vuoto." },
        { status: 400 }
      );
    }

    const emailUtente = (user?.email || email || "").trim();
    if (!emailUtente) {
      return NextResponse.json(
        { error: "Inserisci un indirizzo email valido per poter ricevere un riscontro." },
        { status: 400 }
      );
    }

    let isPriority = false;
    let finalMessage = messaggio.trim();

    if (user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tier, tipo_abbonamento")
        .eq("id", user.id)
        .maybeSingle();

      if (prof && (prof.tipo_abbonamento === "annuale" || prof.tipo_abbonamento === "lifetime")) {
        isPriority = true;
        finalMessage = `[PRIORITARIO ⚡ - Piano ${prof.tipo_abbonamento.toUpperCase()}] ${finalMessage}`;
      }
    }

    const { error: insertErr } = await adminDb.from("suggerimenti").insert({
      user_id: user?.id || null,
      email: emailUtente,
      messaggio: finalMessage,
    });

    if (insertErr) {
      console.error("Errore salvataggio suggerimento:", insertErr);
      return NextResponse.json(
        { error: "Errore durante il salvataggio del suggerimento: " + insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Grazie! Il tuo suggerimento è stato inviato allo staff e verrà esaminato a breve.",
    });
  } catch (err: any) {
    console.error("Errore suggerimenti API:", err);
    return NextResponse.json(
      { error: err?.message || "Errore interno durante l'invio del suggerimento" },
      { status: 500 }
    );
  }
}
