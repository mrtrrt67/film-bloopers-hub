import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();

    // Ignora categoricamente qualsiasi visita dell'amministratore
    if (user && (user.email?.toLowerCase() === adminEmail || user.email?.toLowerCase().includes("mrtrrt67"))) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    let tipo = "ospite";

    if (user) {
      // Recupera lo username dal profilo per registrarlo chiaramente
      const { data: prof } = await db
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      const username =
        prof?.username ||
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        `utente_${user.id.slice(0, 8)}`;

      tipo = `utente:${username}`;
    }

    await db.from("log_accessi").insert({ tipo });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
