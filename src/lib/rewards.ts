/**
 * Gestione automatica dell'assegnazione punti e sblocco automatico premi
 * (50 punti = 1 mese di Premium omaggio, 10.000 punti = Lifetime omaggio).
 */
export async function checkAndAwardPointRewards(
  supabase: any,
  profileId: string,
  newTotalPoints: number
) {
  try {
    // 1. Recupera le soglie configurate dal database (o usa i valori predefiniti)
    const { data: configRows } = await supabase
      .from("configurazioni")
      .select("chiave, valore");

    const conf: Record<string, string> = {};
    (configRows || []).forEach((c: any) => {
      conf[c.chiave] = c.valore;
    });

    const sogliaMensile = parseInt(conf["soglia_punti_mensile"] || "50", 10);
    const sogliaLifetime = parseInt(conf["soglia_punti_lifetime"] || "10000", 10);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile) return { success: false, error: "Profilo non trovato" };

    const currentTier = profile.tier || "free";
    const currentSub = profile.tipo_abbonamento || "nessuno";
    const mesiGiaAccreditati = profile.mesi_accreditati || 0;
    const oggi = new Date().toISOString().slice(0, 10);

    // A. Controllo soglia Lifetime (10.000 pt per default)
    if (newTotalPoints >= sogliaLifetime) {
      if (currentTier !== "premium" || currentSub !== "lifetime") {
        await supabase
          .from("profiles")
          .update({
            punti: newTotalPoints,
            tier: "premium",
            tipo_abbonamento: "lifetime",
            data_scadenza: null,
          })
          .eq("id", profileId);

        return {
          success: true,
          unlocked: "lifetime",
          message: "Complimenti! Raggiunta la soglia massima: sbloccato l'abbonamento Lifetime a vita!",
        };
      }
    }

    // B. Controllo soglia Mensile (ogni 50 pt per default con accumulo)
    if (newTotalPoints >= sogliaMensile) {
      const mesiSpettanti = Math.floor(newTotalPoints / sogliaMensile);

      if (mesiSpettanti > mesiGiaAccreditati) {
        const diffMesi = mesiSpettanti - mesiGiaAccreditati;

        // Se l'utente ha già una scadenza attiva futura, aggiungi i mesi a partire da quella
        let baseDate = new Date();
        if (profile.data_scadenza && profile.data_scadenza > oggi) {
          baseDate = new Date(profile.data_scadenza);
        }
        baseDate.setDate(baseDate.getDate() + 30 * diffMesi);
        const nuovaScadenza = baseDate.toISOString().slice(0, 10);

        await supabase
          .from("profiles")
          .update({
            punti: newTotalPoints,
            tier: "premium",
            tipo_abbonamento: currentSub === "lifetime" ? "lifetime" : "mensile",
            data_scadenza: currentSub === "lifetime" ? null : nuovaScadenza,
            mesi_accreditati: mesiSpettanti,
          })
          .eq("id", profileId);

        return {
          success: true,
          unlocked: "mensile",
          mesiAggiunti: diffMesi,
          nuovaScadenza,
          message: `Sbloccati ${diffMesi} mese/i di Premium omaggio! Nuova scadenza: ${nuovaScadenza}`,
        };
      }
    }

    // Se non sblocca nuovi premi, aggiorna semplicemente il saldo punti
    await supabase
      .from("profiles")
      .update({ punti: newTotalPoints })
      .eq("id", profileId);

    return { success: true, unlocked: null };
  } catch (err: any) {
    console.error("Errore checkAndAwardPointRewards:", err);
    return { success: false, error: err.message };
  }
}
