import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getGeminiClient(): GoogleGenAI | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!rawKey) return null;
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  return new GoogleGenAI({ apiKey });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({ error: "GEMINI_API_KEY non presente nelle variabili d'ambiente" }, { status: 500 });
    }

    // 1. Interroga la lista ufficiale dei modelli abilitati per questa API Key
    const availableModels: Array<{ name: string; displayName?: string; description?: string; supportedMethods?: string[] }> = [];
    try {
      const pager = await ai.models.list();
      for await (const m of pager) {
        const name = m.name?.replace(/^models\//, "") || "";
        const methods = (m as any).supportedGenerationMethods || [];
        if (methods.length === 0 || methods.includes("generateContent")) {
          if (name && name.toLowerCase().includes("gemini") && !name.includes("embedding") && !name.includes("aqa")) {
            availableModels.push({
              name,
              displayName: (m as any).displayName || name,
              description: (m as any).description || "",
              supportedMethods: methods,
            });
          }
        }
      }
    } catch (listErr: any) {
      console.error("Errore models.list():", listErr);
    }

    // 2. Modelli candidati da testare con chiamata reale
    const testList = [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    const testResults: Array<{
      model: string;
      status: "funzionante" | "errore";
      latencyMs: number;
      sampleResponse?: string;
      error?: string;
    }> = [];

    for (const model of testList) {
      const t0 = performance.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: "Rispondi solo con la parola 'OK' se sei attivo.",
        });
        const latencyMs = Math.round(performance.now() - t0);
        const text = response.text?.trim() || "";
        testResults.push({
          model,
          status: "funzionante",
          latencyMs,
          sampleResponse: text.slice(0, 50),
        });
      } catch (err: any) {
        const latencyMs = Math.round(performance.now() - t0);
        testResults.push({
          model,
          status: "errore",
          latencyMs,
          error: err?.message || String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      liveTests: testResults,
      workingModels: testResults.filter((t) => t.status === "funzionante").map((t) => t.model),
      failingModels: testResults.filter((t) => t.status === "errore").map((t) => ({ model: t.model, error: t.error })),
      discoveredFromGoogleApi: availableModels.map((m) => m.name),
    });
  } catch (err: any) {
    console.error("Errore diagnostica modelli:", err);
    return NextResponse.json({ error: err.message || "Errore test modelli" }, { status: 500 });
  }
}
