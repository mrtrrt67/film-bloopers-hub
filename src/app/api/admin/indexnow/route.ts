import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  submitToIndexNow, 
  getAllSiteUrls, 
  INDEXNOW_KEY, 
  INDEXNOW_HOST,
  INDEXNOW_ENDPOINT 
} from "@/lib/indexnow";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const keyLocation = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
    const urls = await getAllSiteUrls();

    return NextResponse.json({
      key: INDEXNOW_KEY,
      host: INDEXNOW_HOST,
      keyLocation,
      endpoint: INDEXNOW_ENDPOINT,
      totalUrlsCount: urls.length,
    });
  } catch (err: any) {
    console.error("Errore recupero configurazione IndexNow:", err);
    return NextResponse.json({ error: err.message || "Errore IndexNow" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let urlsToSubmit: string[] = [];

    if (Array.isArray(body.urls) && body.urls.length > 0) {
      urlsToSubmit = body.urls;
    } else {
      urlsToSubmit = await getAllSiteUrls();
    }

    const result = await submitToIndexNow(urlsToSubmit);

    return NextResponse.json({
      ...result,
      urlsCount: urlsToSubmit.length,
      key: INDEXNOW_KEY,
      keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    });
  } catch (err: any) {
    console.error("Errore submit IndexNow:", err);
    return NextResponse.json({ error: err.message || "Errore sottomissione IndexNow" }, { status: 500 });
  }
}

