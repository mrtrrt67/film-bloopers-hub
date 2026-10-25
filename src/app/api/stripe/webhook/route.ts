import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Firma webhook mancante" }, { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  // Supabase service client per aggiornamento profilo
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = session.metadata?.userId || session.client_reference_id;
      const planId = session.metadata?.planId;

      if (userId) {
        let updateData: any = { tier: "premium" };

        if (planId === "lifetime-promo" || planId === "lifetime-standard") {
          updateData.tipo_abbonamento = "lifetime";
          updateData.data_scadenza = null;
        } else if (planId === "mensile") {
          updateData.tipo_abbonamento = "mensile";
          const scadenza = new Date();
          scadenza.setDate(scadenza.getDate() + 32);
          updateData.data_scadenza = scadenza.toISOString().slice(0, 10);
        } else if (planId === "annuale") {
          updateData.tipo_abbonamento = "annuale";
          updateData.subscription_type = "annuale";
          const scadenza = new Date();
          scadenza.setDate(scadenza.getDate() + 366);
          updateData.data_scadenza = scadenza.toISOString().slice(0, 10);
        }

        await supabase.from("profiles").update(updateData).eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      let customerEmail = subscription.customer_email;

      if (!customerEmail && subscription.customer) {
        try {
          const cust = await stripe.customers.retrieve(subscription.customer) as any;
          customerEmail = cust?.email;
        } catch (cErr) {
          console.error("Errore recupero customer Stripe su subscription.updated:", cErr);
        }
      }

      if (customerEmail) {
        if (subscription.status === "canceled") {
          await supabase
            .from("profiles")
            .update({ tier: "free", tipo_abbonamento: "nessuno", subscription_type: "nessuno" })
            .eq("email", customerEmail);
        } else if (subscription.status === "active" || subscription.status === "trialing") {
          const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
          const subType = interval === "year" ? "annuale" : "mensile";
          let scadenza = null;
          if (subscription.current_period_end) {
            scadenza = new Date(subscription.current_period_end * 1000).toISOString().slice(0, 10);
          }

          await supabase
            .from("profiles")
            .update({
              tier: "premium",
              tipo_abbonamento: subType,
              subscription_type: subType,
              data_scadenza: scadenza,
            })
            .eq("email", customerEmail);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      let customerEmail = subscription.customer_email;

      // In Stripe subscription.deleted, il customer_email è spesso assente e va recuperato dal customer ID
      if (!customerEmail && subscription.customer) {
        try {
          const cust = await stripe.customers.retrieve(subscription.customer) as any;
          customerEmail = cust?.email;
        } catch (cErr) {
          console.error("Errore recupero customer Stripe su subscription.deleted:", cErr);
        }
      }

      if (customerEmail) {
        await supabase
          .from("profiles")
          .update({ tier: "free", tipo_abbonamento: "nessuno", subscription_type: "nessuno" })
          .eq("email", customerEmail);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Errore gestione evento Stripe:", err);
    return NextResponse.json({ error: "Errore interno gestione webhook" }, { status: 500 });
  }
}
