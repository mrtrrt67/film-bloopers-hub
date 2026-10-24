import { NextResponse } from "next/server";
import { searchTMDBMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const year = searchParams.get("year") || undefined;

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchTMDBMovies(q, year);
  return NextResponse.json({ results });
}
