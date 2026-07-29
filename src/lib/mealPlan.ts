import { supabase } from './supabase'

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const MEAL_TYPES = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Pre-entreno', 'Post-entreno', 'Cena', 'Almuerzo']

export interface ParsedMeal { day_index: number; meal_type: string; description: string; ord: number }

// Normaliza para comparar sin tildes ni mayúsculas
function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }

// Extrae el calendario semanal del texto markdown de la dieta
export function parseDietPlan(text: string): ParsedMeal[] {
  const items: ParsedMeal[] = []
  let day = -1, ord = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bare = norm(line.replace(/[#*_>-]/g, '').trim())

    // ¿es una cabecera de día?
    const dayHit = DAYS.findIndex(d => bare === norm(d) || bare.startsWith(norm(d) + ' ') || bare.startsWith(norm(d) + ':'))
    if (dayHit !== -1) { day = dayHit; continue }

    // ¿es una línea de comida "- Tipo: descripción"?
    if (day !== -1 && /^[-*]/.test(line)) {
      const content = line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '')
      const colon = content.indexOf(':')
      if (colon > 0) {
        const typeRaw = content.slice(0, colon).trim()
        const desc = content.slice(colon + 1).trim()
        const type = MEAL_TYPES.find(t => norm(typeRaw).includes(norm(t)) || norm(t).includes(norm(typeRaw)))
        if (type && desc) items.push({ day_index: day, meal_type: type, description: desc, ord: ord++ })
      }
    }
  }
  return items
}

// Guarda el plan (reemplaza el anterior activo del jugador)
export async function saveMealPlan(playerId: string, coachId: string, items: ParsedMeal[], title = 'Plan de la IA'): Promise<boolean> {
  if (!items.length) return false
  // desactivar planes anteriores
  await supabase.from('meal_plans').update({ active: false }).eq('player_id', playerId)
  const { data: plan } = await supabase.from('meal_plans')
    .insert([{ player_id: playerId, coach_id: coachId, title, active: true }]).select().single()
  if (!plan) return false
  await supabase.from('meal_plan_items').insert(items.map(it => ({
    plan_id: plan.id, player_id: playerId, coach_id: coachId,
    day_index: it.day_index, meal_type: it.meal_type, description: it.description, ord: it.ord,
  })))
  return true
}

// ── Gestión del plan activo (lado coach) ──
import { MealPlan, MealPlanItem } from '../types/database'

export async function getActivePlan(playerId: string): Promise<{ plan: MealPlan; items: MealPlanItem[] } | null> {
  const { data: plan } = await supabase.from('meal_plans').select('*').eq('player_id', playerId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!plan) return null
  const { data: items } = await supabase.from('meal_plan_items').select('*').eq('plan_id', plan.id).order('ord')
  return { plan: plan as MealPlan, items: (items as MealPlanItem[]) ?? [] }
}

// Progreso de HOY: comidas del día actual ya registradas por el jugador
export async function getTodayProgress(playerId: string, items: MealPlanItem[]): Promise<{ done: number; total: number }> {
  const todayIdx = (new Date().getDay() + 6) % 7
  const todayItems = items.filter(i => i.day_index === todayIdx)
  if (!todayItems.length) return { done: 0, total: 0 }
  const today = new Date().toISOString().slice(0, 10)
  const { data: logs } = await supabase.from('nutrition_logs').select('meal_type, description').eq('player_id', playerId).eq('date', today)
  const done = todayItems.filter(it => (logs ?? []).some(l => l.meal_type === it.meal_type && (l.description ?? '') === (it.description ?? ''))).length
  return { done, total: todayItems.length }
}

export async function updateMealItem(id: string, description: string) {
  await supabase.from('meal_plan_items').update({ description }).eq('id', id)
}
export async function deleteMealItem(id: string) {
  await supabase.from('meal_plan_items').delete().eq('id', id)
}
export async function addMealItem(planId: string, playerId: string, coachId: string, day_index: number, meal_type: string, description: string) {
  await supabase.from('meal_plan_items').insert([{ plan_id: planId, player_id: playerId, coach_id: coachId, day_index, meal_type, description, ord: 999 }])
}
export async function deletePlan(planId: string) {
  await supabase.from('meal_plans').delete().eq('id', planId)
}

// ════════════════════════════════════════════════════════════
// Cumplimiento del plan
// El cálculo anterior comparaba la descripción del registro con la
// del plan CARÁCTER A CARÁCTER. Como el jugador escribe con sus
// palabras, no coincidía nunca y el progreso salía siempre 0/7.
// Ahora se casa por tipo de comida y se mide el parecido del texto,
// que además nos dice si siguió el plan o se lo saltó.
// ════════════════════════════════════════════════════════════

import { NutritionLog } from '../types/database'

export type MealState = 'pendiente' | 'seguido' | 'sustituido'

export interface MealStatus {
  item: MealPlanItem
  log: NutritionLog | null
  state: MealState
}

export interface DayCompliance {
  dayIndex: number
  meals: MealStatus[]
  extras: NutritionLog[]      // lo que comió y no estaba en el plan
  done: number
  total: number
}

export function todayIndex(d = new Date()) { return (d.getDay() + 6) % 7 }
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function dayIndexOfISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return todayIndex()
  return todayIndex(new Date(y, m - 1, d))
}

const STOP = new Set(['con', 'de', 'y', 'la', 'el', 'los', 'las', 'un', 'una', 'al', 'en', 'a', 'del'])

function words(s: string): string[] {
  return norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}

/** 0 = nada que ver, 1 = lo mismo. Solapamiento de palabras con peso. */
export function similarity(a: string, b: string): number {
  const A = new Set(words(a)), B = new Set(words(b))
  if (!A.size || !B.size) return 0
  let hits = 0
  for (const w of A) if (B.has(w)) hits++
  return hits / Math.min(A.size, B.size)
}

/** Cruza el plan de un día con lo que el jugador registró esa fecha. */
export function dayCompliance(items: MealPlanItem[], logs: NutritionLog[], date: string): DayCompliance {
  const dayIdx = dayIndexOfISO(date)
  const planned = items.filter(i => i.day_index === dayIdx)
  const dayLogs = logs.filter(l => l.date === date)
  const used = new Set<string>()

  const meals: MealStatus[] = planned.map(item => {
    const log = dayLogs.find(l =>
      !used.has(l.id) && norm(l.meal_type ?? '') === norm(item.meal_type)
    ) ?? null
    if (log) used.add(log.id)
    if (!log) return { item, log: null, state: 'pendiente' as MealState }
    const sim = similarity(log.description ?? '', item.description ?? '')
    return { item, log, state: (sim >= 0.34 ? 'seguido' : 'sustituido') as MealState }
  })

  return {
    dayIndex: dayIdx,
    meals,
    extras: dayLogs.filter(l => !used.has(l.id)),
    done: meals.filter(m => m.state !== 'pendiente').length,
    total: meals.length,
  }
}

/** Adherencia de los últimos N días: comidas registradas sobre comidas planificadas. */
export function rangeAdherence(items: MealPlanItem[], logs: NutritionLog[], days = 7) {
  let done = 0, total = 0, followed = 0
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const c = dayCompliance(items, logs, isoDate(d))
    done += c.done; total += c.total
    followed += c.meals.filter(m => m.state === 'seguido').length
  }
  return {
    done, total, followed,
    pct: total ? Math.round(done / total * 100) : 0,
    fidelity: done ? Math.round(followed / done * 100) : 0,
  }
}

// ── Carga en bloque para el panel del coach (2-3 consultas en total) ──

export interface NutritionBundle {
  plans: MealPlan[]
  itemsByPlayer: Record<string, MealPlanItem[]>
  planByPlayer: Record<string, MealPlan>
  logsByPlayer: Record<string, NutritionLog[]>
  logs: NutritionLog[]
}

export async function loadNutritionBundle(coachId: string, sinceDays = 30): Promise<NutritionBundle> {
  const since = new Date(); since.setDate(since.getDate() - sinceDays)

  const [planRes, logRes] = await Promise.all([
    supabase.from('meal_plans').select('*').eq('coach_id', coachId).eq('active', true),
    supabase.from('nutrition_logs').select('*').eq('coach_id', coachId)
      .gte('date', isoDate(since)).order('date', { ascending: false }),
  ])

  const plans = (planRes.data as MealPlan[]) ?? []
  const logs = (logRes.data as NutritionLog[]) ?? []

  let items: MealPlanItem[] = []
  if (plans.length) {
    const { data } = await supabase.from('meal_plan_items').select('*')
      .in('plan_id', plans.map(p => p.id)).order('ord')
    items = (data as MealPlanItem[]) ?? []
  }

  const planByPlayer: Record<string, MealPlan> = {}
  for (const p of plans) planByPlayer[p.player_id] = p

  const planIdToPlayer: Record<string, string> = {}
  for (const p of plans) planIdToPlayer[p.id] = p.player_id

  const itemsByPlayer: Record<string, MealPlanItem[]> = {}
  for (const it of items) {
    const pid = planIdToPlayer[it.plan_id]
    if (!pid) continue
    ;(itemsByPlayer[pid] ??= []).push(it)
  }

  const logsByPlayer: Record<string, NutritionLog[]> = {}
  for (const l of logs) (logsByPlayer[l.player_id] ??= []).push(l)

  return { plans, itemsByPlayer, planByPlayer, logsByPlayer, logs }
}
