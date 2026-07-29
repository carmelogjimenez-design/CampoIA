// ════════════════════════════════════════════════════════════
// CAMPO — Tareas
// ════════════════════════════════════════════════════════════

import { Player, Task } from '../types/database'
import { posLabel } from './positions'

export const TASK_TYPES = ['Vídeo', 'Nutrición', 'Sueño', 'Mental', 'Técnica', 'Físico'] as const
export const TASK_PRIORITIES = ['baja', 'normal', 'alta'] as const

export const TYPE_ICON: Record<string, string> = {
  'Vídeo': '▶', 'Nutrición': '◆', 'Sueño': '☾', 'Mental': '◇', 'Técnica': '◈', 'Físico': '▣',
}

export const PRIORITY_STYLE: Record<string, string> = {
  alta: 'bg-ink text-paper',
  normal: 'chip',
  baja: 'chip',
}

/**
 * Enlace de búsqueda en YouTube a partir del título de la tarea.
 * A propósito NO le pedimos una URL concreta a la IA: inventaría vídeos
 * que no existen. Una búsqueda siempre lleva a algo real, y el coach
 * puede pegar después el enlace exacto que quiera que vea el jugador.
 */
export function videoSearchUrl(title: string, player?: Player | null): string {
  const extra = player ? posLabel(player.pos, player.pos_group) : ''
  const q = [title, 'fútbol', extra].filter(Boolean).join(' ')
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

/** ¿La tarea pide ver un vídeo? */
export function wantsVideo(t: Pick<Task, 'type' | 'title'>): boolean {
  if (t.type === 'Vídeo') return true
  return /\b(v[ií]deo|visualiza|visualizaci[óo]n|mira|ver)\b/i.test(t.title ?? '')
}

/** Normaliza lo que pegue el coach: acepta pegar sin https:// */
export function cleanUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (/^www\./i.test(v) || /\.[a-z]{2,}\//i.test(v)) return `https://${v}`
  return v
}

/** ¿Está vencida? */
export function isOverdue(t: Task): boolean {
  if (!t.due_date || t.done) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(t.due_date + 'T00:00:00') < today
}

export function formatDue(due: string): string {
  const d = new Date(due + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff < 0) return `hace ${Math.abs(diff)} días`
  if (diff <= 7) return `en ${diff} días`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/**
 * ¿Es un enlace a una página de resultados de búsqueda, en vez de a un vídeo?
 * Los enlaces que propone la IA son búsquedas, no vídeos concretos. Al coach
 * le sirven para elegir uno; al jugador NO se le manda a rebuscar en YouTube:
 * solo ve vídeos que has elegido tú.
 */
export function isSearchUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /youtube\.com\/results|google\.[a-z.]+\/search|bing\.com\/search|\/search\?/i.test(url)
}

/** Un vídeo de verdad, elegido por el coach. Es lo único que ve el jugador. */
export function playableVideo(url: string | null | undefined): string | null {
  if (!url || isSearchUrl(url)) return null
  return url
}
