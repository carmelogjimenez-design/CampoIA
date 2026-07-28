// Traduce códigos de posición del campo a demarcación legible para la IA
export const POS_LABEL: Record<string, string> = {
  'POR': 'Portero',
  'LI': 'Lateral izquierdo', 'LD': 'Lateral derecho',
  'DFC-I': 'Defensa central', 'DFC-D': 'Defensa central', 'DFC': 'Defensa central',
  'CAR-I': 'Carrilero izquierdo', 'CAR-D': 'Carrilero derecho',
  'MCD': 'Medio centro defensivo',
  'MC-I': 'Medio centro', 'MC-D': 'Medio centro', 'MC': 'Medio centro',
  'MP': 'Mediapunta (medio centro ofensivo)',
  'EI': 'Extremo izquierdo', 'ED': 'Extremo derecho',
  'DC': 'Delantero centro',
}

export function posLabel(pos?: string | null, posGroup?: string | null): string {
  if (pos && POS_LABEL[pos]) return POS_LABEL[pos]
  if (pos) return pos
  const groups: Record<string, string> = { POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' }
  return posGroup ? (groups[posGroup] ?? posGroup) : 'Sin definir'
}
