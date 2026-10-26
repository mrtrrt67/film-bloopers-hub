import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AccessTracker from "@/components/AccessTracker";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import RewardCelebrationBanner from "@/components/RewardCelebrationBanner";
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
    default: "FilmBloopers Hub | Bloopers, Errori di Scena & Curiosità nei Film",
    template: "%s | FilmBloopers Hub",
  },
  description:
    "Scopri oltre 1.000 bloopers, curiosità dal set, aneddoti di backstage ed errori di montaggio al minuto esatto nei film più celebri. Archivio verificato e gratuito.",
  keywords: [
    "bloopers film",
    "errori film",
    "curiosità film",
    "aneddoti dal set",
    "retroscena cinema",
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
    title: "FilmBloopers Hub | Bloopers, Errori di Scena & Curiosità nei Film",
    description:
      "Scopri oltre 1.000 bloopers, errori di scena, aneddoti dal set e curiosità di backstage nei capolavori del cinema.",
    url: "https://filmbloopers.online",
    siteName: "FilmBloopers Hub",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: "https://filmbloopers.online/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "FilmBloopers Hub - L'Archivio degli Errori nei Film",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film",
    description:
      "Tutti i bloopers, errori di scena e curiosità del cinema italiano e internazionale al minuto esatto.",
    creator: "@FilmBloopersHub",
    images: ["https://filmbloopers.online/og-image.jpg"],
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
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
        <PwaInstallPrompt />
        <Navbar />
        <RewardCelebrationBanner />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
