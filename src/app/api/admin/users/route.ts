import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ profiles: profiles || [] });
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

    const updatePayload: Record<string, any> = {};
    if (resetCalls || calls_today !== undefined) {
      updatePayload.calls_today = calls_today !== undefined ? calls_today : 0;
    }
    if (tier !== undefined) {
      updatePayload.tier = tier;
    }
    if (tipo_abbonamento !== undefined) {
      updatePayload.tipo_abbonamento = tipo_abbonamento;
      updatePayload.subscription_type = tipo_abbonamento;
    }
    if (data_scadenza !== undefined) {
      updatePayload.data_scadenza = data_scadenza;
      updatePayload.expires_at = data_scadenza;
    }

    const { data, error } = await supabase
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

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("Errore eliminazione profilo:", err);
    return NextResponse.json({ error: err.message || "Errore eliminazione profilo" }, { status: 500 });
  }
}
