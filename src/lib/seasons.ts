// ════════════════════════════════════════════════════════════
// CAMPO — Temporadas
// En España la temporada va de verano a verano: la 2025/26 empieza
// en agosto de 2025 y termina en junio de 2026. Cortamos el 1 de
// julio, que es cuando ya no queda competición.
// La temporada se DEDUCE de la fecha del partido, así que no hay
// que etiquetar nada a mano. La columna `season` existe solo por
// si algún día hace falta corregir un caso raro.
// ════════════════════════════════════════════════════════════

export const SEASON_START_MONTH = 7   // julio

/** "2025-09-27" → "2025/26" · "2026-05-23" → "2025/26" · "2026-09-14" → "2026/27" */
export function seasonOf(dateISO: string | null | undefined): string | null {
  if (!dateISO) return null
  const m = dateISO.match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const start = month >= SEASON_START_MONTH ? year : year - 1
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/** La temporada en curso hoy. */
export function currentSeason(now = new Date()): string {
  const start = now.getMonth() + 1 >= SEASON_START_MONTH ? now.getFullYear() : now.getFullYear() - 1
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/** Año en el que arranca esa temporada, para poder ordenarlas. */
export function seasonSortKey(season: string): number {
  const n = Number(season.slice(0, 4))
  return Number.isFinite(n) ? n : 0
}

export const NO_SEASON = 'Sin fecha'

/** La temporada de un partido: la guardada si la hay, si no la deducida de su fecha. */
export function matchSeason(m: { season?: string | null; date?: string | null }): string {
  return m.season || seasonOf(m.date) || NO_SEASON
}

/** Temporadas presentes en una lista de partidos, de la más reciente a la más antigua. */
export function seasonsIn(matches: { season?: string | null; date?: string | null }[]): string[] {
  const set = new Set(matches.map(matchSeason))
  const sinFecha = set.delete(NO_SEASON)
  const out = Array.from(set).sort((a, b) => seasonSortKey(b) - seasonSortKey(a))
  if (sinFecha) out.push(NO_SEASON)
  return out
}

/** "2025/26" → "Temporada 2025/26" */
export function seasonTitle(s: string): string {
  return s === NO_SEASON ? 'Partidos sin fecha' : `Temporada ${s}`
}
