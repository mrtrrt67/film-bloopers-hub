export interface JWDirectOffers {
  primeDirectUrl?: string | null;
  directUrlsByPlatform: Map<string, string>;
}

const jwCache = new Map<string, JWDirectOffers | null>();

/**
 * Recupera i deep link ufficiali diretti per ciascuna piattaforma (Prime Video, Paramount+, Netflix, ecc.)
 * tramite le API GraphQL di JustWatch per l'Italia.
 * Permette all'utente di atterrare direttamente sul player del film senza passare per la schermata di ricerca.
 */
export async function fetchJustWatchDirectOffers(
  title: string,
  year?: number | string | null,
  amazonTag = "filmbloopers-21"
): Promise<JWDirectOffers | null> {
  if (!title) return null;
  const cleanTitle = title.trim();
  const cacheKey = `${cleanTitle.toLowerCase()}_${year || ""}`;

  if (jwCache.has(cacheKey)) {
    return jwCache.get(cacheKey)!;
  }

  try {
    const searchRes = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "SearchTitles",
        variables: { searchQuery: cleanTitle, country: "IT", language: "it" },
        query: `query SearchTitles($searchQuery: String!, $country: Country!, $language: Language!) {
          popularTitles(country: $country, filter: { searchQuery: $searchQuery }) {
            edges {
              node {
                id
                content(country: $country, language: $language) {
                  title
                  originalReleaseYear
                }
              }
            }
          }
        }`
      }),
      next: { revalidate: 86400 }
    });

    if (!searchRes.ok) {
      jwCache.set(cacheKey, null);
      return null;
    }

    const sJson = await searchRes.json();
    const edges: any[] = sJson.data?.popularTitles?.edges || [];
    if (edges.length === 0) {
      jwCache.set(cacheKey, null);
      return null;
    }

    let best = edges[0].node;
    if (year) {
      const yNum = Number(year);
      const match = edges.find(
        (e: any) => e.node?.content?.originalReleaseYear === yNum
      );
      if (match) best = match.node;
    }

    const offersRes = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "GetOffers",
        variables: { nodeId: best.id, country: "IT" },
        query: `query GetOffers($nodeId: ID!, $country: Country!, $platform: Platform! = WEB) {
          node(id: $nodeId) {
            ... on MovieOrShowOrSeasonOrEpisode {
              offers(country: $country, platform: $platform) {
                monetizationType
                standardWebURL
                package {
                  clearName
                  technicalName
                }
              }
            }
          }
        }`
      }),
      next: { revalidate: 86400 }
    });

    if (!offersRes.ok) {
      jwCache.set(cacheKey, null);
      return null;
    }

    const oJson = await offersRes.json();
    const offers: any[] = oJson.data?.node?.offers || [];

    let primeDirectUrl: string | null = null;
    const directUrlsByPlatform = new Map<string, string>();

    for (const off of offers) {
      let url: string | undefined = off.standardWebURL;
      if (!url) continue;

      const techName = (off.package?.technicalName || "").toLowerCase();
      const clearName = (off.package?.clearName || "").toLowerCase();

      // Normalizzazione URL per Prime Video con tag affiliato e dominio web standard
      if (
        techName === "amazon" ||
        techName === "prime" ||
        clearName.includes("prime") ||
        clearName.includes("amazon")
      ) {
        let primeUrl = url.replace("app.primevideo.com", "www.primevideo.com");
        if (!primeUrl.includes("tag=")) {
          primeUrl += (primeUrl.includes("?") ? "&" : "?") + `tag=${amazonTag}`;
        }
        if (!primeDirectUrl) {
          primeDirectUrl = primeUrl;
        }
        directUrlsByPlatform.set("amazon", primeUrl);
        directUrlsByPlatform.set("prime", primeUrl);
        directUrlsByPlatform.set(clearName, primeUrl);
      } else {
        if (!directUrlsByPlatform.has(techName))
          directUrlsByPlatform.set(techName, url);
        if (!directUrlsByPlatform.has(clearName))
          directUrlsByPlatform.set(clearName, url);
      }
    }

    const result: JWDirectOffers = {
      primeDirectUrl,
      directUrlsByPlatform,
    };

    jwCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Errore JustWatch direct offers:", err);
    jwCache.set(cacheKey, null);
    return null;
  }
}

