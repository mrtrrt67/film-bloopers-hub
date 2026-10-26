import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Film as FilmIcon, 
  Sparkles, 
  ShoppingCart, 
  PlayCircle, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Share2
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Film, Blooper, MovieTrivia } from "@/lib/types";
import BlooperItem from "@/components/BlooperItem";
import { getAmazonSearchUrl, getYouTubeSearchUrl } from "@/lib/utils";
import FilmContentSwitcher from "@/components/FilmContentSwitcher";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getFilmData(slug: string) {
  const supabase = await createClient();

  // Estrae eventuale ID parziale dallo slug (es. "matrix-1999-143" o "matrix-1999")
  const parts = slug.split("-");
  const potentialId = parts[parts.length - 1];

  if (potentialId && /^\d+$/.test(potentialId)) {
    // Ricerca per ID numerico intero nel database Supabase
    const { data: byId } = await supabase
      .from("films")
      .select("*")
      .eq("id", parseInt(potentialId, 10))
      .maybeSingle();

    if (byId) {
      const [bloopersRes, triviaRes] = await Promise.all([
        supabase
          .from("errori")
          .select("*, voti_bloopers(tipo, user_id)")
          .eq("film_id", byId.id)
          .eq("approvato", true),
        supabase
          .from("movie_trivia")
          .select("*")
          .eq("film_id", byId.id)
          .eq("approvato", true)
          .order("ordine", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

      return {
        film: byId as Film,
        bloopers: (bloopersRes.data || []) as any[],
        trivia: (triviaRes.data || []) as MovieTrivia[],
      };
    }
  }

  // Fallback: cerca per titolo approssimativo dallo slug
  const titleGuess = slug.replace(/-[0-9]{4}.*$/, "").replace(/-/g, " ").trim();
  if (titleGuess) {
    const { data: byTitle } = await supabase
      .from("films")
      .select("*")
      .ilike("titolo", `%${titleGuess}%`)
      .limit(1)
      .maybeSingle();

    if (byTitle) {
      const [bloopersRes, triviaRes] = await Promise.all([
        supabase
          .from("errori")
          .select("*, voti_bloopers(tipo, user_id)")
          .eq("film_id", byTitle.id)
          .eq("approvato", true),
        supabase
          .from("movie_trivia")
          .select("*")
          .eq("film_id", byTitle.id)
          .eq("approvato", true)
          .order("ordine", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

      return {
        film: byTitle as Film,
        bloopers: (bloopersRes.data || []) as any[],
        trivia: (triviaRes.data || []) as MovieTrivia[],
      };
    }
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFilmData(slug);

  if (!data?.film) {
    return {
      title: "Film non trovato | FilmBloopers Hub",
      description: "La pellicola cercata non è presente nell'archivio.",
    };
  }

  const { film, bloopers, trivia } = data;
  const title = `${film.titolo} (${film.anno || "N/D"}) — Bloopers, Errori di Scena e Curiosità`;
  
  const countParts: string[] = [];
  if (bloopers?.length) countParts.push(`${bloopers.length} bloopers`);
  if (trivia?.length) countParts.push(`${trivia.length} curiosità e retroscena`);

  const countDesc = countParts.length > 0
    ? `Scopri ${countParts.join(" e ")} verificati.`
    : "Scopri tutti i bloopers, le curiosità e i retroscena del film.";

  const maxTramaLen = Math.max(0, 155 - countDesc.length - 5);
  const tramaSnippet = film.trama && maxTramaLen > 20 ? ` ${film.trama.slice(0, maxTramaLen).trim()}...` : "";
  const description = `${countDesc}${tramaSnippet}`.slice(0, 158).trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";
  const imageUrl = film.backdrop_url || film.poster_url || `${siteUrl}/og-image.jpg`;

  return {
    title,
    description,
    keywords: [
      `bloopers ${film.titolo}`,
      `errori film ${film.titolo}`,
      `curiosità ${film.titolo}`,
      `aneddoti ${film.titolo}`,
      `retroscena ${film.titolo}`,
      `dietro le quinte ${film.titolo}`,
      `errori di scena ${film.titolo}`,
      film.regista ? `film ${film.regista}` : "",
      film.genere || "",
    ].filter(Boolean),
    alternates: {
      canonical: `/film/${slug}`,
    },
    openGraph: {
      title: `${title} | FilmBloopers Hub`,
      description,
      url: `/film/${slug}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Bloopers ed errori in ${film.titolo}`,
        },
      ],
      type: "video.movie",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function FilmDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getFilmData(slug);

  if (!data?.film) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { film, bloopers: rawBloopers, trivia = [] } = data;

  // Normalizza i bloopers calcolando conferme, contestazioni e voto dell'utente autenticato
  const bloopers: Blooper[] = rawBloopers.map((b: any) => {
    const voti = b.voti_bloopers || [];
    const conferme = voti.filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = voti.filter((v: any) => v.tipo === "contestazione").length;
    const userVote = user ? voti.find((v: any) => v.user_id === user.id)?.tipo : null;
    return {
      ...b,
      conferme,
      contestazioni,
      voto_utente: userVote || null,
    };
  });

  const amazonUrl = getAmazonSearchUrl(film.titolo, film.anno);
  const youtubeUrl = getYouTubeSearchUrl(film.titolo);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";
  const filmUrl = `${siteUrl}/film/${slug}`;

  // Schema.org Structured Data (JSON-LD) per Google Rich Snippets & Breadcrumbs
  const jsonLdMovie = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: film.titolo,
    url: filmUrl,
    datePublished: film.anno ? `${film.anno}-01-01` : undefined,
    director: film.regista ? { "@type": "Person", name: film.regista } : undefined,
    actor: film.attori
      ? film.attori.split(",").map((a: string) => ({ "@type": "Person", name: a.trim() }))
      : undefined,
    image: film.poster_url || film.backdrop_url || undefined,
    description: film.trama || undefined,
    genre: film.genere || undefined,
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Esplora",
        item: `${siteUrl}/esplora`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${film.titolo} (${film.anno || ""})`,
        item: filmUrl,
      },
    ],
  };

  const jsonLdBloopers =
    bloopers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Errori e Bloopers in ${film.titolo}`,
          itemListElement: bloopers.map((b, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: `${b.categoria} (minuto ${b.minuto})`,
            description: b.descrizione,
          })),
        }
      : null;

  const jsonLdTrivia =
    trivia.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Curiosità e Retroscena di ${film.titolo}`,
          itemListElement: trivia.map((t, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: t.titolo,
            description: t.descrizione,
          })),
        }
      : null;

  const schemasToRender = [jsonLdMovie, jsonLdBreadcrumbs, jsonLdBloopers, jsonLdTrivia].filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemasToRender) }}
      />

      <div className="min-h-screen pb-20">
        {/* Backdrop Hero Section */}
        <div className="relative w-full h-[320px] sm:h-[420px] bg-zinc-950 overflow-hidden">
          {film.backdrop_url ? (
            <Image
              src={film.backdrop_url}
              alt={film.titolo}
              fill
              unoptimized
              priority
              className="object-cover opacity-30 blur-sm scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />

          {/* Breadcrumb & Navigation */}
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            <Link
              href="/esplora"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Torna al catalogo
            </Link>
          </div>
        </div>

        {/* Main Film Info & Content */}
        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Colonna Sinistra: Poster & Azioni Esterne */}
            <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center sm:items-start gap-4">
              <div className="relative aspect-[2/3] w-56 sm:w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                {film.poster_url ? (
                  <Image
                    src={film.poster_url}
                    alt={film.titolo}
                    fill
                    unoptimized
                    priority
                    sizes="(max-width: 768px) 240px, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-zinc-600">
                    <FilmIcon className="h-16 w-16 mb-2" />
                    <span className="text-xs">{film.titolo}</span>
                  </div>
                )}
              </div>

              {/* Bottoni Affiliazione & Video */}
              <div className="w-full flex flex-col gap-2 pt-2">
                <a
                  href={amazonUrl}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 py-2.5 px-4 text-xs font-bold text-zinc-200 transition-all shadow-md group"
                >
                  <ShoppingCart className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  Cerca Edizione su Amazon
                </a>
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-950/20 border border-red-900/40 hover:border-red-600/60 py-2.5 px-4 text-xs font-bold text-red-400 transition-all shadow-md group"
                >
                  <PlayCircle className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                  Cerca Bloopers su YouTube
                </a>
              </div>
            </div>

            {/* Colonna Destra: Dettagli Film & Sezione Bloopers */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col">
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  {film.anno && (
                    <span className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-black text-amber-400">
                      Anno {film.anno}
                    </span>
                  )}
                  {film.genere && (
                    <span className="rounded-lg bg-zinc-800/80 border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                      {film.genere}
                    </span>
                  )}
                  {film.tmdb_id && (
                    <span className="rounded-lg bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      TMDB Verified
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {film.titolo}
                </h1>
                {film.original_title && film.original_title !== film.titolo && (
                  <p className="text-sm font-medium text-zinc-400 italic mt-0.5">
                    Titolo originale: {film.original_title}
                  </p>
                )}

                {/* Cast & Crew Bar */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-xs">
                  <div>
                    <span className="text-zinc-500 font-semibold block uppercase tracking-wider text-[10px]">
                      Regia
                    </span>
                    <span className="text-zinc-200 font-bold text-sm">
                      {film.regista || "Non indicato"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold block uppercase tracking-wider text-[10px]">
                      Cast Principale
                    </span>
                    <span className="text-zinc-300 line-clamp-1">
                      {film.attori || "Non indicato"}
                    </span>
                  </div>
                </div>

                {/* Sinossi Trama */}
                <div className="mt-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                    Sinossi del Film
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {film.trama || "Trama al momento non disponibile."}
                  </p>
                </div>
              </div>

              {/* Sezione Switcher Interattiva: Bloopers & Curiosità (Client Component) */}
              <FilmContentSwitcher
                film={film}
                initialBloopers={bloopers}
                initialTrivia={trivia}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
