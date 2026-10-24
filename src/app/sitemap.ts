import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

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
  ];

  // Estrazione dinamica di tutti i film presenti su Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: films } = await supabase
      .from("films")
      .select("id, titolo, anno, created_at")
      .limit(1000);

    const movieRoutes: MetadataRoute.Sitemap = (films || []).map((film: any) => {
      const slug = slugify(film.titolo, film.anno);
      const shortId = film.id.slice(0, 8);
      return {
        url: `${baseUrl}/film/${slug}-${shortId}`,
        lastModified: film.created_at ? new Date(film.created_at) : new Date(),
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
