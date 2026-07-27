import { Player, PosGroup } from '../types/database'

export const POS_COLORS: Record<PosGroup, { bg: string; text: string }> = {
  POR: { bg: 'bg-amber-100', text: 'text-amber-700' },
  DEF: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  DEL: { bg: 'bg-red-100', text: 'text-red-700' },
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
