import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invia un Suggerimento o Segnalazione | FilmBloopers Hub",
  description:
    "Segnala un film mancante, proponi nuovi bloopers da analizzare o invia un feedback per migliorare la piattaforma FilmBloopers Hub.",
  alternates: {
    canonical: "/suggerimenti",
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
