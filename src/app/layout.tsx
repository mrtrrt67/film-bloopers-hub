import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film",
  description:
    "Scopri migliaia di bloopers, errori di montaggio, anacronismi e ciak falsi nella storia del cinema. Archivio completo con dati TMDB e analisi IA.",
  keywords: [
    "bloopers",
    "errori film",
    "ciak falsi",
    "anacronismi cinema",
    "movie mistakes",
    "errori di montaggio",
    "curiosità cinema",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online"),
  openGraph: {
    title: "FilmBloopers Hub | Errori e Ciak Falsi nei Film",
    description:
      "Il più grande archivio italiano di bloopers cinematografici. Trova gli errori delle tue pellicole preferite al minuto esatto.",
    url: "https://filmbloopers.online",
    siteName: "FilmBloopers Hub",
    locale: "it_IT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
