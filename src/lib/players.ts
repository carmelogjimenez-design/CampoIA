import { Player, PosGroup } from '../types/database'

export const POS_COLORS: Record<PosGroup, { bg: string; text: string }> = {
  POR: { bg: 'bg-ink', text: 'text-volt' },
  DEF: { bg: 'bg-canvas', text: 'text-ink' },
  MED: { bg: 'bg-line', text: 'text-ink' },
  DEL: { bg: 'bg-ink', text: 'text-paper' },
}

export function posColor(p: Player) {
  return POS_COLORS[p.pos_group ?? 'MED'] ?? POS_COLORS.MED
}

export function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function isGoalkeeper(p: Player) {
  const pos = `${p.pos ?? ''} ${p.pos_group ?? ''}`.toUpperCase()
  return /\b(POR|GK|PORTERO|ARQUERO|META)\b/.test(pos) || pos.includes('PORTER')
}

export function getPlayerName(players: Player[], id: string) {
  return players.find(p => p.id === id)?.name ?? '—'
}

// ════════════════════════════════════════════════════════════
// Borrar un jugador
// Arrastra 11 tablas y su carpeta de fotos. Se hace a mano y en
// orden en vez de confiar en un ON DELETE CASCADE que quizá no
// esté puesto en todas: si falla algo, falla ANTES de borrar la
// ficha, y el jugador sigue ahí en vez de quedarse a medias.
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase'

export interface PlayerFootprint {
  matches: number
  sessions: number
  tasks: number
  checkins: number
  nutrition: number
  tests: number
  messages: number
  videos: number
  linked: boolean
}

/** Qué se va a perder. Se le enseña al coach antes de preguntarle. */
export async function countPlayerData(playerId: string): Promise<PlayerFootprint> {
  const n = async (table: string) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('player_id', playerId)
    return count ?? 0
  }
  const [matches, sessions, tasks, checkins, nutrition, tests, messages, videos, p] = await Promise.all([
    n('matches'), n('training_sessions'), n('tasks'), n('check_ins'),
    n('nutrition_logs'), n('physical_tests'), n('messages'), n('video_analysis'),
    supabase.from('players').select('auth_user_id').eq('id', playerId).maybeSingle(),
  ])
  return { matches, sessions, tasks, checkins, nutrition, tests, messages, videos, linked: !!p.data?.auth_user_id }
}

/** Orden: primero los hijos, la ficha la última. */
const CHILD_TABLES = [
  'session_exercises', 'training_sessions', 'matches', 'tasks', 'check_ins',
  'nutrition_logs', 'physical_tests', 'meal_plan_items', 'meal_plans',
  'messages', 'video_analysis',
]

export async function deletePlayer(playerId: string): Promise<{ error?: string }> {
  for (const table of CHILD_TABLES) {
    const { error } = await supabase.from(table).delete().eq('player_id', playerId)
    // Si una tabla no existe en este proyecto, seguimos; cualquier otro error corta.
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      return { error: `No se pudo limpiar ${table}: ${error.message}` }
    }
  }

  // Fotos del jugador (carpeta con su id dentro del bucket avatars)
  try {
    const { data: files } = await supabase.storage.from('avatars').list(playerId)
    if (files?.length) {
      await supabase.storage.from('avatars').remove(files.map(f => `${playerId}/${f.name}`))
    }
  } catch { /* si el bucket no existe, da igual */ }

  const { error } = await supabase.from('players').delete().eq('id', playerId)
  return error ? { error: error.message } : {}
}
