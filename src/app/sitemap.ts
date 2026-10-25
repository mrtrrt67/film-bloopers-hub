import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

export const revalidate = 3600; // Rigenerazione automatica ogni ora da Supabase

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://filmbloopers.online";

  // Pagine statiche principali
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/esplora`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/classifica`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/suggerimenti`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/termini`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookie`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/note-legali`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Estrazione dinamica di tutti i film presenti su Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: films } = await supabase
      .from("films")
      .select("id, titolo, anno, creato_il")
      .limit(1000);

    const movieRoutes: MetadataRoute.Sitemap = (films || []).map((film: any) => {
      const slug = slugify(film.titolo, film.anno);
      const shortId = String(film.id);
      return {
        url: `${baseUrl}/film/${slug}-${shortId}`,
        lastModified: film.creato_il ? new Date(film.creato_il) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });

    return [...staticRoutes, ...movieRoutes];
  } catch (err) {
    console.error("Errore generazione sitemap dinamica:", err);
    return staticRoutes;
  }
}
