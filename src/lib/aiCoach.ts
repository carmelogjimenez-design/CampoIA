import { supabase } from './supabase'
import { Player } from '../types/database'
import { posLabel } from './positions'

export function playerContextString(p?: Player): string {
  if (!p) return 'Sin jugador seleccionado.'
  return `Jugador: ${p.name}. Demarcación: ${posLabel(p.pos, p.pos_group)}. `
    + `${p.age ? `Edad: ${p.age}. ` : ''}${p.club ? `Club: ${p.club}. ` : ''}`
    + `${p.foot ? `Pie: ${p.foot}. ` : ''}${p.height_cm ? `Altura: ${p.height_cm}cm. ` : ''}${p.weight_kg ? `Peso: ${p.weight_kg}kg. ` : ''}`
}

export async function askAI(opts: {
  question: string; playerContext: string
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-api`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_KEY,
    },
    body: JSON.stringify({
      mode: 'chat', question: opts.question, playerContext: opts.playerContext,
      coachName: 'el coach', conversation: opts.conversation ?? [],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  if (!json.text) throw new Error('La IA respondió vacío' + (json.finishReason ? ` (${json.finishReason})` : ''))
  return json.text as string
}

// ════════════════════════════════════════════════════════════
// Modos JSON de la Edge Function
// `player_metrics` e `import_season` devuelven JSON puro
// (responseMimeType: application/json, temperatura baja).
// Si la función desplegada aún no los tiene, caemos a `chat`
// y extraemos el JSON del texto: así nunca se queda muerto.
// ════════════════════════════════════════════════════════════

const AI_URL = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-api`

async function callEdge(payload: Record<string, unknown>): Promise<{ text?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(AI_URL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_KEY,
    },
    body: JSON.stringify(payload),
  })
  return await res.json()
}

/** Extrae el primer objeto JSON de un texto, aunque venga con ```json o explicaciones. */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(cleaned) as T } catch { /* seguimos buscando */ }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T } catch { return null }
}

async function askAIJson<T>(mode: 'player_metrics' | 'import_season', prompt: string): Promise<T> {
  let json = await callEdge({ mode, prompt })

  // Respaldo: la función desplegada no conoce el modo todavía
  if (json.error && /mode desconocido/i.test(json.error)) {
    json = await callEdge({
      mode: 'chat',
      coachName: 'el coach',
      playerContext: '',
      conversation: [],
      question: prompt + '\n\nResponde ÚNICAMENTE con el JSON pedido, sin texto alrededor ni ```.',
    })
  }

  if (json.error) throw new Error(json.error)
  if (!json.text) throw new Error('La IA respondió vacío.')

  const parsed = extractJson<T>(json.text)
  if (!parsed) throw new Error('La IA no devolvió un JSON válido. Vuelve a intentarlo.')
  return parsed
}

// ── Estimación de atributos ──────────────────────────────────

export async function estimateAttributes(p: Player): Promise<{ values: Record<string, number>; note: string }> {
  const prompt = `Eres un ojeador de fútbol. Estima los atributos de este jugador del 0 al 99, ` +
    `donde 50 es la media de su categoría y edad (NO la media del fútbol profesional).\n` +
    `${playerContextString(p)}\n` +
    `${p.strength ? `Puntos fuertes observados: ${p.strength}. ` : ''}` +
    `${p.improve ? `A mejorar: ${p.improve}. ` : ''}\n` +
    `Sé prudente: si no tienes datos suficientes para una faceta, acércala a 50. ` +
    `Ajusta a su demarcación (a un portero se le valora el juego de pies, la colocación y los reflejos, no el regate).\n` +
    `Devuelve SOLO este JSON:\n` +
    `{"Técnica":0,"Táctica":0,"Físico":0,"Mental":0,"Velocidad":0,"Lectura":0,"nota":"una frase explicando en qué te has basado"}`

  const raw = await askAIJson<Record<string, unknown>>('player_metrics', prompt)
  const values: Record<string, number> = {}
  for (const k of ['Técnica', 'Táctica', 'Físico', 'Mental', 'Velocidad', 'Lectura']) {
    const n = Number(raw[k])
    if (Number.isFinite(n)) values[k] = Math.max(0, Math.min(99, Math.round(n)))
  }
  if (!Object.keys(values).length) throw new Error('La IA no devolvió atributos utilizables.')
  return { values, note: typeof raw.nota === 'string' ? raw.nota : '' }
}

// ── Importar temporada ───────────────────────────────────────

export interface SeasonMatch {
  date: string | null
  rival: string | null
  result: string | null
  mins: number | null
  role: string | null       // titular | suplente | no-play
  goals: number | null
  assists: number | null
  conceded: number | null
  clean_sheet: boolean | null
  notes: string | null
}

export interface SeasonImport {
  matches: SeasonMatch[]
  season: {
    competition?: string | null
    team?: string | null
    callups?: number | null
    played?: number | null
    mins?: number | null
    goals?: number | null
    assists?: number | null
    conceded?: number | null
    clean_sheets?: number | null
  }
  summary: string
}

const ROLES = ['titular', 'suplente', 'no-play']

export async function structureSeason(p: Player, seasonText: string): Promise<SeasonImport> {
  const prompt = `Eres un analista de datos de fútbol. Te paso el histórico COMPLETO de una temporada ` +
    `de un jugador, tal cual sale de la web de la federación. Conviértelo en datos estructurados.\n\n` +
    `JUGADOR: ${playerContextString(p)}\n\n` +
    `REGLAS:\n` +
    `- Extrae TODOS los partidos que encuentres, uno a uno. No resumas, no agrupes, no te dejes ninguno.\n` +
    `- "date" en formato AAAA-MM-DD. Si el año no aparece, dedúcelo de la temporada. Si no puedes, null.\n` +
    `- "role": "titular" si empezó jugando, "suplente" si entró desde el banquillo, "no-play" si fue convocado y no jugó.\n` +
    `- "mins" son minutos jugados en ese partido (número). Si no consta, null.\n` +
    `- "conceded" son goles encajados: rellénalo SOLO si el jugador es portero.\n` +
    `- "clean_sheet": true solo si es portero, jugó y encajó 0.\n` +
    `- "result" como "2-1" desde el punto de vista de su equipo.\n` +
    `- No inventes NADA. Lo que no esté en el texto va a null.\n\n` +
    `HISTÓRICO:\n${seasonText}\n\n` +
    `Devuelve SOLO este JSON:\n` +
    `{"matches":[{"date":null,"rival":null,"result":null,"mins":null,"role":null,"goals":null,"assists":null,"conceded":null,"clean_sheet":null,"notes":null}],` +
    `"season":{"competition":null,"team":null,"callups":null,"played":null,"mins":null,"goals":null,"assists":null,"conceded":null,"clean_sheets":null},` +
    `"summary":"2 o 3 frases sobre la temporada"}`

  const raw = await askAIJson<Record<string, unknown>>('import_season', prompt)
  const rawMatches = Array.isArray(raw.matches) ? raw.matches : []

  const num = (v: unknown): number | null => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const str = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s ? s : null
  }

  const matches: SeasonMatch[] = rawMatches.map(m => {
    const o = (m ?? {}) as Record<string, unknown>
    const role = str(o.role)?.toLowerCase() ?? null
    return {
      date: str(o.date),
      rival: str(o.rival),
      result: str(o.result),
      mins: num(o.mins),
      role: role && ROLES.includes(role) ? role : null,
      goals: num(o.goals),
      assists: num(o.assists),
      conceded: num(o.conceded),
      clean_sheet: typeof o.clean_sheet === 'boolean' ? o.clean_sheet : null,
      notes: str(o.notes),
    }
  }).filter(m => m.date || m.rival || m.mins !== null)

  const s = (raw.season ?? {}) as Record<string, unknown>
  return {
    matches,
    season: {
      competition: str(s.competition), team: str(s.team),
      callups: num(s.callups), played: num(s.played), mins: num(s.mins),
      goals: num(s.goals), assists: num(s.assists),
      conceded: num(s.conceded), clean_sheets: num(s.clean_sheets),
    },
    summary: typeof raw.summary === 'string' ? raw.summary : '',
  }
}
