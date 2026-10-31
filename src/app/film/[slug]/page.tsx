import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Film as FilmIcon, 
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Star
} from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { Film, Blooper, MovieTrivia, FilmRatingInfo } from "@/lib/types";
import MovieCard from "@/components/MovieCard";
import { getAmazonSearchUrl, slugify } from "@/lib/utils";
import FilmContentSwitcher from "@/components/FilmContentSwitcher";
import { getRelatedFilms } from "@/lib/recommendations";
import { getFilmRatingInfo } from "@/lib/tmdb";
import { StreamingAvailabilityCard } from "@/components/film/StreamingAvailabilityCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getFilmData(slug: string) {
  const supabase = createPublicClient();

  // Estrae eventuale ID parziale dallo slug (es. "matrix-1999-143" o "matrix-1999")
  const parts = slug.split("-");
  const potentialId = parts[parts.length - 1];

  let targetFilm: Film | null = null;

  if (potentialId && /^\d+$/.test(potentialId)) {
    const { data: byId } = await supabase
      .from("films")
      .select("*")
      .eq("id", parseInt(potentialId, 10))
      .maybeSingle();

    if (byId) {
      targetFilm = byId as Film;
    }
  }

  // Fallback: cerca per titolo approssimativo dallo slug se non trovato per ID
  if (!targetFilm) {
    const titleGuess = slug.replace(/-[0-9]{4}.*$/, "").replace(/-/g, " ").trim();
    if (titleGuess) {
      const { data: byTitle } = await supabase
        .from("films")
        .select("*")
        .ilike("titolo", `%${titleGuess}%`)
        .limit(1)
        .maybeSingle();

      if (byTitle) {
        targetFilm = byTitle as Film;
      }
    }
  }

  if (!targetFilm) {
    return null;
  }

  // Query congiunta per Bloopers, Curiosità, Film Correlati e Valutazione IMDb/TMDB
  const [bloopersRes, triviaRes, relatedFilms, ratingInfo] = await Promise.all([
    supabase
      .from("errori")
      .select("*, voti_bloopers(tipo, user_id)")
      .eq("film_id", targetFilm.id)
      .eq("approvato", true),
    supabase
      .from("movie_trivia")
      .select("*")
      .eq("film_id", targetFilm.id)
      .eq("approvato", true)
      .order("ordine", { ascending: true })
      .order("created_at", { ascending: false }),
    getRelatedFilms(targetFilm, 5),
    getFilmRatingInfo(targetFilm.titolo, targetFilm.anno, targetFilm.tmdb_id),
  ]);

  return {
    film: targetFilm,
    bloopers: (bloopersRes.data || []) as any[],
    trivia: (triviaRes.data || []) as MovieTrivia[],
    relatedFilms,
    ratingInfo,
  };
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
  const title = `${film.titolo} (${film.anno || "N/D"}) — Errori, Bloopers e Curiosità`;
  
  const countParts: string[] = [];
  if (bloopers?.length) countParts.push(`${bloopers.length} bloopers al minuto esatto`);
  if (trivia?.length) countParts.push(`${trivia.length} curiosità e retroscena`);

  const countDesc = countParts.length > 0
    ? `Scopri ${countParts.join(" e ")}.`
    : "Scopri tutti gli errori, le curiosità e i retroscena dal set.";

  const maxTramaLen = Math.max(0, 155 - countDesc.length - 5);
  const tramaSnippet = film.trama && maxTramaLen > 20 ? ` ${film.trama.slice(0, maxTramaLen).trim()}...` : "";
  const description = `${countDesc}${tramaSnippet}`.slice(0, 158).trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";
  const imageUrl = film.backdrop_url || film.poster_url || `${siteUrl}/og-image.jpg`;

  return {
    title,
    description,
    keywords: [
      `errori ${film.titolo}`,
      `bloopers ${film.titolo}`,
      `curiosità ${film.titolo}`,
      `aneddoti ${film.titolo}`,
      `retroscena ${film.titolo}`,
      `errori di montaggio ${film.titolo}`,
      `sviste ${film.titolo}`,
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
          alt: `Errori e Bloopers in ${film.titolo}`,
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

  const { film, bloopers: rawBloopers, trivia = [], relatedFilms = [], ratingInfo } = data;

  // Normalizza i bloopers calcolando conferme e contestazioni
  // (l'eventuale voto dell'utente connesso viene idratato client-side in modo trasparente senza rompere la cache Edge)
  const bloopers: Blooper[] = rawBloopers.map((b: any) => {
    const voti = b.voti_bloopers || [];
    const conferme = voti.filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = voti.filter((v: any) => v.tipo === "contestazione").length;
    return {
      ...b,
      conferme,
      contestazioni,
      voto_utente: null,
    };
  });

  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG || "filmbloopers-21";
  const amazonUrl = getAmazonSearchUrl(film.titolo, film.anno, amazonTag);

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
    aggregateRating: ratingInfo ? {
      "@type": "AggregateRating",
      ratingValue: ratingInfo.rating.toFixed(1),
      bestRating: "10",
      worstRating: "1",
      ratingCount: ratingInfo.voteCount || 100,
    } : undefined,
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
        {/* Backdrop Hero Section (compatto su mobile per far emergere subito il contenuto) */}
        <div className="relative w-full h-[180px] sm:h-[360px] md:h-[400px] bg-zinc-950 overflow-hidden">
          {film.backdrop_url ? (
            <Image
              src={film.backdrop_url}
              alt={film.titolo}
              fill
              unoptimized
              priority
              className="object-cover opacity-25 blur-sm scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />

          {/* Breadcrumb & Navigation */}
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
            <Link
              href="/esplora"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Torna al catalogo
            </Link>
          </div>
        </div>

        {/* Main Film Info & Content */}
        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-44 md:-mt-52">
          
          {/* HEADER MOBILE: Layout compatto orizzontale (Mostra subito locandina, titolo e metadati) */}
          <div className="flex md:hidden flex-col gap-3 mb-5">
            <div className="flex items-start gap-3.5">
              {/* Mini Locandina Mobile */}
              <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                {film.poster_url ? (
                  <Image
                    src={film.poster_url}
                    alt={film.titolo}
                    fill
                    unoptimized
                    priority
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <FilmIcon className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Informazioni Titolo Mobile */}
              <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {film.anno && (
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-400">
                      {film.anno}
                    </span>
                  )}
                  {film.genere && (
                    <span className="rounded-md bg-zinc-800/80 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300 line-clamp-1">
                      {film.genere.split(/[,/]/)[0]}
                    </span>
                  )}
                </div>

                <h1 className="text-xl font-black text-white tracking-tight leading-tight line-clamp-2">
                  {film.titolo}
                </h1>
                
                {film.regista && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    Regia: <span className="text-zinc-200 font-semibold">{film.regista}</span>
                  </p>
                )}

                {/* Badge Rapidi Conteggio Contenuti */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[10px] font-black">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {bloopers.length} Bloopers
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                    {trivia.length} Curiosità
                  </span>
                  {ratingInfo && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-amber-500/40 text-[10px] font-bold text-zinc-200"
                      title="Valutazione ufficiale IMDb"
                    >
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      <span className="text-amber-300 font-black">{ratingInfo.rating.toFixed(1)}</span>
                      <span className="rounded bg-[#F5C518] text-black px-1 text-[8px] font-black uppercase tracking-wider">
                        IMDb
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sinossi Trama Mobile */}
            {film.trama && (
              <details className="group rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 text-xs">
                <summary className="font-bold text-amber-400 cursor-pointer flex items-center justify-between">
                  <span>Sinossi del Film</span>
                  <span className="text-[10px] text-zinc-500 group-open:hidden">Mostra trama ▼</span>
                </summary>
                <p className="mt-2 text-zinc-300 leading-relaxed font-normal">
                  {film.trama}
                </p>
              </details>
            )}

            {/* Card Dove Guardarlo in Streaming Mobile */}
            <div className="pt-1">
              <StreamingAvailabilityCard
                streaming={ratingInfo?.streaming}
                amazonUrl={amazonUrl}
                filmTitle={film.titolo}
                amazonTag={amazonTag}
                variant="banner"
              />
            </div>
          </div>

          {/* GRID DESKTOP (Invariato per schermi medi e grandi) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Colonna Sinistra Desktop: Poster & Azioni Esterne */}
            <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col items-start gap-4">
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
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

              {/* Card Streaming & Dove Guardarlo Desktop */}
              <StreamingAvailabilityCard
                streaming={ratingInfo?.streaming}
                amazonUrl={amazonUrl}
                filmTitle={film.titolo}
                amazonTag={amazonTag}
                variant="sidebar"
              />
            </div>

            {/* Colonna Destra: Dettagli Film Desktop & Sezione Switcher (Sia Mobile che Desktop) */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col">
              
              {/* Intestazione Desktop */}
              <div className="hidden md:block mb-6">
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
                  {ratingInfo && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/90 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-zinc-100 shadow-sm"
                      title="Valutazione ufficiale IMDb"
                    >
                      <span className="text-amber-400 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black text-amber-300">{ratingInfo.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">/10</span>
                      </span>
                      <span className="rounded bg-[#F5C518] text-black px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                        IMDb
                      </span>
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

                {/* Cast & Crew Bar Desktop */}
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

                {/* Sinossi Trama Desktop */}
                <div className="mt-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                    Sinossi del Film
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {film.trama || "Trama al momento non disponibile."}
                  </p>
                </div>
              </div>

              {/* Sezione Switcher Interattiva: Bloopers & Curiosità (In primo piano per tutti i dispositivi) */}
              <FilmContentSwitcher
                film={film}
                initialBloopers={bloopers}
                initialTrivia={trivia}
              />

              {/* Sezione Film Correlati & Consigliati per SEO ed esplorazione */}
              {relatedFilms.length > 0 && (
                <div className="mt-16 pt-10 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          Potrebbero piacerti anche:
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        Pellicole affini consigliate per regia, saga cinematografica, cast e genere.
                      </p>
                    </div>
                    <Link
                      href="/esplora"
                      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <span>Tutto il catalogo</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    {relatedFilms.map((f: any) => (
                      <MovieCard key={f.id} film={f} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
