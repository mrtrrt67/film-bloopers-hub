import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSupportedLocale, DEFAULT_LOCALE, Locale } from "@/i18n/config";

// File statici e route da ignorare completamente
const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignora file statici di sistema, immagini, icone, API e pannello Admin
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Estrai il primo segmento per verificare se è una lingua estera (/en, /es, /fr, /de)
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // Se il primo segmento è un locale estero supportato (en, es, fr, de)
  if (isSupportedLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE) {
    const locale: Locale = firstSegment;
    // Calcola il percorso interno senza prefisso lingua per il rendering del componente
    const remainingSegments = segments.slice(1);
    const internalPath = remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : "/";

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);
    requestHeaders.set("x-pathname", pathname);

    // Esegui rewrite interno: l'URL nel browser rimane /en/film/... mentre Next renderizza la pagina /film/...
    const rewriteUrl = new URL(internalPath, request.url);
    rewriteUrl.search = request.nextUrl.search;

    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });

    response.cookies.set("fbh_locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return response;
  }

  // 3. Se la richiesta è per la radice italiana (senza prefisso)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", DEFAULT_LOCALE);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
