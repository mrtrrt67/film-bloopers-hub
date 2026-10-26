import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esplora Archivio Bloopers | Cerca Film ed Errori",
  description:
    "Cerca tra oltre 200 film ed esplora il catalogo dei bloopers. Trova errori di scena per titolo e anno, con la ricerca cinematografica integrata.",
  alternates: {
    canonical: "/esplora",
  },
  openGraph: {
    title: "Esplora Archivio Bloopers | FilmBloopers Hub",
    description: "Cerca tra centinaia di film ed errori cinematografici catalogati con precisione.",
    url: "/esplora",
  },
};

export default function EsploraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
