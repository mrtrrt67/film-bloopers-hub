import { Metadata } from "next";
import { Trophy, Award, Crown, Star, Sparkles, Shield, User, ThumbsUp, CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPublicAuthor, getRankInfo, replacePlaceholders } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const bannerTitolo = conf["classifica_banner_titolo"] || "Come si guadagnano i Punti e come funzionano i Premi?";

  // 2. Recupero classifica utenti (escludendo l'amministratore)
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
  const isAdminUser = user?.email?.toLowerCase() === adminEmail;

  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select("id, email, username, punti, tier, tipo_abbonamento, is_admin")
    .order("punti", { ascending: false })
    .limit(50);

  // L'amministratore non concorre alla classifica pubblica della community
  const profiles = (rawProfiles || [])
    .filter((p: any) => {
      if (p.is_admin === true) return false;
      if (p.email && p.email.toLowerCase() === adminEmail) return false;
      if (p.username && p.username.toLowerCase() === adminEmail.split("@")[0].toLowerCase()) return false;
      return true;
    })
    .slice(0, 30);

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

      {/* Avviso Admin: escluso dalla classifica pubblica */}
      {isAdminUser && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-center gap-3 shadow-lg">
          <Shield className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold text-amber-200">Account Amministratore</p>
            <p className="text-zinc-300 text-[11px] mt-0.5">
              Sei autenticato come amministratore ({user?.email}). Il tuo profilo è escluso dalla classifica pubblica per garantire la trasparenza e la leale competizione tra gli utenti della community.
            </p>
          </div>
        </div>
      )}

      {/* Sezione Regole & Sistema di Punteggio */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-zinc-900/80 to-zinc-950 p-6 sm:p-7 mb-10 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2.5">
            <Award className="h-5 w-5 text-amber-400" />
            <span>{bannerTitolo}</span>
          </h3>
          <span className="text-xs font-mono font-bold text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 self-start sm:self-auto">
            ⚡ Regolamento Ufficiale Community
          </span>
        </div>

        {/* Le 3 Vie per Guadagnare Punti */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Segnalazione Nuovo Errore */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2 hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold text-sm">
                1
              </span>
              <span className="rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs px-2.5 py-1 border border-amber-500/30">
                +10 Punti
              </span>
            </div>
            <h4 className="text-sm font-bold text-white pt-1">Segnala un Nuovo Blooper</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Scovi un errore di scena, anacronismo o microfono visibile? Inseriscilo dalla scheda del film. Non appena lo staff lo verifica e lo approva, guadagni <strong className="text-amber-300">+10 pt</strong> (oppure <strong className="text-amber-300">+20 pt 2x</strong> con abbonamento Annuale o Lifetime).
            </p>
          </div>

          {/* Card 2: Contestazione o Correzione */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2 hover:border-rose-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 font-bold text-sm">
                2
              </span>
              <span className="rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs px-2.5 py-1 border border-rose-500/30">
                +10 Punti
              </span>
            </div>
            <h4 className="text-sm font-bold text-white pt-1">Contesta o Correggi un Errore</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Hai notato un blooper inesistente o un minutaggio impreciso? Clicca sul pollice in giù (👎) e motiva la contestazione: se la segnalazione porta alla rettifica o rimozione dell&apos;errore errato, ricevi <strong className="text-rose-300">+10 pt</strong> (+20 pt 2x con piano Annuale o Lifetime).
            </p>
          </div>

          {/* Card 3: Rendita Pollici in Su */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-2 hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-sm">
                3
              </span>
              <span className="rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs px-2.5 py-1 border border-emerald-500/40">
                +1 Punto / 👍
              </span>
            </div>
            <h4 className="text-sm font-bold text-white pt-1">Rendita Pollici in Su (👍)</h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Ogni volta che un altro membro della community conferma con un pollice in su (👍) un tuo blooper approvato, guadagni <strong className="text-emerald-300">+1 punto passivo</strong>! Più i tuoi bloopers sono curati e veritieri, più punti accumulerai automaticamente nel tempo.
            </p>
          </div>
        </div>

        {/* Note di Trasparenza & Anti-Spam */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 flex items-start gap-3 text-xs text-zinc-400">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-200">Archivio IA vs Utenti:</strong> Il catalogo iniziale è stato pre-popolato dall&apos;Intelligenza Artificiale per fornire una solida base di partenza. I bloopers IA non appartengono ad alcun utente e non generano punti sui voti; i punti spettano unicamente agli utenti reali sui loro bloopers originali approvati.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 flex items-start gap-3 text-xs text-zinc-400">
            <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-200">Zero Clic Selvaggio:</strong> Votare 👍 un blooper assegna 0 punti al votante ed è impossibile votare i propri bloopers. Questo impedisce account bot o spam e premia solo la reale qualità delle scoperte cinematografiche.
            </div>
          </div>
        </div>

        {/* Premi in Palio */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white text-sm">I Premi in Palio:</strong>
              <p className="text-zinc-400 text-xs">
                Ogni <strong className="text-amber-300">{sogliaMensile} Punti</strong> sblocchi automaticamente 1 mese Premium omaggio. Al raggiungimento di <strong className="text-amber-300">{sogliaLifetime} Punti</strong> ottieni il pass <strong>Lifetime gratuito per sempre</strong>!
              </p>
            </div>
          </div>
        </div>
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
          {profiles.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Nessun utente ha ancora accumulato punti. Segnala un blooper per essere il primo in classifica!
            </div>
          ) : (
            profiles.map((p: any, idx: number) => {
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
          }))}
        </div>
      </div>
    </div>
  );
}
