import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const sezione = url.searchParams.get("sezione");

  // Retrocompatibilità Google Search Console & Streamlit Redirects (301 Permanenti)
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

  return NextResponse.next();
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
