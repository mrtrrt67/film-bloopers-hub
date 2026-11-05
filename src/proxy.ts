import { NextResponse, type NextRequest } from "next/server";
import { isSupportedLocale, DEFAULT_LOCALE, Locale } from "@/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const sezione = url.searchParams.get("sezione");

  // 1. Retrocompatibilità Google Search Console & Streamlit Redirects (301 Permanenti)
  if (sezione) {
    const sezioneLower = sezione.toLowerCase();

    if (sezioneLower.includes("esplora")) {
      url.pathname = "/esplora";
      url.searchParams.delete("sezione");
      return NextResponse.redirect(url, 301);
    }

    if (sezioneLower.includes("classifica")) {
      url.pathname = "/classifica";
      url.searchParams.delete("sezione");
      return NextResponse.redirect(url, 301);
    }

    if (sezioneLower.includes("premium")) {
      url.pathname = "/pricing";
      url.searchParams.delete("sezione");
      return NextResponse.redirect(url, 301);
    }
  }

  // 2. Ignora file statici di sistema, immagini, icone, API e pannello Admin
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3. Estrai il primo segmento per verificare se è una lingua
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // Se l'utente tenta di accedere con prefisso esplicito /it/..., redirect 301 alla versione canonica senza prefisso
  if (firstSegment === DEFAULT_LOCALE) {
    const remainingSegments = segments.slice(1);
    const cleanPath = remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : "/";
    url.pathname = cleanPath;
    const response = NextResponse.redirect(url, 301);
    response.cookies.set("fbh_locale", DEFAULT_LOCALE, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return response;
  }

  // Se è un locale estero supportato (en, es, fr, de)
  if (isSupportedLocale(firstSegment)) {
    const locale: Locale = firstSegment;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);
    requestHeaders.set("x-pathname", pathname);

    const response = NextResponse.next({
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

  // 4. Per tutte le altre richieste (radice italiana senza prefisso)
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

export default proxy;
