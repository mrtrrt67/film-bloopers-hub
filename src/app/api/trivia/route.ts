import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateFilmText } from "@/lib/translator";
import { extractClientMetadata } from "@/lib/request-meta";

// Rate limiter in-memory per prevenire spam bot sui like delle curiosità
const triviaLikesRateMap = new Map<string, { count: number; resetAt: number }>();

function checkTriviaLikeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = triviaLikesRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    triviaLikesRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const film_id = searchParams.get("film_id");

    if (!film_id) {
      return NextResponse.json({ error: "film_id richiesto" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: trivia, error } = await supabase
      .from("movie_trivia")
      .select("*")
      .eq("film_id", film_id)
      .eq("approvato", true)
      .order("ordine", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trivia: trivia || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { action, trivia_id, film_id, categoria, titolo, descrizione, fonte } = body;

    // Azione 1: Like / Cuore a una curiosità
    if (action === "like" && trivia_id) {
      const meta = extractClientMetadata(request);
      const clientIp = meta.ip_address || "anonymous";
      if (!checkTriviaLikeRateLimit(clientIp)) {
        return NextResponse.json(
          { error: "Troppi mi piace inviati in breve tempo. Riprova tra poco." },
          { status: 429 }
        );
      }

      const cleanTriviaId = typeof trivia_id === "number" ? trivia_id : parseInt(String(trivia_id), 10);
      if (isNaN(cleanTriviaId) || cleanTriviaId <= 0) {
        return NextResponse.json({ error: "trivia_id non valido" }, { status: 400 });
      }

      // 1. Prova prima con RPC atomica se disponibile
      const { data: rpcLikes, error: rpcErr } = await supabase.rpc("increment_trivia_likes", { trivia_id: cleanTriviaId });
      if (!rpcErr && typeof rpcLikes === "number") {
        return NextResponse.json({ success: true, likes: rpcLikes });
      }

      // 2. Altrimenti lettura e update con db
      const { data: current } = await db
        .from("movie_trivia")
        .select("likes")
        .eq("id", cleanTriviaId)
        .single();

      const newLikes = (current?.likes || 0) + 1;
      const { error: updErr } = await db
        .from("movie_trivia")
        .update({ likes: newLikes })
        .eq("id", cleanTriviaId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, likes: newLikes });
    }

    // Azione 2: Proposta manuale di una curiosità da parte di un utente
    if (action === "submit") {
      if (!user) {
        return NextResponse.json({ error: "Accesso richiesto per proporre curiosità" }, { status: 401 });
      }

      if (!film_id || !titolo || !descrizione) {
        return NextResponse.json({ error: "Dati incompleti" }, { status: 400 });
      }

      const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
      const isUserAdmin = user.email && user.email.toLowerCase() === adminEmail;

      const authorHandle = user.user_metadata?.username
        ? `@${user.user_metadata.username.replace(/^@/, "")}`
        : user.email
        ? `@${user.email.split("@")[0]}`
        : "Utente";

      let transTitle: Record<string, string> = {};
      let transDesc: Record<string, string> = {};
      try {
        transTitle = await translateFilmText(titolo, "trivia");
        transDesc = await translateFilmText(descrizione, "trivia");
      } catch (tErr) {
        console.warn("Auto-traduzione trivia utente warning:", tErr);
      }

      const daInserire = {
        film_id,
        categoria: categoria || "Curiosità & Retroscena",
        titolo,
        descrizione,
        titolo_i18n: transTitle,
        descrizione_i18n: transDesc,
        fonte: fonte || null,
        approvato: isUserAdmin, // Se inserito da admin è già approvato, altrimenti da moderare
        inserito_da: authorHandle,
        provenienza: "utente",
        likes: 0,
      };

      let { data: inserted, error } = await db
        .from("movie_trivia")
        .insert(daInserire)
        .select()
        .single();

      if (error && db !== supabase) {
        const retry = await supabase.from("movie_trivia").insert(daInserire).select().single();
        if (!retry.error && retry.data) {
          inserted = retry.data;
          error = null;
        } else {
          error = retry.error || error;
        }
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        trivia: inserted,
        message: isUserAdmin
          ? "Curiosità pubblicata con successo!"
          : "Curiosità inviata! Sarà visibile appena approvata dalla moderazione.",
      });
    }

    return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore interno" }, { status: 500 });
  }
}
