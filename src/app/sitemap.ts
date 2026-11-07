import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";
import { LOCALES, DEFAULT_LOCALE, buildLocalizedPath } from "@/i18n";

export const revalidate = 3600; // Rigenerazione automatica ogni ora da Supabase

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";
  const now = new Date();

  // Pagine statiche principali con frequenze e priorità SEO
  const staticDefinitions = [
    { path: "/", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/esplora", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/classifica", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/pricing", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/suggerimenti", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/termini", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/cookie", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/note-legali", changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  // Genera la mappa hreflang completa (tutti i 5 idiomi + x-default per i crawler internazionali)
  const buildAlternates = (rawPath: string) => {
    const clean = rawPath === "/" ? "" : rawPath;
    return {
      languages: {
        it: `${baseUrl}${clean || "/"}`,
        en: `${baseUrl}/en${clean}`,
        es: `${baseUrl}/es${clean}`,
        fr: `${baseUrl}/fr${clean}`,
        de: `${baseUrl}/de${clean}`,
        "x-default": `${baseUrl}/en${clean}`,
      },
    };
  };

  const staticRoutes: MetadataRoute.Sitemap = [];

  for (const def of staticDefinitions) {
    const alternates = buildAlternates(def.path);

    for (const locale of LOCALES) {
      const localizedPath = buildLocalizedPath(def.path, locale);
      staticRoutes.push({
        url: `${baseUrl}${localizedPath}`,
        lastModified: now,
        changeFrequency: def.changeFrequency,
        priority: locale === DEFAULT_LOCALE ? def.priority : Math.max(0.4, Number((def.priority * 0.95).toFixed(2))),
        alternates,
      });
    }
  }

  // Estrazione dinamica di tutti i film presenti su Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: films } = await supabase
      .from("films")
      .select("id, titolo, anno, creato_il")
      .limit(2000);

    const movieRoutes: MetadataRoute.Sitemap = [];

    for (const film of films || []) {
      const slug = slugify(film.titolo, film.anno);
      const shortId = String(film.id);
      const filmBaseSlug = `${slug}-${shortId}`;
      const lastMod = film.creato_il ? new Date(film.creato_il) : now;

      const alternates = {
        languages: {
          it: `${baseUrl}/film/${filmBaseSlug}`,
          en: `${baseUrl}/en/film/${filmBaseSlug}`,
          es: `${baseUrl}/es/film/${filmBaseSlug}`,
          fr: `${baseUrl}/fr/film/${filmBaseSlug}`,
          de: `${baseUrl}/de/film/${filmBaseSlug}`,
          "x-default": `${baseUrl}/en/film/${filmBaseSlug}`,
        },
      };

      for (const locale of LOCALES) {
        const path = locale === DEFAULT_LOCALE
          ? `/film/${filmBaseSlug}`
          : `/${locale}/film/${filmBaseSlug}`;

        movieRoutes.push({
          url: `${baseUrl}${path}`,
          lastModified: lastMod,
          changeFrequency: "weekly" as const,
          priority: locale === DEFAULT_LOCALE ? 0.8 : 0.75,
          alternates,
        });
      }
    }

    return [...staticRoutes, ...movieRoutes];
  } catch (err) {
    console.error("Errore generazione sitemap dinamica:", err);
    return staticRoutes;
  }
}
