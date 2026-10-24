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
      if (plan.id === "mensile") priceId = process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_MENSILE;
      if (plan.id === "annuale") priceId = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_ANNUALE;
      if (plan.id === "lifetime-promo") priceId = process.env.STRIPE_PRICE_PROMO || process.env.STRIPE_PRICE_LIFETIME_PROMO;
      if (plan.id === "lifetime-standard") priceId = process.env.STRIPE_PRICE_LIFETIME || process.env.STRIPE_PRICE_LIFETIME_STANDARD;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `ID Prezzo Stripe non configurato per il piano ${plan.name}.` },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";

    const session = await stripe.checkout.sessions.create({
      client_reference_id: user.id,
      customer_email: user.email,
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
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Errore Stripe Checkout:", err);
    return NextResponse.json(
      { error: err.message || "Errore durante la creazione della sessione di pagamento" },
      { status: 500 }
    );
  }
}
