import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Piani Premium & Accesso Completo | FilmBloopers Hub",
  description:
    "Sblocca l'accesso illimitato alle analisi IA dei bloopers, filtri esclusivi e badge VIP. Oppure guadagna l'accesso gratis a vita scalando la classifica!",
  alternates: {
    canonical: "/pricing",
    languages: {
      "it": "/pricing",
      "en": "/en/pricing",
      "es": "/es/pricing",
      "fr": "/fr/pricing",
      "de": "/de/pricing",
      "x-default": "/en/pricing",
    },
  },
  openGraph: {
    title: "Piani Premium e Lifetime | FilmBloopers Hub",
    description: "Sblocca l'accesso completo all'archivio bloopers e alle funzionalità IA.",
    url: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
