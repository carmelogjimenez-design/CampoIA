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
