import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractClientMetadata } from "@/lib/request-meta";

// Rate limiter in-memory per prevenire spam massivo
const suggestionRateMap = new Map<string, { count: number; resetAt: number }>();

function checkSuggestionRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = suggestionRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    suggestionRateMap.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const meta = extractClientMetadata(request);
    const clientIp = meta.ip_address || "anonymous";

    if (!checkSuggestionRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Hai inviato troppi messaggi di recente. Riprova più tardi." },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const { email, messaggio, company, website, url: honeypotUrl } = body;

    // Trap honeypot: se i campi invisibili ai bot sono compilati, simula successo senza inserire
    if (company || website || honeypotUrl) {
      return NextResponse.json({ ok: true, received: true });
    }

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

    let finalMessage = messaggio.trim();

    if (user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tier, tipo_abbonamento")
        .eq("id", user.id)
        .maybeSingle();

      if (prof && (prof.tipo_abbonamento === "annuale" || prof.tipo_abbonamento === "lifetime")) {
        finalMessage = `[PRIORITARIO ⚡ - Piano ${prof.tipo_abbonamento.toUpperCase()}] ${finalMessage}`;
      }
    }

    const { error: insertErr } = await db.from("suggerimenti").insert({
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
