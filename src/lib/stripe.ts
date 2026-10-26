import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    })
  : null;

export interface PlanConfig {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  isSubscription: boolean;
  priceIdEnv: string;
  features: { name: string; included: boolean }[];
}

export const PRICING_PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: "0,00 €",
    period: "per sempre",
    description: "Ideale per curiosi e appassionati occasionali di cinema.",
    isSubscription: false,
    priceIdEnv: "",
    features: [
      { name: "15 ricerche al giorno", included: true },
      { name: "Visualizzazione bloopers completa", included: true },
      { name: "Invio suggerimenti di errori", included: true },
      { name: "Votazione bloopers (attendibilità)", included: false },
      { name: "Classifica e sblocco premi", included: false },
      { name: "Generazione illimitata IA", included: false },
    ],
  },
  {
    id: "mensile",
    name: "Mensile",
    price: "0,99 €",
    period: "al mese",
    description: "Accesso totale a tutte le funzionalità della community.",
    isSubscription: true,
    priceIdEnv: "STRIPE_PRICE_MENSILE",
    features: [
      { name: "Ricerche e generazioni IA illimitate", included: true },
      { name: "Votazione e contestazione bloopers", included: true },
      { name: "Partecipazione alla classifica", included: true },
      { name: "Accumulo punti e gradi", included: true },
      { name: "Badge VIP nella community", included: true },
      { name: "Disdici quando vuoi con 1 clic", included: true },
    ],
  },
  {
    id: "annuale",
    name: "Annuale",
    price: "5,99 €",
    period: "all'anno",
    description: "Il piano più conveniente per i veri cacciatori di bloopers.",
    popular: true,
    isSubscription: true,
    priceIdEnv: "STRIPE_PRICE_ANNUALE",
    features: [
      { name: "Tutto ciò che è incluso nel Mensile", included: true },
      { name: "Sconto 50% rispetto al mensile (meno di 0,50€/mese)", included: true },
      { name: "Ricerche e generazioni IA illimitate", included: true },
      { name: "Punti doppi per le segnalazioni", included: true },
      { name: "Supporto prioritario", included: true },
    ],
  },
  {
    id: "lifetime-promo",
    name: "Lifetime Promo",
    price: "9,99 €",
    period: "una tantum",
    description: "Offerta speciale di lancio: sblocca l'accesso a vita!",
    isSubscription: false,
    priceIdEnv: "STRIPE_PRICE_LIFETIME_PROMO",
    features: [
      { name: "Accesso Premium PER SEMPRE a vita", included: true },
      { name: "Nessun abbonamento né rinnovo", included: true },
      { name: "Tutte le feature attuali e future", included: true },
      { name: "Grado Leggenda prioritario", included: true },
      { name: "Disponibile solo durante il lancio", included: true },
    ],
  },
  {
    id: "lifetime-standard",
    name: "Lifetime Standard",
    price: "19,99 €",
    period: "una tantum",
    description: "Accesso definitivo a vita al catalogo completo.",
    isSubscription: false,
    priceIdEnv: "STRIPE_PRICE_LIFETIME_STANDARD",
    features: [
      { name: "Accesso Premium a vita senza scadenze", included: true },
      { name: "Nessun costo mensile ricorrente", included: true },
      { name: "Generazioni IA illimitate", included: true },
      { name: "Tutti i benefici della community", included: true },
    ],
  },
];
