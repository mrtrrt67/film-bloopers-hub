export interface AccessRecord {
  id?: number | string;
  tipo?: string | null;
  created_at: string;
  [key: string]: any;
}

export interface DedupResult<T extends AccessRecord> {
  uniqueRecords: T[];
  duplicateIds: (number | string)[];
}

/**
 * Deduplica gli accessi considerando duplicati i record aventi la stessa tipologia
 * (es. 'ospite' o 'utente:...') generati entro una finestra temporale (default 4000ms).
 * Restituisce i record univoci ordinati per data decrescente e gli ID duplicati da eliminare.
 */
export function deduplicateAccessRecords<T extends AccessRecord>(
  records: T[],
  windowMs = 4000
): DedupResult<T> {
  if (!records || records.length === 0) {
    return { uniqueRecords: [], duplicateIds: [] };
  }

  // Ordina cronologicamente in senso crescente per identificare il primo accesso reale e i cloni successivi
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const lastSeenMap = new Map<string, number>();
  const uniqueRecords: T[] = [];
  const duplicateIds: (number | string)[] = [];

  for (const record of sorted) {
    const rawTipo = (record.tipo || "ospite").trim().toLowerCase();
    const timeMs = new Date(record.created_at).getTime();
    const lastTimeMs = lastSeenMap.get(rawTipo);

    if (lastTimeMs !== undefined && Math.abs(timeMs - lastTimeMs) <= windowMs) {
      if (record.id !== undefined && record.id !== null) {
        duplicateIds.push(record.id);
      }
    } else {
      lastSeenMap.set(rawTipo, timeMs);
      uniqueRecords.push(record);
    }
  }

  // Riordina in senso decrescente (il più recente per primo)
  uniqueRecords.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { uniqueRecords, duplicateIds };
}

