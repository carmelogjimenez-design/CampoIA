// ════════════════════════════════════════════════════════════
// CAMPO — Progresión
// Responde a "¿cómo estaba y cómo está?" comparando dos ventanas
// de tiempo con los MISMOS datos que ya tiene la app: partidos,
// entrenos, ejercicios, tareas, bienestar, alimentación y tests.
// Nada de aquí se inventa: si no hay datos en un periodo, se dice.
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase'
import {
  Player, Match, TrainingSession, SessionExercise, Task,
  CheckIn, NutritionLog, PhysicalTest, MealPlanItem,
} from '../types/database'
import { dayCompliance, isoDate } from './mealPlan'

export type Ventana = 30 | 60 | 90

/** Una métrica con su valor antes, ahora, y si eso es bueno o malo. */
export interface Delta {
  id: string
  label: string
  /** Cómo se muestra: 78 → "78%" */
  unit: '%' | '' | 'h' | '/10' | 'min'
  antes: number | null
  ahora: number | null
  /** Si subir es mejorar. En dolor o goles encajados, es al revés. */
  masEsMejor: boolean
  /** Contexto para el coach: de dónde sale el número. */
  nota?: string
}

export interface Progreso {
  ventana: Ventana
  desde: string
  hasta: string
  compromiso: Delta[]
  competicion: Delta[]
  bienestar: Delta[]
  tests: Delta[]
  /** Sin datos suficientes para comparar. */
  vacio: boolean
}

export interface DeltaCalc {
  cambio: number | null       // ahora - antes
  pct: number | null          // variación relativa
  mejora: boolean | null
  nuevo: boolean              // solo hay datos del periodo actual
}

export function calcDelta(d: Delta): DeltaCalc {
  if (d.ahora === null) return { cambio: null, pct: null, mejora: null, nuevo: false }
  if (d.antes === null) return { cambio: null, pct: null, mejora: null, nuevo: true }
  const cambio = d.ahora - d.antes
  const pct = d.antes !== 0 ? (cambio / Math.abs(d.antes)) * 100 : null
  const mejora = cambio === 0 ? null : (d.masEsMejor ? cambio > 0 : cambio < 0)
  return { cambio, pct, mejora, nuevo: false }
}

const media = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const r1 = (n: number | null) => n === null ? null : Math.round(n * 10) / 10

function enRango(fecha: string | null | undefined, desde: Date, hasta: Date): boolean {
  if (!fecha) return false
  const d = new Date(fecha + (fecha.length === 10 ? 'T12:00:00' : ''))
  return d >= desde && d < hasta
}

export async function buildProgreso(player: Player, ventana: Ventana = 30): Promise<Progreso> {
  const ahora = new Date()
  const corte = new Date(ahora); corte.setDate(ahora.getDate() - ventana)
  const inicio = new Date(ahora); inicio.setDate(ahora.getDate() - ventana * 2)

  const [mt, tr, ex, tk, ck, nu, pt, mp] = await Promise.all([
    supabase.from('matches').select('*').eq('player_id', player.id),
    supabase.from('training_sessions').select('*').eq('player_id', player.id),
    supabase.from('session_exercises').select('*').eq('player_id', player.id),
    supabase.from('tasks').select('*').eq('player_id', player.id),
    supabase.from('check_ins').select('*').eq('player_id', player.id),
    supabase.from('nutrition_logs').select('*').eq('player_id', player.id),
    supabase.from('physical_tests').select('*').eq('player_id', player.id).order('date'),
    supabase.from('meal_plans').select('id').eq('player_id', player.id).eq('active', true).maybeSingle(),
  ])

  const matches = (mt.data as Match[]) ?? []
  const sessions = (tr.data as TrainingSession[]) ?? []
  const exercises = (ex.data as SessionExercise[]) ?? []
  const tasks = (tk.data as Task[]) ?? []
  const checkins = (ck.data as CheckIn[]) ?? []
  const nutrition = (nu.data as NutritionLog[]) ?? []
  const tests = (pt.data as PhysicalTest[]) ?? []

  let planItems: MealPlanItem[] = []
  if (mp.data?.id) {
    const { data } = await supabase.from('meal_plan_items').select('*').eq('plan_id', mp.data.id)
    planItems = (data as MealPlanItem[]) ?? []
  }

  // Un periodo = { antes, ahora }
  const parte = <T,>(rows: T[], getFecha: (r: T) => string | null | undefined) => ({
    antes: rows.filter(r => enRango(getFecha(r), inicio, corte)),
    ahora: rows.filter(r => enRango(getFecha(r), corte, ahora)),
  })

  const S = parte(sessions, s => s.date)
  const M = parte(matches, m => m.date)
  const C = parte(checkins, c => c.date)
  const T = parte(tasks, t => t.due_date ?? t.created_at)

  const exDe = (ss: TrainingSession[]) => {
    const ids = new Set(ss.map(s => s.id))
    return exercises.filter(e => ids.has(e.session_id))
  }

  // ── COMPROMISO: lo que hace el jugador con lo que le mandas ──
  const adher = (ss: TrainingSession[]) =>
    ss.length ? Math.round(ss.filter(s => s.completed).length / ss.length * 100) : null

  const ejerc = (ss: TrainingSession[]) => {
    const es = exDe(ss)
    return es.length ? Math.round(es.filter(e => e.done).length / es.length * 100) : null
  }

  const tareas = (ts: Task[]) =>
    ts.length ? Math.round(ts.filter(t => t.done).length / ts.length * 100) : null

  const comidas = (desde: Date, hasta: Date) => {
    if (!planItems.length) return null
    let done = 0, total = 0
    for (let d = new Date(desde); d < hasta; d.setDate(d.getDate() + 1)) {
      const c = dayCompliance(planItems, nutrition, isoDate(d))
      done += c.done; total += c.total
    }
    return total ? Math.round(done / total * 100) : null
  }

  const compromiso: Delta[] = [
    { id: 'adherencia', label: 'Entrenos completados', unit: '%', masEsMejor: true,
      antes: adher(S.antes), ahora: adher(S.ahora),
      nota: `${S.ahora.filter(s => s.completed).length} de ${S.ahora.length} sesiones en el periodo` },
    { id: 'ejercicios', label: 'Ejercicios marcados', unit: '%', masEsMejor: true,
      antes: ejerc(S.antes), ahora: ejerc(S.ahora),
      nota: 'De los ejercicios de esas sesiones, cuántos marcó uno a uno' },
    { id: 'tareas', label: 'Tareas hechas', unit: '%', masEsMejor: true,
      antes: tareas(T.antes), ahora: tareas(T.ahora) },
    { id: 'comida', label: 'Plan de comidas seguido', unit: '%', masEsMejor: true,
      antes: comidas(inicio, corte), ahora: comidas(corte, ahora),
      nota: planItems.length ? undefined : 'Sin plan de alimentación asignado' },
    { id: 'checkins', label: 'Días que registró su estado', unit: '', masEsMejor: true,
      antes: C.antes.length || null, ahora: C.ahora.length || null,
      nota: `Sobre ${ventana} días posibles` },
  ]

  // ── COMPETICIÓN ──
  const gk = (player.pos ?? '').toUpperCase().startsWith('POR') || player.pos_group === 'POR'

  const minsPorPartido = (ms: Match[]) => {
    const jugados = ms.filter(m => (m.mins ?? 0) > 0)
    return jugados.length ? Math.round(jugados.reduce((a, m) => a + (m.mins ?? 0), 0) / jugados.length) : null
  }
  const pctTitular = (ms: Match[]) =>
    ms.length ? Math.round(ms.filter(m => m.role === 'titular').length / ms.length * 100) : null

  const competicion: Delta[] = [
    { id: 'convocatorias', label: 'Convocatorias', unit: '', masEsMejor: true,
      antes: M.antes.length || null, ahora: M.ahora.length || null },
    { id: 'titular', label: 'Partidos de titular', unit: '%', masEsMejor: true,
      antes: pctTitular(M.antes), ahora: pctTitular(M.ahora) },
    { id: 'minutos', label: 'Minutos por partido', unit: 'min', masEsMejor: true,
      antes: minsPorPartido(M.antes), ahora: minsPorPartido(M.ahora) },
  ]

  if (gk) {
    const encajados = (ms: Match[]) => {
      const j = ms.filter(m => (m.mins ?? 0) > 0 && m.conceded != null)
      return j.length ? r1(j.reduce((a, m) => a + (m.conceded ?? 0), 0) / j.length) : null
    }
    competicion.push(
      { id: 'encajados', label: 'Goles encajados por partido', unit: '', masEsMejor: false,
        antes: encajados(M.antes), ahora: encajados(M.ahora) },
      { id: 'porterias', label: 'Porterías a cero', unit: '', masEsMejor: true,
        antes: M.antes.filter(m => m.clean_sheet).length || null,
        ahora: M.ahora.filter(m => m.clean_sheet).length || null },
    )
  } else {
    const porPartido = (ms: Match[], campo: 'goals' | 'assists') => {
      const j = ms.filter(m => (m.mins ?? 0) > 0)
      return j.length ? r1(j.reduce((a, m) => a + (m[campo] ?? 0), 0) / j.length) : null
    }
    competicion.push(
      { id: 'goles', label: 'Goles por partido', unit: '', masEsMejor: true,
        antes: porPartido(M.antes, 'goals'), ahora: porPartido(M.ahora, 'goals') },
      { id: 'asistencias', label: 'Asistencias por partido', unit: '', masEsMejor: true,
        antes: porPartido(M.antes, 'assists'), ahora: porPartido(M.ahora, 'assists') },
    )
  }

  // ── BIENESTAR ──
  const bienestar: Delta[] = [
    { id: 'sueno', label: 'Horas de sueño', unit: 'h', masEsMejor: true,
      antes: r1(media(C.antes.map(c => c.sleep_hours).filter((x): x is number => x != null))),
      ahora: r1(media(C.ahora.map(c => c.sleep_hours).filter((x): x is number => x != null))) },
    { id: 'dolor', label: 'Dolor declarado', unit: '/10', masEsMejor: false,
      antes: r1(media(C.antes.map(c => c.pain).filter((x): x is number => x != null))),
      ahora: r1(media(C.ahora.map(c => c.pain).filter((x): x is number => x != null))) },
    { id: 'rpe', label: 'Esfuerzo percibido (RPE)', unit: '/10', masEsMejor: true,
      antes: r1(media(S.antes.map(s => s.rpe).filter((x): x is number => x != null))),
      ahora: r1(media(S.ahora.map(s => s.rpe).filter((x): x is number => x != null))),
      nota: 'No es bueno ni malo por sí solo: mira si sube junto al dolor' },
  ]

  // ── TESTS FÍSICOS: primero contra último, sin ventanas ──
  const testCampos: [keyof PhysicalTest, string, Delta['unit'], boolean][] = [
    ['vertical_jump', 'Salto vertical', '', true],
    ['horizontal_jump', 'Salto horizontal', '', true],
    ['sprint_10m', 'Sprint 10 m', '', false],
    ['sprint_30m', 'Sprint 30 m', '', false],
    ['agility', 'Agilidad', '', false],
    ['flexibility', 'Flexibilidad', '', true],
    ['strength', 'Fuerza', '', true],
  ]
  const primero = tests[0]
  const ultimo = tests.length > 1 ? tests[tests.length - 1] : null

  const testDeltas: Delta[] = testCampos.map(([k, label, unit, mas]) => ({
    id: String(k), label, unit, masEsMejor: mas,
    antes: (primero?.[k] as number | null) ?? null,
    ahora: (ultimo?.[k] as number | null) ?? (primero?.[k] as number | null) ?? null,
    nota: !ultimo ? 'Solo hay un test: aún no se puede medir progresión' : undefined,
  })).filter(d => d.antes !== null || d.ahora !== null)

  const todo = [...compromiso, ...competicion, ...bienestar, ...testDeltas]
  const vacio = todo.every(d => d.antes === null && d.ahora === null)

  return {
    ventana,
    desde: isoDate(inicio), hasta: isoDate(ahora),
    compromiso, competicion, bienestar, tests: testDeltas, vacio,
  }
}

/** Puntuación 0-100 de compromiso: la media de lo que sí tiene datos. */
export function scoreCompromiso(ds: Delta[]): number | null {
  const pcts = ds.filter(d => d.unit === '%' && d.ahora !== null).map(d => d.ahora!)
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null
}

/** Una frase honesta sobre la tendencia general, sin adornos. */
export function resumenTendencia(p: Progreso): string {
  const todos = [...p.compromiso, ...p.competicion, ...p.bienestar]
  const comparables = todos.filter(d => d.antes !== null && d.ahora !== null)
  if (comparables.length < 3) {
    return `Todavía no hay datos suficientes de los ${p.ventana} días anteriores para comparar. En cuanto acumules un par de meses, esta sección tendrá sentido.`
  }
  const mejoras = comparables.filter(d => calcDelta(d).mejora === true).length
  const empeora = comparables.filter(d => calcDelta(d).mejora === false).length

  if (mejoras > empeora * 2) return `Mejora clara: ${mejoras} de ${comparables.length} indicadores han subido respecto a los ${p.ventana} días anteriores.`
  if (empeora > mejoras * 2) return `Atención: ${empeora} de ${comparables.length} indicadores han bajado respecto a los ${p.ventana} días anteriores.`
  return `Estable: ${mejoras} indicadores mejoran y ${empeora} empeoran respecto a los ${p.ventana} días anteriores.`
}
