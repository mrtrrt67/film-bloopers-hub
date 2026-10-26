import { Metadata } from "next";
import { Trophy, Award, Crown, Star, Sparkles, Shield, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPublicAuthor, getRankInfo, replacePlaceholders } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Classifica Cacciatori di Bloopers | FilmBloopers Hub",
  description: "Guarda chi sono i migliori cercatori di bloopers della community. Segnala errori, guadagna punti e sblocca l'abbonamento Premium gratuito a vita!",
};

export default async function ClassificaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Recupero configurazioni dinamiche
  const { data: configRows } = await supabase
    .from("configurazioni")
    .select("chiave, valore, visibile");

  const conf: Record<string, string> = {};
  (configRows || []).forEach((c: any) => {
    conf[c.chiave] = c.valore;
  });

  const sogliaMensile = parseInt(conf["soglia_punti_mensile"] || "50", 10);
  const sogliaLifetime = parseInt(conf["soglia_punti_lifetime"] || "10000", 10);

  const titoloPagina = conf["classifica_titolo"] || "Classifica Cacciatori di Bloopers";
  const bannerTitolo = conf["classifica_banner_titolo"] || "Come funziona il sistema di punti e premi?";

  const t1 = conf["classifica_testo_1"] || "Contribuisci segnalando nuovi errori o facendo validare le tue segnalazioni dall'amministratore.";
  const t2Raw = conf["classifica_testo_2"] || "⭐ Premio Mensile (Ogni {soglia_mensile} punti): Ogni volta che accumuli {soglia_mensile} punti, sblocchi automaticamente 1 mese di abbonamento Premium gratuito.";
  const t3Raw = conf["classifica_testo_3"] || "👑 Premio Lifetime ({soglia_lifetime} punti): Raggiungi la vetta della community arrivando a {soglia_lifetime} punti per sbloccare l'accesso Lifetime gratuito a vita!";

  const t2 = replacePlaceholders(t2Raw, { soglia_mensile: sogliaMensile });
  const t3 = replacePlaceholders(t3Raw, { soglia_lifetime: sogliaLifetime });

  // 2. Recupero classifica utenti
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, punti, tier, tipo_abbonamento")
    .order("punti", { ascending: false })
    .limit(30);

  const userProfile = (profiles as any[])?.find((p: any) => p.id === user?.id);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Intestazione */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
          <Trophy className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">{titoloPagina}</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-xl">
          Segnala errori cinematografici verificati, ottieni conferme dalla community e scala la classifica per sbloccare l&apos;accesso Premium gratuito.
        </p>
      </div>

      {/* Regole & Premi Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-950 p-6 mb-10 shadow-xl">
        <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 mb-3">
          <Award className="h-4 w-4" />
          {bannerTitolo}
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span><strong>Guadagna punti:</strong> {t1}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>{t2}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>{t3}</span>
          </li>
        </ul>
      </div>

      {/* Classifica Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-1">Pos</div>
          <div className="col-span-6 sm:col-span-5">Cacciatore</div>
          <div className="col-span-4 sm:col-span-3 text-center sm:text-left">Grado</div>
          <div className="hidden sm:block sm:col-span-3 text-right">Punti Accumulati</div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {(profiles || []).map((p: any, idx: number) => {
            const rank = idx + 1;
            const isCurrentUser = user && p.id === user.id;
            const rankInfo = getRankInfo(p.punti || 0, p.tier, p.tipo_abbonamento, sogliaMensile, sogliaLifetime);

            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 items-center px-6 py-4 text-sm transition-colors ${
                  isCurrentUser
                    ? "bg-amber-500/10 border-l-4 border-amber-500 font-semibold"
                    : "hover:bg-zinc-800/30"
                }`}
              >
                {/* Posizione */}
                <div className="col-span-2 sm:col-span-1 font-black">
                  {rank === 1 ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 font-black text-xs">
                      1°
                    </span>
                  ) : rank === 2 ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-300 text-zinc-950 font-black text-xs">
                      2°
                    </span>
                  ) : rank === 3 ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-700 text-white font-black text-xs">
                      3°
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-bold">{rank}°</span>
                  )}
                </div>

                {/* Utente */}
                <div className="col-span-6 sm:col-span-5 flex flex-col justify-center truncate">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-zinc-200 truncate">
                      {isCurrentUser ? (
                        <>
                          <strong className="text-amber-400 font-bold">{formatPublicAuthor(p.email, "utente")}</strong>{" "}
                          <span className="text-[10px] rounded bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5">
                            (Tu)
                          </span>
                        </>
                      ) : (
                        <span className="font-medium text-zinc-300">
                          {formatPublicAuthor(p.email, "utente")}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Punti visibili su mobile */}
                  <span className="sm:hidden text-[11px] font-mono font-bold text-amber-400/90 mt-0.5">
                    {p.punti || 0} pt
                  </span>
                </div>

                {/* Grado */}
                <div className="col-span-4 sm:col-span-3 text-center sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${rankInfo.badgeColor}`}
                  >
                    <span>{rankInfo.icon}</span>
                    <span>{rankInfo.grado}</span>
                  </span>
                </div>

                {/* Punti */}
                <div className="hidden sm:block sm:col-span-3 text-right font-mono font-bold text-amber-400">
                  {p.punti || 0} pt
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
