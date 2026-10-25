import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe non è configurato con una chiave valida." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Devi essere autenticato per accedere alla gestione dell'abbonamento." },
        { status: 401 }
      );
    }

    // 1. Cerca il customer Stripe corrispondente all'indirizzo email dell'utente
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Nessun cliente Stripe trovato per la tua email. Se il tuo piano è stato attivato manualmente o promozionalmente, non ci sono rinnovi ricorrenti da disdire.",
        },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";

    // 2. Crea la sessione del Portale di Fatturazione Stripe (disdici con 1 clic, aggiorna metodo di pagamento, fatture)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${siteUrl}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Errore Stripe Billing Portal:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Impossibile aprire il portale Stripe. Assicurati che il Portale Clienti sia attivato nelle impostazioni di Stripe.",
      },
      { status: 500 }
    );
  }
}
