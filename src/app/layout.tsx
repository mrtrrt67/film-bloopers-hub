import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AccessTracker from "@/components/AccessTracker";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online"),
  title: {
    default: "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film",
    template: "%s | FilmBloopers Hub",
  },
  description:
    "Scopri oltre 1.000 bloopers, errori di montaggio, ciak imperfetti, anacronismi storici e troupe visibili al minuto esatto nei film più famosi della storia del cinema. Archivio verificato e gratuito.",
  keywords: [
    "bloopers film",
    "errori film",
    "errori nei film famosi",
    "ciak falsi",
    "anacronismi cinema",
    "movie mistakes italiano",
    "errori di montaggio",
    "curiosità cinema",
    "troupe visibile nei film",
    "errori di continuità film",
    "filmbloopers",
  ],
  authors: [{ name: "FilmBloopers Hub" }],
  creator: "FilmBloopers Hub",
  publisher: "FilmBloopers Hub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film",
    description:
      "Scopri oltre 1.000 bloopers, errori di scena e curiosità nei capolavori del cinema. Cerca per titolo o anno e trova l'errore al minuto esatto.",
    url: "https://filmbloopers.online",
    siteName: "FilmBloopers Hub",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film",
    description:
      "Tutti i bloopers, errori di scena e curiosità del cinema italiano e internazionale al minuto esatto.",
    creator: "@FilmBloopersHub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.webmanifest",
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ backgroundColor: "#09090b", colorScheme: "dark" }}
    >
      <body
        className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950"
        style={{ backgroundColor: "#09090b" }}
      >
        <AccessTracker />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
