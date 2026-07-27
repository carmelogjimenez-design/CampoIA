export interface ExerciseTemplate { t: string; s: string; r: string; w: string; d: string }

export const TASK_TEMPLATES: Record<string, ExerciseTemplate[]> = {
  'Físico': [
    { t: 'Sentadilla', s: '4', r: '8', w: 'moderado', d: 'Fuerza tren inferior' },
    { t: 'Peso muerto rumano', s: '3', r: '10', w: 'moderado', d: 'Cadena posterior' },
    { t: 'Hip thrust', s: '4', r: '10', w: 'moderado', d: 'Glúteo y potencia' },
    { t: 'Sentadilla búlgara', s: '3', r: '8/pierna', w: 'ligero', d: 'Fuerza y equilibrio' },
    { t: 'Plancha frontal', s: '3', r: '40s', w: 'corporal', d: 'Core estabilidad' },
    { t: 'Saltos al cajón', s: '4', r: '6', w: 'corporal', d: 'Potencia' },
    { t: 'Sprints 20m', s: '6', r: '20m', w: '—', d: 'Velocidad' },
    { t: 'Nórdicos de isquios', s: '3', r: '6', w: 'corporal', d: 'Prevención' },
    { t: 'Movilidad de cadera', s: '1', r: '10min', w: '—', d: 'Movilidad' },
  ],
  'Técnico': [
    { t: 'Control orientado', s: '3', r: '15min', w: '—', d: 'Primer toque' },
    { t: 'Pases a pared', s: '4', r: '50', w: '—', d: 'Precisión de pase' },
    { t: 'Conducción en slalom', s: '5', r: '1', w: '—', d: 'Regate' },
    { t: 'Finalización', s: '3', r: '20 tiros', w: '—', d: 'Definición' },
  ],
  'Táctico': [
    { t: 'Posicionamiento defensivo', s: '1', r: '20min', w: '—', d: 'Lectura de juego' },
    { t: 'Desmarques', s: '1', r: '15min', w: '—', d: 'Movimiento sin balón' },
  ],
  'Recuperación': [
    { t: 'Estiramientos', s: '1', r: '15min', w: '—', d: 'Flexibilidad' },
    { t: 'Foam roller', s: '1', r: '10min', w: '—', d: 'Descarga muscular' },
  ],
}
