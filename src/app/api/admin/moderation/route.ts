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

    // 1. Bloopers in attesa di approvazione
    const { data: pendingBloopers } = await supabase
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", false)
      .order("creato_il", { ascending: false });

    // 2. Contestazioni attive
    const { data: contestazioni } = await supabase
      .from("voti_bloopers")
      .select("*, errori(*, films(titolo, anno, id))")
      .eq("tipo", "contestazione")
      .not("motivo", "is", null);

    // 3. Archivio bloopers approvati dagli utenti
    const { data: approvedUserBloopers } = await supabase
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", true)
      .eq("provenienza", "utente")
      .order("creato_il", { ascending: false })
      .limit(50);

    return NextResponse.json({
      pending: pendingBloopers || [],
      contestazioni: contestazioni || [],
      approved: approvedUserBloopers || [],
    });
  } catch (err: any) {
    console.error("Errore moderazione:", err);
    return NextResponse.json({ error: err.message || "Errore moderazione" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const body = await request.json();
    const { action, blooper_id, contestazione_id, points, userId, userEmail, minuto, descrizione } = body;

    if (action === "approve") {
      // 1. Approva blooper
      await supabase.from("errori").update({ approvato: true }).eq("id", blooper_id);

      // 2. Assegna punti se l'utente è registrato
      const pts = points ? parseInt(String(points), 10) : 10;
      if (userEmail) {
        const { data: profile } = await supabase.from("profiles").select("id, punti").eq("email", userEmail).single();
        if (profile) {
          await supabase.from("profiles").update({ punti: (profile.punti || 0) + pts }).eq("id", profile.id);
        }
      } else if (userId) {
        const { data: profile } = await supabase.from("profiles").select("id, punti").eq("id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ punti: (profile.punti || 0) + pts }).eq("id", profile.id);
        }
      }

      return NextResponse.json({ success: true, message: "Blooper approvato e punti assegnati!" });
    }

    if (action === "reject") {
      await supabase.from("errori").delete().eq("id", blooper_id);
      return NextResponse.json({ success: true, message: "Segnalazione rifiutata ed eliminata." });
    }

    if (action === "correct_contestation") {
      // Aggiorna blooper con la correzione
      if (blooper_id) {
        const updateData: Record<string, any> = {};
        if (minuto) updateData.minuto = minuto;
        if (descrizione) updateData.descrizione = descrizione;
        await supabase.from("errori").update(updateData).eq("id", blooper_id);
      }

      // Rimuovi contestazione risolta
      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }

      // Assegna punti se previsti
      if (userId && points) {
        const { data: profile } = await supabase.from("profiles").select("id, punti").eq("id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ punti: (profile.punti || 0) + parseInt(String(points), 10) }).eq("id", profile.id);
        }
      }

      return NextResponse.json({ success: true, message: "Correzione salvata e contestazione risolta!" });
    }

    if (action === "delete_blooper") {
      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }
      if (blooper_id) {
        await supabase.from("errori").delete().eq("id", blooper_id);
      }
      return NextResponse.json({ success: true, message: "Blooper eliminato definitivamente." });
    }

    if (action === "ignore_contestation") {
      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }
      return NextResponse.json({ success: true, message: "Contestazione ignorata ed archiviata." });
    }

    if (action === "delete_approved") {
      if (blooper_id) {
        await supabase.from("errori").delete().eq("id", blooper_id);
      }
      return NextResponse.json({ success: true, message: "Blooper eliminato dall'archivio." });
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore operazione moderazione:", err);
    return NextResponse.json({ error: err.message || "Errore moderazione" }, { status: 500 });
  }
}
