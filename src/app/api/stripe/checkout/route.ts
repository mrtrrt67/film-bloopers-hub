import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PRICING_PLANS } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe non è ancora configurato con una chiave valida." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Devi effettuare il login per procedere all'acquisto." },
        { status: 401 }
      );
    }

    const { planId } = await request.json();
    const plan = PRICING_PLANS.find((p) => p.id === planId);

    if (!plan || plan.id === "free") {
      return NextResponse.json(
        { error: "Piano selezionato non valido." },
        { status: 400 }
      );
    }

    let priceId = process.env[plan.priceIdEnv];
    if (!priceId) {
      if (plan.id === "mensile") priceId = process.env.STRIPE_PRICE_MENSILE || process.env.STRIPE_PRICE_MONTHLY;
      if (plan.id === "annuale") priceId = process.env.STRIPE_PRICE_ANNUALE || process.env.STRIPE_PRICE_YEARLY;
      if (plan.id === "lifetime-promo") priceId = process.env.STRIPE_PRICE_LIFETIME_PROMO || process.env.STRIPE_PRICE_PROMO;
      if (plan.id === "lifetime-standard") priceId = process.env.STRIPE_PRICE_LIFETIME_STANDARD || process.env.STRIPE_PRICE_LIFETIME;
    }

    // Se per l'annuale è presente il vecchio price ID Stripe da 9,99€ (o assente), mappa al nuovo price ufficiale da 5,99€
    if (plan.id === "annuale" && (!priceId || priceId === "price_1URqXC6dphUuH9QPHaBaJ8lw")) {
      priceId = "price_1UUqUz6dphUuH9QP9toeRU8a";
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `ID Prezzo Stripe non configurato per il piano ${plan.name}.` },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";

    // Cerca se esiste già un customer Stripe per questo utente
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    const existingCustomer = existingCustomers.data[0];

    const sessionParams: any = {
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: plan.isSubscription ? "subscription" : "payment",
      success_url: `${siteUrl}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
    };

    if (existingCustomer) {
      sessionParams.customer = existingCustomer.id;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Errore Stripe Checkout:", err);
    return NextResponse.json(
      { error: err.message || "Errore durante la creazione della sessione di pagamento" },
      { status: 500 }
    );
  }
}
