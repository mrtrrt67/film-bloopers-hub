import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { 
  submitToIndexNow, 
  getAllSiteUrls, 
  getIndexNowDiff,
  recordSubmittedUrls,
  INDEXNOW_KEY, 
  INDEXNOW_HOST,
  INDEXNOW_ENDPOINT 
} from "@/lib/indexnow";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const diff = await getIndexNowDiff(adminDb);
    const keyLocation = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

    return NextResponse.json({
      key: INDEXNOW_KEY,
      host: INDEXNOW_HOST,
      keyLocation,
      endpoint: INDEXNOW_ENDPOINT,
      totalCount: diff.allUrls.length,
      submittedCount: diff.submittedUrls.length,
      missingCount: diff.missingUrls.length,
      lastSubmittedAt: diff.lastSubmittedAt,
    });
  } catch (err: any) {
    console.error("Errore recupero status IndexNow:", err);
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

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const body = await request.json().catch(() => ({}));
    let urlsToSubmit: string[] = [];

    if (Array.isArray(body.urls) && body.urls.length > 0) {
      urlsToSubmit = body.urls;
    } else if (body.mode === "all") {
      urlsToSubmit = await getAllSiteUrls();
    } else {
      // Default: "missing" (invia solo quelle non ancora registrate come inviate)
      const diff = await getIndexNowDiff(adminDb);
      urlsToSubmit = diff.missingUrls;
    }

    if (urlsToSubmit.length === 0) {
      return NextResponse.json({
        success: true,
        status: 200,
        submitted: 0,
        message: "Tutte le pagine del sito risultano già inviate a IndexNow. Nessuna pagina mancante da processare.",
      });
    }

    const result = await submitToIndexNow(urlsToSubmit);

    if (result.success) {
      await recordSubmittedUrls(urlsToSubmit, result.status, adminDb);
    }

    const updatedDiff = await getIndexNowDiff(adminDb);

    return NextResponse.json({
      ...result,
      urlsCount: urlsToSubmit.length,
      totalCount: updatedDiff.allUrls.length,
      submittedCount: updatedDiff.submittedUrls.length,
      missingCount: updatedDiff.missingUrls.length,
      lastSubmittedAt: updatedDiff.lastSubmittedAt,
    });
  } catch (err: any) {
    console.error("Errore invio IndexNow:", err);
    return NextResponse.json({ error: err.message || "Errore sottomissione IndexNow" }, { status: 500 });
  }
}
