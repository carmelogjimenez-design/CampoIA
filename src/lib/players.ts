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
