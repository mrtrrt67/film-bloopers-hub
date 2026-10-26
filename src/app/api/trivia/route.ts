import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const adminDb = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { action, trivia_id, film_id, categoria, titolo, descrizione, fonte } = body;

    // Azione 1: Like / Cuore a una curiosità
    if (action === "like" && trivia_id) {
      // Incrementa like con admin client
      const { data: current } = await adminDb
        .from("movie_trivia")
        .select("likes")
        .eq("id", trivia_id)
        .single();

      const newLikes = (current?.likes || 0) + 1;
      const { data: updated, error } = await adminDb
        .from("movie_trivia")
        .update({ likes: newLikes })
        .eq("id", trivia_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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

      const { data: inserted, error } = await adminDb
        .from("movie_trivia")
        .insert({
          film_id,
          categoria: categoria || "Curiosità & Retroscena",
          titolo,
          descrizione,
          fonte: fonte || null,
          approvato: isUserAdmin, // Se inserito da admin è già approvato, altrimenti da moderare
          inserito_da: authorHandle,
          provenienza: "utente",
          likes: 0,
        })
        .select()
        .single();

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
