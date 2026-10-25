import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Piani Premium & Accesso Completo | FilmBloopers Hub",
  description:
    "Sblocca l'accesso illimitato alle analisi IA avanzate dei bloopers, filtri esclusivi e badge Leggenda. Oppure guadagna l'abbonamento gratis a vita segnalando errori!",
  alternates: {
    canonical: "/pricing",
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
