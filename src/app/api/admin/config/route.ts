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

    const { data, error } = await supabase
      .from("configurazioni")
      .select("*")
      .order("chiave", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ configs: data || [] });
  } catch (err: any) {
    console.error("Errore configurazioni admin:", err);
    return NextResponse.json({ error: err.message || "Errore configurazioni" }, { status: 500 });
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

    const { items } = await request.json(); // array di { chiave, valore, visibile }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Formato non valido, atteso array 'items'" }, { status: 400 });
    }

    for (const item of items) {
      if (item.chiave) {
        await supabase
          .from("configurazioni")
          .update({
            valore: item.valore,
            visibile: item.visibile !== undefined ? item.visibile : true,
          })
          .eq("chiave", item.chiave);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Errore salvataggio configurazioni:", err);
    return NextResponse.json({ error: err.message || "Errore salvataggio configurazioni" }, { status: 500 });
  }
}
