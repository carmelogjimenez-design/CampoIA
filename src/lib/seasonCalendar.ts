// ════════════════════════════════════════════════════════════
// CAMPO — Calendario del equipo
// La ficha de la federación da el calendario completo del equipo,
// pero NO en cuáles jugó el jugador ni sus minutos: eso solo está
// dentro de cada acta. Así que leemos el calendario sin IA (exacto,
// gratis, no se trunca) y el coach marca las suyas.
// ════════════════════════════════════════════════════════════

export interface Fixture {
  round: number | null
  date: string | null      // AAAA-MM-DD
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
}

function normalize(s: string) { return s.replace(/\s+/g, ' ').trim() }

function toISO(s: string): string | null {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  return iso ? iso[0] : null
}

/**
 * Lee un calendario pegado. Acepta tabla Markdown, texto con tabulaciones
 * o líneas sueltas. Tolera negritas y nombres de equipo con guion
 * ("México-Paracuellos"): solo parte por guion largo o por " - " con espacios.
 */
export function parseFixtures(text: string): Fixture[] {
  const rows: Fixture[] = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^\|?\s*[-: ]+\|/.test(line)) continue                 // separador de la tabla

    const cells = line.includes('|')
      ? line.replace(/^\||\|$/g, '').split('|').map(c => normalize(c.replace(/\*\*/g, '')))
      : line.includes('\t')
        ? line.split('\t').map(c => normalize(c.replace(/\*\*/g, '')))
        : [normalize(line.replace(/\*\*/g, ''))]

    const date = toISO(cells.join(' '))
    if (!date) continue                                        // sin fecha no es un partido

    let matchCell: string | null = null
    let scoreCell: string | null = null
    for (const c of cells) {
      if (/^\d{1,2}\s*-\s*\d{1,2}$/.test(c)) { scoreCell = c; continue }
      if (/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(c)) continue
      if (/[–—]|\s-\s|\svs\.?\s/i.test(c)) matchCell = c
    }
    if (!matchCell) continue

    let parts = matchCell.split(/\s+[–—]\s+/)
    if (parts.length !== 2) parts = matchCell.split(/\s+-\s+/)
    if (parts.length !== 2) parts = matchCell.split(/\s+vs\.?\s+/i)
    if (parts.length !== 2) continue

    // El marcador puede venir pegado al final del texto del partido
    let hg: number | null = null, ag: number | null = null
    const scoreSrc = scoreCell ?? parts[1]
    const sm = scoreSrc.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*$/)
    if (sm) {
      hg = Number(sm[1]); ag = Number(sm[2])
      if (!scoreCell) parts[1] = normalize(parts[1].replace(/(\d{1,2})\s*-\s*(\d{1,2})\s*$/, ''))
    }

    const roundCell = cells.find(c => /^\d{1,2}$/.test(c))
    rows.push({
      round: roundCell ? Number(roundCell) : null,
      date,
      home: normalize(parts[0]),
      away: normalize(parts[1]),
      homeGoals: hg, awayGoals: ag,
    })
  }
  return rows
}

/** El equipo del jugador es el que aparece en (casi) todas las jornadas. */
export function detectTeam(rows: Fixture[]): string | null {
  const count: Record<string, number> = {}
  for (const r of rows) {
    count[r.home] = (count[r.home] ?? 0) + 1
    count[r.away] = (count[r.away] ?? 0) + 1
  }
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return null
  return sorted[0][1] >= rows.length * 0.6 ? sorted[0][0] : null
}

/** Todos los equipos que aparecen, por si la detección automática falla. */
export function teamOptions(rows: Fixture[]): string[] {
  const set = new Set<string>()
  for (const r of rows) { set.add(r.home); set.add(r.away) }
  return Array.from(set).sort()
}

export interface FixtureView {
  fixture: Fixture
  isHome: boolean
  rival: string
  /** Resultado desde el punto de vista del jugador: "2-1" es victoria suya. */
  result: string | null
  goalsFor: number | null
  goalsAgainst: number | null
}

export function viewFor(f: Fixture, team: string): FixtureView {
  const isHome = f.home === team
  const gf = isHome ? f.homeGoals : f.awayGoals
  const ga = isHome ? f.awayGoals : f.homeGoals
  return {
    fixture: f,
    isHome,
    rival: isHome ? f.away : f.home,
    result: gf != null && ga != null ? `${gf}-${ga}` : null,
    goalsFor: gf, goalsAgainst: ga,
  }
}
