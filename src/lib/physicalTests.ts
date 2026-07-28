export interface TestMetric { key: string; label: string; unit: string; better: 'up' | 'down' }

// better: 'up' = más alto es mejor · 'down' = menos (tiempo) es mejor
export const TEST_METRICS: TestMetric[] = [
  { key: 'vertical_jump', label: 'Salto vertical', unit: 'cm', better: 'up' },
  { key: 'horizontal_jump', label: 'Salto horizontal', unit: 'cm', better: 'up' },
  { key: 'sprint_10m', label: 'Sprint 10m', unit: 's', better: 'down' },
  { key: 'sprint_30m', label: 'Sprint 30m', unit: 's', better: 'down' },
  { key: 'agility', label: 'Agilidad (T-test)', unit: 's', better: 'down' },
  { key: 'flexibility', label: 'Flexibilidad', unit: 'cm', better: 'up' },
  { key: 'strength', label: 'Fuerza', unit: 'kg', better: 'up' },
]

// Devuelve la mejora en % (positiva = mejor) según la dirección de la métrica
export function improvement(metric: TestMetric, ini: number | null, fin: number | null): number | null {
  if (ini == null || fin == null || ini === 0) return null
  const raw = ((fin - ini) / ini) * 100
  return metric.better === 'up' ? raw : -raw
}
