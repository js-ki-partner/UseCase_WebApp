// Einfaches In-Memory-Rate-Limit (fixed window). Ausreichend fuer Ausbaustufe 1
// mit einem Anwendungscontainer. Bei mehreren Instanzen (Stufe 4) durch einen
// gemeinsamen Speicher (Redis/Postgres) ersetzen.

interface Fenster {
  count: number;
  resetAt: number;
}

const store = new Map<string, Fenster>();

export interface RateLimitErgebnis {
  ok: boolean;
  verbleibend: number;
  resetInSekunden: number;
}

export function rateLimit(
  key: string,
  limit: number,
  fensterSekunden: number,
): RateLimitErgebnis {
  const jetzt = Date.now();
  const fensterMs = fensterSekunden * 1000;
  const vorhanden = store.get(key);

  if (!vorhanden || vorhanden.resetAt <= jetzt) {
    store.set(key, { count: 1, resetAt: jetzt + fensterMs });
    return { ok: true, verbleibend: limit - 1, resetInSekunden: fensterSekunden };
  }

  vorhanden.count += 1;
  const resetInSekunden = Math.ceil((vorhanden.resetAt - jetzt) / 1000);
  if (vorhanden.count > limit) {
    return { ok: false, verbleibend: 0, resetInSekunden };
  }
  return { ok: true, verbleibend: limit - vorhanden.count, resetInSekunden };
}

// Gelegentliches Aufraeumen abgelaufener Fenster.
let letzteBereinigung = Date.now();
export function bereinigeRateLimitStore(): void {
  const jetzt = Date.now();
  if (jetzt - letzteBereinigung < 60_000) return;
  letzteBereinigung = jetzt;
  for (const [k, v] of store) {
    if (v.resetAt <= jetzt) store.delete(k);
  }
}
