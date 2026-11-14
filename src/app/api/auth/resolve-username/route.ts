import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractClientMetadata } from "@/lib/request-meta";

// Rate limiting anti-enumeration: massimo 15 tentativi al minuto per IP
const resolveRateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = resolveRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    resolveRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const meta = extractClientMetadata(request);
    const ip = meta.ip_address || "anonymous";
    if (!checkRate(ip)) {
      return NextResponse.json(
        { error: "Troppi tentativi di ricerca account. Riprova tra un minuto." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawUsername = (body.username || "").trim().toLowerCase().replace(/^@/, "");

    if (!rawUsername || rawUsername.length < 2) {
      return NextResponse.json(
        { error: "Inserisci uno username valido (almeno 2 caratteri)." },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Configurazione server incompleta." },
        { status: 500 }
      );
    }

    const adminDb = createAdminClient();

    // 1. Cerca per colonna username esatta o case-insensitive
    const { data: pUser } = await adminDb
      .from("profiles")
      .select("email")
      .ilike("username", rawUsername)
      .maybeSingle();

    if (pUser?.email) {
      return NextResponse.json({ email: pUser.email });
    }

    // 2. Fallback per prefisso email (es. username "alex" corrisponde a "alex@gmail.com")
    const { data: pPrefix } = await adminDb
      .from("profiles")
      .select("email")
      .ilike("email", `${rawUsername}@%`)
      .maybeSingle();

    if (pPrefix?.email) {
      return NextResponse.json({ email: pPrefix.email });
    }

    return NextResponse.json(
      { error: `Nessun account trovato per l'username "@${rawUsername}".` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Errore resolve-username:", err);
    return NextResponse.json(
      { error: "Errore interno durante la verifica dell'account." },
      { status: 500 }
    );
  }
}
