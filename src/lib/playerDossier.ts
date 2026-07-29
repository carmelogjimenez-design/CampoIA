// ════════════════════════════════════════════════════════════
// CAMPO — Dossier del jugador
// Todo lo que la app sabe de un jugador, comprimido en un texto
// que la IA pueda leer. Antes solo le mandábamos nombre, edad y
// demarcación: analizaba a ciegas.
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase'
import {
  Player, Match, TrainingSession, Task, CheckIn,
  NutritionLog, PhysicalTest, MealPlanItem,
} from '../types/database'
import { posLabel } from './positions'
import { isGoalkeeper } from './players'
import { getAttributes, SOURCE_LABEL } from './attributes'
import { rangeAdherence } from './mealPlan'
import { matchSeason, seasonsIn, seasonTitle } from './seasons'

const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const r1 = (n: number | null) => n === null ? null : Math.round(n * 10) / 10

/** Ficha corta: para listados y cuando no hace falta el dossier entero. */
export function playerHeadline(p: Player): string {
  return `${p.name} · ${posLabel(p.pos, p.pos_group)}`
    + `${p.age ? ` · ${p.age} años` : ''}${p.club ? ` · ${p.club}` : ''}`
}

export async function buildPlayerDossier(player: Player): Promise<string> {
  const [mt, tr, tk, ck, nu, pt, mp] = await Promise.all([
    supabase.from('matches').select('*').eq('player_id', player.id).order('date', { ascending: false }),
    supabase.from('training_sessions').select('*').eq('player_id', player.id).order('date', { ascending: false }),
    supabase.from('tasks').select('*').eq('player_id', player.id),
    supabase.from('check_ins').select('*').eq('player_id', player.id).order('date', { ascending: false }).limit(20),
    supabase.from('nutrition_logs').select('*').eq('player_id', player.id).order('date', { ascending: false }).limit(60),
    supabase.from('physical_tests').select('*').eq('player_id', player.id).order('date', { ascending: true }),
    supabase.from('meal_plans').select('id').eq('player_id', player.id).eq('active', true).maybeSingle(),
  ])

  const matches = (mt.data as Match[]) ?? []
  const sessions = (tr.data as TrainingSession[]) ?? []
  const tasks = (tk.data as Task[]) ?? []
  const checkins = (ck.data as CheckIn[]) ?? []
  const nutrition = (nu.data as NutritionLog[]) ?? []
  const tests = (pt.data as PhysicalTest[]) ?? []

  let planItems: MealPlanItem[] = []
  if (mp.data?.id) {
    const { data } = await supabase.from('meal_plan_items').select('*').eq('plan_id', mp.data.id)
    planItems = (data as MealPlanItem[]) ?? []
  }

  const gk = isGoalkeeper(player)
  const L: string[] = []

  // ── Identidad ──
  L.push(`JUGADOR: ${player.name}`)
  L.push(`Demarcación: ${posLabel(player.pos, player.pos_group)}`
    + `${player.age ? ` · ${player.age} años` : ''}`
    + `${player.foot ? ` · pie ${player.foot}` : ''}`
    + `${player.club ? ` · ${player.club}` : ''}`
    + `${player.category ? ` · ${player.category}` : ''}`)
  if (player.height_cm || player.weight_kg) {
    L.push(`Físico: ${[player.height_cm && `${player.height_cm} cm`, player.weight_kg && `${player.weight_kg} kg`].filter(Boolean).join(' · ')}`)
  }
  if (player.status && player.status !== 'active') {
    L.push(`ESTADO ACTUAL: ${player.status === 'injured' ? 'LESIONADO' : 'en descanso'}`)
  }
  if (player.strength) L.push(`Fortalezas según el coach: ${player.strength}`)
  if (player.improve) L.push(`A mejorar según el coach: ${player.improve}`)

  // ── Atributos ──
  const attrs = getAttributes(player)
  if (attrs.rated) {
    L.push(`\nATRIBUTOS (0-99, ${SOURCE_LABEL[attrs.source].toLowerCase()}):`)
    L.push(Object.entries(attrs.values).map(([k, v]) => `${k} ${v}`).join(' · '))
  } else {
    L.push(`\nATRIBUTOS: sin valorar todavía. No los des por supuestos.`)
  }

  // ── Competición ──
  if (matches.length) {
    const temporadas = seasonsIn(matches)
    if (temporadas.length > 1) {
      L.push(`\nHISTÓRICO POR TEMPORADAS:`)
      for (const t of temporadas) {
        const ms = matches.filter(m => matchSeason(m) === t)
        const mn = ms.reduce((a, m) => a + (m.mins ?? 0), 0)
        const ti = ms.filter(m => m.role === 'titular').length
        L.push(`- ${seasonTitle(t)}: ${ms.length} partidos · ${ti} titular · ${mn} min`
          + (gk ? ` · ${ms.reduce((a, m) => a + (m.conceded ?? 0), 0)} encajados`
                : ` · ${ms.reduce((a, m) => a + (m.goals ?? 0), 0)} goles`))
      }
      L.push(`Los datos que siguen son de TODAS las temporadas juntas. Al comparar, ten en cuenta que ha ido creciendo.`)
    }
    const played = matches.filter(m => (m.mins ?? 0) > 0)
    const starts = matches.filter(m => m.role === 'titular').length
    const subs = matches.filter(m => m.role === 'suplente').length
    const mins = matches.reduce((a, m) => a + (m.mins ?? 0), 0)
    const goals = matches.reduce((a, m) => a + (m.goals ?? 0), 0)
    const assists = matches.reduce((a, m) => a + (m.assists ?? 0), 0)
    const conceded = matches.reduce((a, m) => a + (m.conceded ?? 0), 0)
    const cs = matches.filter(m => m.clean_sheet === true).length

    L.push(`\nCOMPETICIÓN (${matches.length} partidos registrados):`)
    L.push(`${matches.length} convocatorias · ${starts} titular · ${subs} suplente · ${mins} minutos`)
    if (gk) {
      L.push(`${conceded} goles encajados · ${cs} porterías a cero`
        + (played.length ? ` · ${r1(conceded / Math.max(1, played.length))} encajados por partido` : ''))
    } else {
      L.push(`${goals} goles · ${assists} asistencias`)
    }

    // Casa vs fuera (las notas guardan "Casa"/"Fuera" al importar el calendario)
    const casa = matches.filter(m => /casa/i.test(m.notes ?? ''))
    const fuera = matches.filter(m => /fuera/i.test(m.notes ?? ''))
    if (casa.length && fuera.length) {
      const m1 = casa.reduce((a, m) => a + (m.mins ?? 0), 0)
      const m2 = fuera.reduce((a, m) => a + (m.mins ?? 0), 0)
      L.push(`En casa: ${casa.length} partidos, ${m1} min. Fuera: ${fuera.length} partidos, ${m2} min.`)
    }

    L.push(`Últimos partidos:`)
    for (const m of matches.slice(0, 6)) {
      L.push(`- ${m.date ?? 's/f'} vs ${m.rival ?? '?'} (${m.result ?? '?'})`
        + `${m.role ? ` · ${m.role}` : ''}${m.mins != null ? ` · ${m.mins}'` : ''}`
        + `${gk && m.conceded != null ? ` · ${m.conceded} enc.` : ''}`
        + `${!gk && m.goals ? ` · ${m.goals}g` : ''}`
        + `${m.notes && !/^(casa|fuera)$/i.test(m.notes) ? ` · ${m.notes}` : ''}`)
    }
  } else {
    L.push(`\nCOMPETICIÓN: sin partidos registrados.`)
  }

  // ── Entrenamiento ──
  if (sessions.length) {
    const doneS = sessions.filter(s => s.completed)
    const adh = Math.round(doneS.length / sessions.length * 100)
    const rpe = r1(avg(sessions.map(s => s.rpe).filter((x): x is number => x != null)))
    const tipos = Object.entries(sessions.reduce<Record<string, number>>((acc, s) => {
      const t = s.type ?? 'Sin tipo'; acc[t] = (acc[t] ?? 0) + 1; return acc
    }, {})).map(([t, n]) => `${t} ${n}`).join(' · ')

    L.push(`\nENTRENAMIENTO:`)
    L.push(`${doneS.length} de ${sessions.length} sesiones completadas (adherencia ${adh}%)`
      + `${rpe != null ? ` · RPE medio ${rpe}/10` : ''}`)
    L.push(`Reparto: ${tipos}`)
    // Ejercicio a ejercicio: revela qué se salta dentro de las sesiones
    const { data: exData } = await supabase.from('session_exercises')
      .select('title, done, session_id').eq('player_id', player.id)
    const exs = (exData as { title: string; done: boolean }[] | null) ?? []
    if (exs.length) {
      const hechos = exs.filter(e => e.done).length
      L.push(`Ejercicios: ${hechos} de ${exs.length} marcados como hechos.`)
      const saltados = exs.filter(e => !e.done).map(e => e.title)
      const repetidos = Object.entries(saltados.reduce<Record<string, number>>((acc, t) => {
        acc[t] = (acc[t] ?? 0) + 1; return acc
      }, {})).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 4)
      if (repetidos.length) {
        L.push(`Ejercicios que se salta una y otra vez: ${repetidos.map(([t, n]) => `${t} (${n} veces)`).join('; ')}`)
      }
    }

    const fb = sessions.filter(s => s.player_feedback).slice(0, 3)
    if (fb.length) {
      L.push(`Lo que dijo él tras entrenar:`)
      fb.forEach(s => L.push(`- "${(s.player_feedback ?? '').slice(0, 140)}"`))
    }
  } else {
    L.push(`\nENTRENAMIENTO: sin sesiones asignadas.`)
  }

  if (tasks.length) {
    L.push(`Tareas: ${tasks.filter(t => t.done).length} hechas de ${tasks.length}.`
      + (tasks.filter(t => !t.done).length
        ? ` Pendientes: ${tasks.filter(t => !t.done).slice(0, 4).map(t => t.title).join('; ')}`
        : ''))
  }

  // ── Bienestar ──
  if (checkins.length) {
    const sleep = r1(avg(checkins.map(c => c.sleep_hours).filter((x): x is number => x != null)))
    const pain = r1(avg(checkins.map(c => c.pain).filter((x): x is number => x != null)))
    const zonas = Array.from(new Set(checkins.filter(c => (c.pain ?? 0) >= 3 && c.pain_zone).map(c => c.pain_zone)))
    const moods = checkins.slice(0, 7).map(c => c.mood).filter(Boolean)

    L.push(`\nBIENESTAR (últimos ${checkins.length} registros):`)
    L.push(`${sleep != null ? `Sueño medio ${sleep} h. ` : ''}${pain != null ? `Dolor medio ${pain}/10. ` : ''}`
      + `${zonas.length ? `Zonas con molestias: ${zonas.join(', ')}. ` : 'Sin molestias reseñables. '}`)
    if (moods.length) L.push(`Ánimo reciente: ${moods.join(', ')}`)
    const dolorAlto = checkins.filter(c => (c.pain ?? 0) >= 6)
    if (dolorAlto.length) L.push(`ATENCIÓN: ${dolorAlto.length} días con dolor 6 o más (${dolorAlto.map(c => c.date).slice(0, 4).join(', ')}).`)
  } else {
    L.push(`\nBIENESTAR: no registra su día a día.`)
  }

  // ── Alimentación ──
  if (planItems.length || nutrition.length) {
    L.push(`\nALIMENTACIÓN:`)
    if (planItems.length) {
      const week = rangeAdherence(planItems, nutrition, 7)
      L.push(`Plan activo de ${planItems.length} comidas semanales. `
        + `Últimos 7 días: ${week.done}/${week.total} registradas (${week.pct}% adherencia)`
        + `${week.done ? `, de las cuales ${week.fidelity}% siguieron el plan` : ''}.`)
    } else {
      L.push(`Sin plan de alimentación asignado.`)
    }
    if (nutrition.length) {
      const good = nutrition.filter(n => n.quality === 'good').length
      const bad = nutrition.filter(n => n.quality === 'bad').length
      L.push(`${nutrition.length} comidas registradas: ${Math.round(good / nutrition.length * 100)}% saludables, ${bad} mejorables.`)
    }
  }

  // ── Tests físicos ──
  if (tests.length) {
    const ini = tests.find(t => t.phase === 'inicial')
    const fin = [...tests].reverse().find(t => t.phase === 'final')
    L.push(`\nTESTS FÍSICOS:`)
    const campos: [keyof PhysicalTest, string, string, boolean][] = [
      ['vertical_jump', 'Salto vertical', 'cm', true],
      ['horizontal_jump', 'Salto horizontal', 'cm', true],
      ['sprint_10m', 'Sprint 10 m', 's', false],
      ['sprint_30m', 'Sprint 30 m', 's', false],
      ['agility', 'Agilidad', 's', false],
      ['flexibility', 'Flexibilidad', 'cm', true],
      ['strength', 'Fuerza', '', true],
    ]
    for (const [key, label, unit, masEsMejor] of campos) {
      const a = ini?.[key] as number | null | undefined
      const b = fin?.[key] as number | null | undefined
      if (a == null && b == null) continue
      if (a != null && b != null) {
        const delta = b - a
        const mejora = masEsMejor ? delta > 0 : delta < 0
        L.push(`- ${label}: ${a}${unit} → ${b}${unit} (${delta > 0 ? '+' : ''}${r1(delta)}${unit}, ${mejora ? 'mejora' : 'empeora'})`)
      } else {
        L.push(`- ${label}: ${a ?? b}${unit} (solo un test, sin comparación)`)
      }
    }
    if (!fin) L.push(`Solo hay test inicial: aún no se puede medir progresión.`)
  } else {
    L.push(`\nTESTS FÍSICOS: ninguno realizado.`)
  }

  L.push(`\nUsa SOLO estos datos. Si algo no aparece arriba, di que falta ese dato en vez de suponerlo.`)
  return L.join('\n')
}
