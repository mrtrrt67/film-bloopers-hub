import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suggerimenti e Segnalazioni",
  description:
    "Segnala un film mancante, proponi nuovi bloopers da analizzare o invia un feedback per migliorare la piattaforma FilmBloopers Hub.",
  alternates: {
    canonical: "/suggerimenti",
    languages: {
      "it": "/suggerimenti",
      "en": "/en/suggerimenti",
      "es": "/es/suggerimenti",
      "fr": "/fr/suggerimenti",
      "de": "/de/suggerimenti",
      "x-default": "/en/suggerimenti",
    },
  },
  openGraph: {
    title: "Suggerimenti e Segnalazioni | FilmBloopers Hub",
    description: "Aiutaci ad ampliare l'archivio dei bloopers e a migliorare la community.",
    url: "/suggerimenti",
  },
};

export default function SuggerimentiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
