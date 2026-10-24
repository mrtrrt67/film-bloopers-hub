import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const filter = searchParams.get("filter") || "all"; // 'all', 'missing_poster', 'missing_cast'

    let req = supabase.from("films").select("id, titolo, anno, regista, genere, trama, poster_url, attori, creato_il");

    if (query.trim()) {
      req = req.or(`titolo.ilike.%${query.trim()}%,regista.ilike.%${query.trim()}%,genere.ilike.%${query.trim()}%`);
    }

    if (filter === "missing_poster") {
      req = req.or("poster_url.is.null,poster_url.eq.");
    } else if (filter === "missing_cast") {
      req = req.or("attori.is.null,attori.eq.");
    }

    req = req.order("titolo", { ascending: true });

    const { data, error } = await req;
    if (error) throw error;

    return NextResponse.json({ films: data || [] });
  } catch (err: any) {
    console.error("Errore recupero archivio film:", err);
    return NextResponse.json({ error: err.message || "Errore film" }, { status: 500 });
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

    const body = await request.json();
    const { id, titolo, anno, regista, genere, trama, poster_url, attori } = body;

    if (!id) {
      return NextResponse.json({ error: "ID film mancante" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (titolo !== undefined) updatePayload.titolo = titolo;
    if (anno !== undefined) updatePayload.anno = anno ? parseInt(String(anno), 10) : null;
    if (regista !== undefined) updatePayload.regista = regista;
    if (genere !== undefined) updatePayload.genere = genere;
    if (trama !== undefined) updatePayload.trama = trama;
    if (poster_url !== undefined) updatePayload.poster_url = poster_url || null;
    if (attori !== undefined) updatePayload.attori = attori;

    const { data, error } = await supabase
      .from("films")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, film: data });
  } catch (err: any) {
    console.error("Errore aggiornamento film:", err);
    return NextResponse.json({ error: err.message || "Errore salvataggio" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID film mancante" }, { status: 400 });
    }

    // Elimina prima eventuali errori associati per evitare vincoli di foreign key
    await supabase.from("errori").delete().eq("film_id", id);
    const { error } = await supabase.from("films").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("Errore eliminazione film:", err);
    return NextResponse.json({ error: err.message || "Errore eliminazione" }, { status: 500 });
  }
}
