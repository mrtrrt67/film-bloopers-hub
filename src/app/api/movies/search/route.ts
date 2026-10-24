import { NextResponse } from "next/server";
import { searchTMDBMovies } from "@/lib/tmdb";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const year = searchParams.get("year") || undefined;

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  // Registra termine in log_ricerche (se ha almeno 2 caratteri)
  if (q.trim().length >= 2) {
    try {
      const adminDb = createAdminClient();
      await adminDb.from("log_ricerche").insert({ termine: q.trim() });
    } catch (err) {
      console.error("Errore salvataggio log_ricerche:", err);
    }
  }

  const results = await searchTMDBMovies(q, year);
  return NextResponse.json({ results });
}
