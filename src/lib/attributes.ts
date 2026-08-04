// ════════════════════════════════════════════════════════════
// CAMPO — Atributos del jugador
// Fuente ÚNICA de verdad. Antes cada pantalla se inventaba los
// valores a partir de `score` (base-4, base-7…), así que la ficha
// mostraba números que no venían de ningún sitio.
// Ahora: o están valorados de verdad, o se dice que no lo están.
// ════════════════════════════════════════════════════════════

import { Player } from '../types/database'
import { supabase } from './supabase'

export const ATTR_KEYS = ['Técnica', 'Táctica', 'Físico', 'Mental', 'Velocidad', 'Lectura'] as const
export type AttrKey = typeof ATTR_KEYS[number]

export type AttrSource = 'coach' | 'ia' | 'none'

export interface AttributeSet {
  values: Record<string, number>
  source: AttrSource
  rated: boolean
  updatedAt: string | null
}

const META_KEY = '_meta'

/** Quita tildes y mayúsculas para comparar claves. */
const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

/** Devuelve la forma canónica ("fisico" → "Físico"); si no la reconoce, la deja igual. */
export function canonKey(k: string): string {
  const f = fold(k)
  const hit = ATTR_KEYS.find(a => fold(a) === f)
  return hit ?? k
}

/** Lee los atributos reales del jugador. Si no hay, `rated` es false: NO inventamos nada. */
export function getAttributes(player: Player | null | undefined): AttributeSet {
  const raw = player?.ai_attributes
  if (!raw || typeof raw !== 'object') {
    return { values: {}, source: 'none', rated: false, updatedAt: null }
  }

  const meta = (raw as Record<string, unknown>)[META_KEY] as
    { source?: AttrSource; at?: string } | undefined

  // Las claves llegan a veces sin tilde ("Fisico" vs "Físico") según las
  // escriba la IA o el coach, y el radar acababa pintando la misma faceta
  // dos veces. Aquí las unificamos a la forma canónica.
  const values: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k === META_KEY) continue
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    const canon = canonKey(k)
    // Si ya existe, nos quedamos con el valor más reciente (el último leído)
    values[canon] = Math.round(n)
  }

  if (!Object.keys(values).length) {
    return { values: {}, source: 'none', rated: false, updatedAt: null }
  }
  return {
    values,
    source: meta?.source === 'ia' ? 'ia' : 'coach',
    rated: true,
    updatedAt: meta?.at ?? null,
  }
}

/** Valores por defecto para abrir el editor la primera vez: el punto medio, honesto. */
export function blankAttributes(): Record<string, number> {
  return Object.fromEntries(ATTR_KEYS.map(k => [k, 50]))
}

/** Media de los atributos, redondeada. Null si no hay valoración. */
export function attributeAverage(set: AttributeSet): number | null {
  const vals = Object.values(set.values)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

/** Guarda la valoración y deja constancia de quién la hizo y cuándo. */
export async function saveAttributes(
  playerId: string,
  values: Record<string, number>,
  source: Exclude<AttrSource, 'none'>,
): Promise<{ error?: string }> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    clean[k] = Math.max(0, Math.min(99, Math.round(Number(v) || 0)))
  }
  clean[META_KEY] = { source, at: new Date().toISOString() }

  const { error } = await supabase
    .from('players')
    .update({ ai_attributes: clean })
    .eq('id', playerId)
  return error ? { error: error.message } : {}
}

/** Borra la valoración: vuelve al estado "sin valorar". */
export async function clearAttributes(playerId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('players').update({ ai_attributes: null }).eq('id', playerId)
  return error ? { error: error.message } : {}
}

/** Formato para el radar y los informes PDF. Vacío si no hay valoración. */
export function attributePairs(player: Player | null | undefined): [string, number][] {
  const set = getAttributes(player)
  if (!set.rated) return []
  return ATTR_KEYS.filter(k => k in set.values).map(k => [k, set.values[k]] as [string, number])
    .concat(Object.entries(set.values).filter(([k]) => !ATTR_KEYS.includes(k as AttrKey)) as [string, number][])
}

export const SOURCE_LABEL: Record<AttrSource, string> = {
  coach: 'Valorado por ti',
  ia: 'Estimado por la IA',
  none: 'Sin valorar',
}
