export interface JWDirectOffers {
  primeDirectUrl?: string | null;
  directUrlsByPlatform: Map<string, string>;
}

export interface JWMatchHints {
  tmdbId?: number | string | null;
  imdbId?: string | null;
  originalTitle?: string | null;
  localizedTitle?: string | null;
}

const jwCache = new Map<string, JWDirectOffers | null>();

function normalizeJWTitle(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesStrictlyMatch(candidateTitle: string | null | undefined, targetTitles: string[]): boolean {
  if (!candidateTitle) return false;
  const normCand = normalizeJWTitle(candidateTitle);
  if (!normCand) return false;

  const baseCand = normalizeJWTitle(candidateTitle.split(/\s*[:–—-]\s+/)[0]);

  for (const target of targetTitles) {
    const normTarget = normalizeJWTitle(target);
    if (!normTarget) continue;
    const baseTarget = normalizeJWTitle(target.split(/\s*[:–—-]\s+/)[0]);

    if (normCand === normTarget) return true;
    if (baseCand && baseTarget && baseCand === baseTarget && baseTarget.length >= 4) {
      // Accetta il match sul titolo principale solo se non ci sono numeri di sequel diversi
      const candNums = normCand.match(/\b\d+\b/g)?.join(",") || "";
      const targetNums = normTarget.match(/\b\d+\b/g)?.join(",") || "";
      if (candNums === targetNums) return true;
    }
  }
  return false;
}

interface JWExternalIds {
  tmdbId?: string | null;
  imdbId?: string | null;
}

interface JWTitleContent {
  title?: string | null;
  originalTitle?: string | null;
  originalReleaseYear?: number | null;
  externalIds?: JWExternalIds | null;
}

interface JWTitleNode {
  id: string;
  objectType?: string | null;
  content?: JWTitleContent | null;
}

interface JWEdge {
  node?: JWTitleNode | null;
}

interface JWOffer {
  monetizationType?: string | null;
  standardWebURL?: string | null;
  package?: {
    clearName?: string | null;
    technicalName?: string | null;
  } | null;
}

async function searchJustWatchNodes(searchQuery: string): Promise<JWEdge[]> {
  const searchRes = await fetch("https://apis.justwatch.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "SearchTitles",
      variables: { searchQuery, country: "IT", language: "it" },
      query: `query SearchTitles($searchQuery: String!, $country: Country!, $language: Language!) {
        popularTitles(country: $country, filter: { searchQuery: $searchQuery }) {
          edges {
            node {
              id
              objectType
              content(country: $country, language: $language) {
                title
                originalTitle
                originalReleaseYear
                externalIds {
                  tmdbId
                  imdbId
                }
              }
            }
          }
        }
      }`,
    }),
    next: { revalidate: 86400 },
  });

  if (!searchRes.ok) return [];
  const sJson = (await searchRes.json()) as {
    data?: { popularTitles?: { edges?: JWEdge[] } };
  };
  return sJson.data?.popularTitles?.edges || [];
}

function selectBestJustWatchNode(
  edges: JWEdge[],
  targetTitles: string[],
  year?: number | string | null,
  hints?: JWMatchHints
): JWTitleNode | null {
  const movieNodes = edges
    .map((e) => e?.node)
    .filter((n): n is JWTitleNode => Boolean(n) && (!n?.objectType || n.objectType === "MOVIE"));

  if (movieNodes.length === 0) return null;

  const targetTmdb = hints?.tmdbId ? String(hints.tmdbId).trim() : null;
  const targetImdb = hints?.imdbId ? String(hints.imdbId).trim().toLowerCase() : null;

  // 1. Match deterministico per TMDB ID o IMDb ID (zero falsi positivi)
  if (targetTmdb || targetImdb) {
    const idMatch = movieNodes.find((n) => {
      const ext = n.content?.externalIds;
      if (!ext) return false;
      if (targetTmdb && String(ext.tmdbId || "").trim() === targetTmdb) return true;
      if (targetImdb && String(ext.imdbId || "").trim().toLowerCase() === targetImdb) return true;
      return false;
    });
    if (idMatch) return idMatch;
  }

  // 2. Match rigoroso su titolo + anno (tolleranza +/- 1 anno)
  const yNum = year ? Number(year) : null;
  const titleMatches = movieNodes.filter((n) => {
    const c = n.content;
    if (!c) return false;
    const titleOk =
      titlesStrictlyMatch(c.title, targetTitles) ||
      titlesStrictlyMatch(c.originalTitle, targetTitles);
    if (!titleOk) return false;

    if (yNum && typeof c.originalReleaseYear === "number") {
      return Math.abs(c.originalReleaseYear - yNum) <= 1;
    }
    return true;
  });

  if (titleMatches.length === 0) return null;

  if (yNum) {
    const exactYearMatch = titleMatches.find(
      (n) => n.content?.originalReleaseYear === yNum
    );
    if (exactYearMatch) return exactYearMatch;
  }

  return titleMatches[0];
}

/**
 * Recupera i deep link ufficiali diretti per ciascuna piattaforma (Prime Video, Paramount+, Netflix, ecc.)
 * tramite le API GraphQL di JustWatch per l'Italia.
 * Permette all'utente di atterrare direttamente sul player del film senza passare per la schermata di ricerca.
 */
export async function fetchJustWatchDirectOffers(
  title: string,
  year?: number | string | null,
  amazonTag = "filmbloopers-21",
  hints?: JWMatchHints
): Promise<JWDirectOffers | null> {
  if (!title && !hints?.originalTitle) return null;
  const cleanTitle = (title || "").trim();
  const cleanOriginal = (hints?.originalTitle || "").trim();
  const cacheKey = hints?.tmdbId
    ? `tmdb_${hints.tmdbId}`
    : `${cleanTitle.toLowerCase()}_${year || ""}`;

  if (jwCache.has(cacheKey)) {
    return jwCache.get(cacheKey)!;
  }

  try {
    const targetTitles = Array.from(
      new Set([cleanTitle, cleanOriginal, hints?.localizedTitle || ""].map((t) => t.trim()).filter(Boolean))
    );

    const primaryQuery = cleanTitle || cleanOriginal;
    let edges = await searchJustWatchNodes(primaryQuery);
    let best = selectBestJustWatchNode(edges, targetTitles, year, hints);

    // Fallback sul titolo originale se il titolo italiano non ha trovato il match esatto
    if (!best && cleanOriginal && cleanOriginal.toLowerCase() !== primaryQuery.toLowerCase()) {
      edges = await searchJustWatchNodes(cleanOriginal);
      best = selectBestJustWatchNode(edges, targetTitles, year, hints);
    }

    if (!best) {
      jwCache.set(cacheKey, null);
      return null;
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

    const oJson = (await offersRes.json()) as {
      data?: { node?: { offers?: JWOffer[] } };
    };
    const offers: JWOffer[] = oJson.data?.node?.offers || [];

    let primeDirectUrl: string | null = null;
    const directUrlsByPlatform = new Map<string, string>();

    for (const off of offers) {
      const url = off.standardWebURL;
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

