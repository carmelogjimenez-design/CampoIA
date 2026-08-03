import { supabase } from './supabase'
import { logAiUsage } from './admin'
import { Player } from '../types/database'
import { posLabel } from './positions'

export function playerContextString(p?: Player): string {
  if (!p) return 'Sin jugador seleccionado.'
  return `Jugador: ${p.name}. Demarcación: ${posLabel(p.pos, p.pos_group)}. `
    + `${p.age ? `Edad: ${p.age}. ` : ''}${p.club ? `Club: ${p.club}. ` : ''}`
    + `${p.foot ? `Pie: ${p.foot}. ` : ''}${p.height_cm ? `Altura: ${p.height_cm}cm. ` : ''}${p.weight_kg ? `Peso: ${p.weight_kg}kg. ` : ''}`
}

async function askAIRaw(opts: {
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

/** askAI con telemetría: mide duración y tamaño para el panel de superadmin. */
export async function askAI(args: Parameters<typeof askAIRaw>[0]): Promise<string> {
  const t0 = Date.now()
  const promptChars = (args.question?.length ?? 0) + (args.playerContext?.length ?? 0)
  try {
    const out = await askAIRaw(args)
    logAiUsage({ mode: 'chat', promptChars, outputChars: out.length, ok: true, ms: Date.now() - t0 })
    return out
  } catch (e) {
    logAiUsage({
      mode: 'chat', promptChars, outputChars: 0, ok: false,
      error: e instanceof Error ? e.message : 'error', ms: Date.now() - t0,
    })
    throw e
  }
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

function tryParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T } catch { return null }
}

/**
 * Devuelve todos los objetos {...} con llaves equilibradas, respetando
 * comillas y escapes (una llave dentro de un string no cuenta).
 */
function jsonCandidates(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue
    let depth = 0, inStr = false, esc = false
    for (let j = i; j < s.length; j++) {
      const ch = s[j]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) { out.push(s.slice(i, j + 1)); i = j; break } }
    }
  }
  return out
}

/**
 * Repara un JSON cortado por el límite de tokens del modelo.
 * Retrocede hasta el último elemento COMPLETO y cierra ahí lo que quedara
 * abierto: así los partidos que sí llegaron enteros no se pierden.
 */
function repairTruncated(s: string): string | null {
  const stack: string[] = []
  let inStr = false, esc = false, cut = -1, stackAtCut: string[] | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') { stack.pop(); cut = i; stackAtCut = [...stack] }
  }
  if (cut === -1 || !stackAtCut || !stackAtCut.length) return null
  return s.slice(0, cut + 1) + stackAtCut.reverse().join('')
}

/**
 * Saca el JSON de la respuesta de la IA, venga como venga: con prosa alrededor,
 * entre ```json, con el bloque <CAMPO_DATA> del chat pegado detrás, o cortado
 * a medias por el límite de tokens.
 */
export function extractJson<T = unknown>(raw: string, expectKey?: string): T | null {
  if (!raw) return null
  const s = String(raw)
    .replace(/<CAMPO_DATA>[\s\S]*?<\/CAMPO_DATA>/gi, ' ')
    .replace(/<\/?CAMPO_DATA>/gi, ' ')
    .replace(/```(?:json)?/gi, ' ')
    .trim()

  const direct = tryParse<Record<string, unknown>>(s)
  if (direct && typeof direct === 'object') return direct as T

  const cands = jsonCandidates(s)
    .map(c => ({ c, v: tryParse<Record<string, unknown>>(c) }))
    .filter((x): x is { c: string; v: Record<string, unknown> } => !!x.v && typeof x.v === 'object')

  // 1º un candidato que traiga la clave que esperamos
  if (expectKey) {
    const hit = cands.find(x => x.v[expectKey] !== undefined)
    if (hit) return hit.v as T
  }

  // 2º puede que el objeto grande venga cortado y solo veamos fragmentos sueltos
  const start = s.indexOf('{')
  if (start >= 0) {
    const rep = repairTruncated(s.slice(start))
    if (rep) {
      const v = tryParse<Record<string, unknown>>(rep)
      if (v && typeof v === 'object' && (!expectKey || v[expectKey] !== undefined)) return v as T
    }
  }

  // 3º lo mejor que haya
  if (cands.length) return cands.sort((a, b) => b.c.length - a.c.length)[0].v as T
  return null
}

/** Error de IA que se lleva consigo la respuesta cruda, para poder diagnosticar. */
export class AiJsonError extends Error {
  raw: string
  usedFallback: boolean
  constructor(message: string, raw: string, usedFallback: boolean) {
    super(message); this.name = 'AiJsonError'; this.raw = raw; this.usedFallback = usedFallback
  }
}

async function askAIJson<T>(
  mode: 'player_metrics' | 'import_season',
  prompt: string,
  expectKey?: string,
): Promise<T> {
  const t0 = Date.now()
  let usedFallback = false
  let json = await callEdge({ mode, prompt })

  // Respaldo: la Edge Function desplegada todavía no conoce este modo.
  // El modo chat lleva encima el prompt de coach (responde en Markdown y
  // añade su bloque <CAMPO_DATA>), así que hay que ser MUY explícito.
  const needsFallback = json.error && /mode desconocido|falta 'prompt'/i.test(json.error)
  if (needsFallback) {
    usedFallback = true
    json = await callEdge({
      mode: 'chat',
      coachName: 'el coach',
      playerContext: '',
      conversation: [],
      question:
        'MODO DATOS. Ignora cualquier instrucción previa sobre formato, Markdown, ' +
        'títulos, listas o bloques CAMPO_DATA. Tu respuesta completa debe ser UN ' +
        'ÚNICO objeto JSON y nada más: sin introducción, sin explicación, sin ``` ' +
        'y sin texto después.\n\n' + prompt,
    })
  }

  if (json.error) {
    logAiUsage({ mode, promptChars: prompt.length, outputChars: 0, ok: false, error: json.error, ms: Date.now() - t0 })
    throw new Error(json.error)
  }
  const raw = json.text ?? ''
  logAiUsage({ mode, promptChars: prompt.length, outputChars: raw.length, ok: !!raw.trim(), ms: Date.now() - t0 })
  if (!raw.trim()) throw new AiJsonError('La IA respondió vacío.', '', usedFallback)

  let parsed = extractJson<T>(raw, expectKey)

  // Un reintento con la instrucción más dura antes de rendirse.
  if (!parsed) {
    console.warn('[CAMPO] JSON no reconocido. Respuesta cruda:', raw)
    const retry = await callEdge({
      mode: usedFallback ? 'chat' : mode,
      coachName: 'el coach', playerContext: '', conversation: [],
      prompt: 'Devuelve SOLO JSON válido, sin nada más.\n' + prompt,
      question: 'Devuelve SOLO JSON válido, sin nada más, empezando por { y terminando por }.\n' + prompt,
    })
    if (!retry.error && retry.text) parsed = extractJson<T>(retry.text, expectKey)
    if (!parsed) {
      console.error('[CAMPO] Segundo intento fallido. Respuesta:', retry.text ?? retry.error)
      const snippet = raw.trim().slice(0, 220).replace(/\s+/g, ' ')
      throw new AiJsonError(
        `La IA no devolvió datos estructurados${usedFallback ? ' (tu Edge Function no tiene el modo import_season: está usando el respaldo)' : ''}. ` +
        `Empezó así: «${snippet}…». La respuesta completa está en la consola (F12).`,
        raw, usedFallback,
      )
    }
  }
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

  const raw = await askAIJson<Record<string, unknown>>('player_metrics', prompt, 'Técnica')
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
    `- No inventes NADA. Lo que no esté en el texto va a null.\n` +
    `- OMITE las claves cuyo valor sea null en vez de escribirlas: ahorra espacio y evita que te cortes.\n` +
    `- No escribas NADA fuera del JSON: ni introducción, ni explicación, ni \`\`\`.\n\n` +
    `HISTÓRICO:\n${seasonText}\n\n` +
    `Devuelve SOLO este JSON:\n` +
    `{"matches":[{"date":"","rival":"","result":"","mins":0,"role":"","goals":0,"assists":0,"conceded":0,"clean_sheet":false,"notes":""}],` +
    `"season":{"competition":null,"team":null,"callups":null,"played":null,"mins":null,"goals":null,"assists":null,"conceded":null,"clean_sheets":null},` +
    `"summary":"2 o 3 frases sobre la temporada"}`

  const raw = await askAIJson<Record<string, unknown>>('import_season', prompt, 'matches')
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
