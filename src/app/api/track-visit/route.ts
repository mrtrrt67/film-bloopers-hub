import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestAccount } from "@/lib/test-accounts";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Ignora categoricamente visite dell'amministratore e di qualsiasi utente di test
    if (user && isTestAccount(user.email, user.user_metadata?.username)) {
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

      if (isTestAccount(user.email, prof?.username)) {
        return NextResponse.json({ ok: true, ignored: true });
      }

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
