import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { data: rawProfiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);

    const profiles = (rawProfiles || []).map((p) => {
      const isUserAdmin = p.email?.toLowerCase() === adminEmail;
      const lastResetStr = p.last_reset_date ? String(p.last_reset_date).slice(0, 10) : "";
      
      // Le chiamate di OGGI sono conteggiate solo se last_reset_date coincide con la data odierna
      const callsTodayReal = isUserAdmin ? 0 : (lastResetStr === today ? (p.calls_today || 0) : 0);

      // Verifica eventuale scadenza abbonamento mensile
      const tipoSub = p.tipo_abbonamento || p.subscription_type || "nessuno";
      const scadenza = p.data_scadenza || p.expires_at ? String(p.data_scadenza || p.expires_at).slice(0, 10) : null;
      const isExpired = tipoSub === "mensile" && scadenza ? scadenza < today : false;

      let tierEffettivo = p.tier || "free";
      if (isUserAdmin) {
        tierEffettivo = "admin";
      }

      return {
        ...p,
        tier: tierEffettivo,
        tipo_abbonamento: isUserAdmin ? "illimitato" : tipoSub,
        data_scadenza: scadenza,
        calls_today_real: callsTodayReal,
        is_admin: isUserAdmin,
        is_expired: isExpired,
      };
    });

    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error("Errore utenti admin:", err);
    return NextResponse.json({ error: err.message || "Errore profili" }, { status: 500 });
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
    const { id, tier, tipo_abbonamento, data_scadenza, calls_today, resetCalls } = body;

    if (!id) {
      return NextResponse.json({ error: "ID utente mancante" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatePayload: Record<string, any> = {};

    if (resetCalls || calls_today !== undefined) {
      updatePayload.calls_today = calls_today !== undefined ? calls_today : 0;
      updatePayload.last_reset_date = today;
    }
    if (tier !== undefined) {
      updatePayload.tier = tier;
    }
    if (tipo_abbonamento !== undefined) {
      updatePayload.tipo_abbonamento = tipo_abbonamento;
      updatePayload.subscription_type = tipo_abbonamento;
    }
    if (data_scadenza !== undefined) {
      updatePayload.data_scadenza = data_scadenza || null;
      updatePayload.expires_at = data_scadenza ? `${data_scadenza}T23:59:59Z` : null;
    }

    const adminDb = createAdminClient();
    const { data, error } = await adminDb
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (err: any) {
    console.error("Errore aggiornamento utente:", err);
    return NextResponse.json({ error: err.message || "Errore aggiornamento utente" }, { status: 500 });
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
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { error } = await adminDb.from("profiles").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("Errore eliminazione profilo:", err);
    return NextResponse.json({ error: err.message || "Errore eliminazione profilo" }, { status: 500 });
  }
}
