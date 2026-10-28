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
    const limit = parseInt(searchParams.get("limit") || "60", 10);

    const [errRes, callsRes, accessRes] = await Promise.all([
      supabase.from("log_errori_ia").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("statistiche_ia").select("*").order("data_chiamata", { ascending: false }).limit(limit),
      supabase.from("log_accessi").select("*").order("created_at", { ascending: false }).limit(limit),
    ]);

    const adminIdPrefix = user.id.slice(0, 8);
    const recentAccess = (accessRes.data || []).filter((a: any) => 
      !a.tipo?.includes(adminIdPrefix) && 
      a.tipo?.toLowerCase() !== "admin"
    );

    return NextResponse.json({
      aiErrors: errRes.data || [],
      recentAiCalls: callsRes.data || [],
      recentAccess,
    });
  } catch (err: any) {
    console.error("Errore log admin:", err);
    return NextResponse.json({ error: err.message || "Errore recupero log" }, { status: 500 });
  }
}
