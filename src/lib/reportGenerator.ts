import { jsPDF } from 'jspdf'
import { Player, Match, TrainingSession, CheckIn, NutritionLog } from '../types/database'
import { isGoalkeeper } from './players'
import { drawDonut, drawLineChart, drawBars, INK, VOLT, SUB } from './pdfCharts'

export type ReportType = 'familia' | 'club' | 'agente'
export type Frequency = 'semanal' | 'mensual' | 'trimestral' | 'anual'

const FREQ_DAYS: Record<Frequency, number> = { semanal: 7, mensual: 30, trimestral: 90, anual: 365 }
const FREQ_LABEL: Record<Frequency, string> = { semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' }
const TYPE_LABEL: Record<ReportType, string> = { familia: 'Informe Familiar', club: 'Informe para el Club', agente: 'Dossier de Representación' }
const TYPE_SUB: Record<ReportType, string> = {
  familia: 'Progreso y bienestar', club: 'Análisis técnico-táctico', agente: 'Proyección y valor',
}

interface Data { player: Player; matches: Match[]; sessions: TrainingSession[]; checkins: CheckIn[]; nutrition: NutritionLog[] }

export function generateReport(type: ReportType, freq: Frequency, d: Data) {
  const { player, matches, sessions, checkins, nutrition } = d
  const since = Date.now() - FREQ_DAYS[freq] * 86400000
  const inRange = (dt?: string | null) => dt ? new Date(dt).getTime() >= since : false

  const m = matches.filter(x => inRange(x.date))
  const s = sessions.filter(x => inRange(x.date))
  const ci = checkins.filter(x => inRange(x.date))
  const nu = nutrition.filter(x => inRange(x.date))
  const gk = isGoalkeeper(player)

  const totMins = m.reduce((a, x) => a + (x.mins ?? 0), 0)
  const totGoals = m.reduce((a, x) => a + (x.goals ?? 0), 0)
  const totAssists = m.reduce((a, x) => a + (x.assists ?? 0), 0)
  const cleanSheets = m.filter(x => x.clean_sheet === true).length
  const done = s.filter(x => x.completed).length
  const adherence = s.length ? Math.round(done / s.length * 100) : 0
  const goodMeals = nu.filter(x => x.quality === 'good').length
  const nutriScore = nu.length ? Math.round(goodMeals / nu.length * 100) : 0
  const avgSleep = ci.filter(c => c.sleep_hours).length
    ? (ci.reduce((a, c) => a + (c.sleep_hours ?? 0), 0) / ci.filter(c => c.sleep_hours).length) : 0

  // Serie temporal de evolución (sesiones completadas por sub-periodo)
  const buckets = 8
  const bucketMs = (FREQ_DAYS[freq] * 86400000) / buckets
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = since + i * bucketMs, end = start + bucketMs
    return s.filter(x => x.completed && (() => {
      const t = new Date(x.completed_at || x.date || '').getTime(); return t >= start && t < end
    })()).length
  })
  const serieLabels = series.map((_, i) => `${i + 1}`)

  const base = player.score ?? 70
  const attrs: [string, number][] = Object.entries(player.ai_attributes ?? {
    'Técnica': base - 4, 'Táctica': base - 7, 'Físico': base - 10, 'Mental': base - 2, 'Velocidad': base - 8,
  }) as [string, number][]

  const doc = new jsPDF()
  const W = doc.internal.pageSize.width
  const accent = type === 'agente' ? VOLT : INK

  // ─── PORTADA / CABECERA ───
  doc.setFillColor(...INK); doc.rect(0, 0, W, 54, 'F')
  if (type === 'agente') { doc.setFillColor(...VOLT); doc.rect(0, 52, W, 2, 'F') }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('CAMPO', 16, 18)
  doc.setFontSize(9); doc.setTextColor(180, 180, 180)
  doc.text(`${TYPE_LABEL[type]}  ·  ${FREQ_LABEL[freq]}`, W - 16, 18, { align: 'right' })
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24)
  doc.text(player.name, 16, 36)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(190, 190, 190)
  doc.text(`${player.pos_group ?? '—'}${player.pos ? ` · ${player.pos}` : ''}${player.age ? ` · ${player.age} años` : ''}${player.club ? ` · ${player.club}` : ''}`, 16, 45)

  let y = 68
  // ─── INTRO SEGÚN TIPO (tono) ───
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(TYPE_SUB[type], 16, y); y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...SUB)
  const intro = introText(type, player, { adherence, totGoals, totAssists, done, nutriScore, avgSleep })
  doc.splitTextToSize(intro, W - 32).forEach((line: string) => { doc.text(line, 16, y); y += 5 })
  y += 6

  // ─── KPIs ───
  const kpis = kpiSet(type, { totMins, totGoals, totAssists, cleanSheets, done, adherence, gk, matches: m.length })
  const kw = (W - 32) / kpis.length
  kpis.forEach((k, i) => {
    const kx = 16 + i * kw
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...INK)
    doc.text(String(k[1]), kx, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...SUB)
    doc.text(k[0], kx, y + 12)
  })
  y += 24

  // ─── GRÁFICAS ───
  doc.setDrawColor(230, 230, 230); doc.line(16, y, W - 16, y); y += 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text('Evolución del trabajo', 16, y)
  doc.text('Adherencia', W - 55, y)
  y += 4
  drawLineChart(doc, 16, y, W - 90, 34, series, serieLabels, accent)
  drawDonut(doc, W - 32, y + 17, 15, adherence, accent, 'plan')
  y += 46

  // ─── ATRIBUTOS ───
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text('Atributos', 16, y); y += 6
  drawBars(doc, 16, y, W - 32, attrs, accent)
  y += attrs.length * 8 + 8

  // ─── BLOQUE ESPECÍFICO POR TIPO ───
  doc.setDrawColor(230, 230, 230); doc.line(16, y, W - 16, y); y += 8
  y = typeBlock(doc, type, y, W, { player, m, totMins, totGoals, totAssists, adherence, nutriScore, avgSleep, gk, cleanSheets })

  // ─── FOOTER ───
  doc.setFontSize(7.5); doc.setTextColor(160, 160, 160)
  doc.text(`Generado por CAMPO · ${new Date().toLocaleDateString('es-ES')} · ${TYPE_LABEL[type]} ${FREQ_LABEL[freq]}`, 16, 288)

  doc.save(`CAMPO-${TYPE_LABEL[type].replace(/\s+/g, '')}-${player.name.replace(/\s+/g, '-')}-${FREQ_LABEL[freq]}.pdf`)
}

function introText(type: ReportType, p: Player, v: any): string {
  const name = p.name.split(' ')[0]
  if (type === 'familia') return `Este informe resume el progreso de ${name} en las últimas semanas. Ha completado ${v.done} sesiones con una constancia del ${v.adherence}%, y su bienestar general se mantiene positivo${v.avgSleep ? ` (media de ${v.avgSleep.toFixed(1)}h de sueño)` : ''}. El trabajo diario está dando frutos: cada semana suma, y eso es lo que construye a un futbolista. Enhorabuena por el compromiso.`
  if (type === 'club') return `Análisis del rendimiento de ${name} en el periodo. Registra ${v.totGoals} goles y ${v.totAssists} asistencias, con una adherencia al plan de trabajo del ${v.adherence}%. A continuación se detallan las métricas técnicas, físicas y de competición relevantes para la valoración deportiva.`
  return `Perfil de proyección de ${name}. Jugador con ${v.adherence}% de adherencia al programa de desarrollo y una trayectoria de rendimiento consistente. Este dossier presenta los indicadores de potencial, la evolución del trabajo y los atributos diferenciales de cara a su valoración de mercado.`
}

function kpiSet(type: ReportType, v: any): [string, number | string][] {
  if (type === 'familia') return [['Sesiones hechas', v.done], ['Constancia', `${v.adherence}%`], ['Goles', v.totGoals], ['Asistencias', v.totAssists]]
  if (type === 'club') return v.gk
    ? [['Minutos', v.totMins], ['Convocatorias', v.matches], ['Porterías 0', v.cleanSheets], ['Adherencia', `${v.adherence}%`]]
    : [['Minutos', v.totMins], ['Goles', v.totGoals], ['Asistencias', v.totAssists], ['Adherencia', `${v.adherence}%`]]
  return [['Partidos', v.matches], ['G+A', v.totGoals + v.totAssists], ['Minutos', v.totMins], ['Compromiso', `${v.adherence}%`]]
}

function typeBlock(doc: jsPDF, type: ReportType, y: number, W: number, v: any): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  const title = type === 'familia' ? 'Bienestar y hábitos' : type === 'club' ? 'Valoración deportiva' : 'Proyección de mercado'
  doc.text(title, 16, y); y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...SUB)
  let lines: string[] = []
  if (type === 'familia') lines = [
    `Alimentación saludable: ${v.nutriScore}% de las comidas registradas.`,
    v.avgSleep ? `Descanso medio: ${v.avgSleep.toFixed(1)} horas por noche.` : 'Anima a registrar el descanso para un mejor seguimiento.',
    'El acompañamiento en casa es clave: seguid apoyando su rutina y su descanso.',
  ]
  else if (type === 'club') lines = [
    `Disponibilidad: ${v.m.length} convocatorias en el periodo, ${v.totMins} minutos disputados.`,
    v.gk ? `Seguridad defensiva: ${v.cleanSheets} porterías a cero.` : `Aportación ofensiva: ${v.totGoals} goles y ${v.totAssists} asistencias.`,
    `Compromiso con el trabajo invisible: ${v.adherence}% de adherencia al plan individual.`,
  ]
  else lines = [
    `Producción ofensiva: ${v.totGoals + v.totAssists} contribuciones directas a gol en el periodo.`,
    `Profesionalidad medible: ${v.adherence}% de cumplimiento del programa de desarrollo.`,
    'Perfil con recorrido de mejora y actitud alineada con un proyecto de crecimiento a medio plazo.',
  ]
  lines.forEach(l => { doc.splitTextToSize('•  ' + l, W - 32).forEach((ln: string) => { doc.text(ln, 16, y); y += 5 }) })
  return y
}
