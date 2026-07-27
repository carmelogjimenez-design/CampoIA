import { jsPDF } from 'jspdf'
import { Player, Match, TrainingSession, CheckIn, NutritionLog } from '../types/database'
import { isGoalkeeper } from './players'
import { drawDonut, drawLineChart, drawBars, INK, VOLT, SUB } from './pdfCharts'

export type ReportType = 'familia' | 'club' | 'agente'
export type Frequency = 'semanal' | 'mensual' | 'trimestral' | 'anual'

const FREQ_DAYS: Record<Frequency, number> = { semanal: 7, mensual: 30, trimestral: 90, anual: 365 }
const FREQ_LABEL: Record<Frequency, string> = { semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' }
const FREQ_PERIOD: Record<Frequency, string> = { semanal: 'la última semana', mensual: 'el último mes', trimestral: 'el último trimestre', anual: 'la última temporada' }
const TYPE_LABEL: Record<ReportType, string> = { familia: 'Informe Familiar', club: 'Informe para el Club', agente: 'Dossier de Representación' }
const TYPE_SUB: Record<ReportType, string> = { familia: 'Progreso y bienestar', club: 'Análisis técnico-táctico', agente: 'Proyección y valor de mercado' }

interface Data { player: Player; matches: Match[]; sessions: TrainingSession[]; checkins: CheckIn[]; nutrition: NutritionLog[] }

export function generateReport(type: ReportType, freq: Frequency, d: Data, customAttrs: [string, number][]) {
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
  const avgSleep = ci.filter(c => c.sleep_hours).length ? (ci.reduce((a, c) => a + (c.sleep_hours ?? 0), 0) / ci.filter(c => c.sleep_hours).length) : 0
  const ga = totGoals + totAssists
  const avgMinsPerMatch = m.length ? Math.round(totMins / m.length) : 0

  const V = { player, gk, m: m.length, totMins, totGoals, totAssists, cleanSheets, done, planned: s.length, adherence, nutriScore, avgSleep, ga, avgMinsPerMatch, period: FREQ_PERIOD[freq] }

  const buckets = 8
  const bucketMs = (FREQ_DAYS[freq] * 86400000) / buckets
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = since + i * bucketMs, end = start + bucketMs
    return s.filter(x => x.completed && (() => { const t = new Date(x.completed_at || x.date || '').getTime(); return t >= start && t < end })()).length
  })

  const doc = new jsPDF()
  const W = doc.internal.pageSize.width
  const accent = type === 'agente' ? VOLT : INK

  // ── PORTADA ──
  doc.setFillColor(...INK); doc.rect(0, 0, W, 54, 'F')
  if (type === 'agente') { doc.setFillColor(...VOLT); doc.rect(0, 52, W, 2, 'F') }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('CAMPO', 16, 18)
  doc.setFontSize(9); doc.setTextColor(180, 180, 180); doc.text(`${TYPE_LABEL[type]}  ·  ${FREQ_LABEL[freq]}`, W - 16, 18, { align: 'right' })
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.text(player.name, 16, 36)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(190, 190, 190)
  doc.text(`${player.pos_group ?? '—'}${player.pos ? ` · ${player.pos}` : ''}${player.age ? ` · ${player.age} años` : ''}${player.club ? ` · ${player.club}` : ''}`, 16, 45)

  let y = 68
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(TYPE_SUB[type], 16, y); y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...SUB)
  doc.splitTextToSize(introText(type, V), W - 32).forEach((l: string) => { doc.text(l, 16, y); y += 5 }); y += 6

  // ── KPIs ──
  const kpis = kpiSet(type, V); const kw = (W - 32) / kpis.length
  kpis.forEach((k, i) => {
    const kx = 16 + i * kw
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...INK); doc.text(String(k[1]), kx, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...SUB); doc.text(k[0], kx, y + 12)
  }); y += 24

  // ── GRÁFICAS ──
  doc.setDrawColor(230, 230, 230); doc.line(16, y, W - 16, y); y += 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text('Evolución del trabajo', 16, y); doc.text('Adherencia', W - 55, y); y += 4
  drawLineChart(doc, 16, y, W - 90, 34, series, series.map((_, i) => `${i + 1}`), accent)
  drawDonut(doc, W - 32, y + 17, 15, adherence, accent, 'plan'); y += 46

  // ── ATRIBUTOS (editados) ──
  if (customAttrs.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK); doc.text('Atributos', 16, y); y += 6
    drawBars(doc, 16, y, W - 32, customAttrs, accent); y += customAttrs.length * 8 + 8
  }

  // ── ANÁLISIS ──
  doc.setDrawColor(230, 230, 230); doc.line(16, y, W - 16, y); y += 8
  const blocks = analysisBlocks(type, V)
  blocks.forEach(block => {
    if (y > 250) { doc.addPage(); y = 24 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK); doc.text(block.title, 16, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...SUB)
    block.lines.forEach(l => { doc.splitTextToSize('•  ' + l, W - 34).forEach((ln: string) => { doc.text(ln, 16, y); y += 5 }) })
    y += 5
  })

  doc.setFontSize(7.5); doc.setTextColor(160, 160, 160)
  doc.text(`Generado por CAMPO · ${new Date().toLocaleDateString('es-ES')} · ${TYPE_LABEL[type]} ${FREQ_LABEL[freq]} · Documento confidencial`, 16, 288)
  doc.save(`CAMPO-${TYPE_LABEL[type].replace(/\s+/g, '')}-${player.name.replace(/\s+/g, '-')}-${FREQ_LABEL[freq]}.pdf`)
}

// ── umbrales expresivos ──
function adhWord(a: number) { return a >= 85 ? 'excepcional' : a >= 70 ? 'sólido' : a >= 50 ? 'aceptable con margen' : 'irregular' }
function firstName(p: Player) { return p.name.split(' ')[0] }

function introText(type: ReportType, v: any): string {
  const n = firstName(v.player)
  if (type === 'familia') {
    const adh = v.adherence >= 85 ? `un compromiso admirable` : v.adherence >= 60 ? `una buena constancia` : `una constancia que iremos afianzando`
    return `Este informe recoge el progreso de ${n} durante ${v.period}. Ha demostrado ${adh} en el trabajo diario, completando ${v.done} de ${v.planned} sesiones planificadas (${v.adherence}%).${v.avgSleep ? ` Su descanso medio ha sido de ${v.avgSleep.toFixed(1)} horas por noche` : ''}${v.nutriScore ? `, y su alimentación registrada ha sido saludable en un ${v.nutriScore}% de las comidas` : ''}. El desarrollo de un futbolista se construye día a día, y ${n} está poniendo los cimientos correctos. Gracias por acompañar su camino desde casa.`
  }
  if (type === 'club') {
    const prod = v.gk ? `${v.cleanSheets} porterías a cero` : `${v.totGoals} goles y ${v.totAssists} asistencias`
    return `Perfil de rendimiento de ${n} correspondiente a ${v.period}. Registra ${v.m} convocatorias con ${v.totMins} minutos disputados (media de ${v.avgMinsPerMatch}′ por encuentro) y una producción de ${prod}. Su adherencia al programa individual de desarrollo ha sido ${adhWord(v.adherence)} (${v.adherence}%). A continuación se detalla la valoración técnica, física y competitiva relevante para la coordinación entre el trabajo de club y el trabajo individual.`
  }
  return `Dossier de proyección de ${n}, ${v.player.pos_group ?? 'jugador'}${v.player.age ? ` de ${v.player.age} años` : ''}, correspondiente a ${v.period}. Jugador con ${v.ga} contribuciones directas a gol y un nivel de profesionalidad ${adhWord(v.adherence)} (${v.adherence}% de cumplimiento del programa de desarrollo). El presente documento sintetiza los indicadores de potencial, la trayectoria de trabajo y los atributos diferenciales de cara a su valoración y recorrido en el mercado.`
}

function kpiSet(type: ReportType, v: any): [string, number | string][] {
  if (type === 'familia') return [['Sesiones hechas', v.done], ['Constancia', `${v.adherence}%`], ['Goles', v.totGoals], ['Asistencias', v.totAssists]]
  if (type === 'club') return v.gk
    ? [['Minutos', v.totMins], ['Convocatorias', v.m], ['Porterías 0', v.cleanSheets], ['Adherencia', `${v.adherence}%`]]
    : [['Minutos', v.totMins], ['Goles', v.totGoals], ['Asistencias', v.totAssists], ['Adherencia', `${v.adherence}%`]]
  return [['Partidos', v.m], ['G+A', v.ga], ['Min/partido', v.avgMinsPerMatch], ['Compromiso', `${v.adherence}%`]]
}

function analysisBlocks(type: ReportType, v: any): { title: string; lines: string[] }[] {
  const n = firstName(v.player)
  if (type === 'familia') return [
    { title: 'Cómo ha ido', lines: [
      v.adherence >= 70 ? `${n} ha sido muy constante: ${v.done} sesiones completadas. Esa disciplina es la base de todo.` : `Hemos completado ${v.done} sesiones. El siguiente paso es ganar regularidad, y ahí vuestro apoyo en casa es clave.`,
      v.totGoals + v.totAssists > 0 ? `En competición ha aportado ${v.totGoals} goles y ${v.totAssists} asistencias. Cada minuto le hace crecer.` : `Ha ido sumando minutos y experiencia en competición, que es justo lo que necesita a su edad.`,
    ] },
    { title: 'Bienestar y hábitos', lines: [
      v.avgSleep ? (v.avgSleep >= 8 ? `Descanso excelente (${v.avgSleep.toFixed(1)}h de media). El sueño es cuando el cuerpo crece y se recupera.` : `Descanso de ${v.avgSleep.toFixed(1)}h de media; intentemos acercarnos a las 8-9h, que a su edad marcan la diferencia.`) : `Animadle a registrar su descanso: nos ayuda a cuidarle mejor.`,
      v.nutriScore ? `Alimentación saludable en el ${v.nutriScore}% de las comidas registradas. Buen camino.` : `La alimentación es su gasolina: pequeños hábitos suman mucho.`,
      `Lo más importante: que disfrute. La ilusión es su mayor talento.`,
    ] },
  ]
  if (type === 'club') return [
    { title: 'Disponibilidad y competición', lines: [
      `${v.m} convocatorias, ${v.totMins} minutos (${v.avgMinsPerMatch}′/partido de media).`,
      v.gk ? `Seguridad defensiva: ${v.cleanSheets} porterías a cero en el periodo.` : `Aportación ofensiva: ${v.totGoals} goles y ${v.totAssists} asistencias (${v.ga} contribuciones directas).`,
    ] },
    { title: 'Trabajo individual complementario', lines: [
      `Adherencia ${adhWord(v.adherence)} al plan individual (${v.done}/${v.planned} sesiones, ${v.adherence}%).`,
      `El trabajo individual está coordinado para complementar —no solapar— las cargas del club.`,
      v.adherence >= 70 ? `Perfil fiable en el compromiso invisible; recomendable mantener la progresión actual.` : `Margen de mejora en la constancia del trabajo complementario; se sugiere reforzar seguimiento.`,
    ] },
  ]
  return [
    { title: 'Indicadores de proyección', lines: [
      `Producción: ${v.ga} contribuciones directas a gol en ${v.m} partidos (${v.totMins} minutos).`,
      `Profesionalidad medible: ${v.adherence}% de cumplimiento del programa, indicador de mentalidad y hábitos por encima de la media para su categoría.`,
      v.avgSleep && v.avgSleep >= 8 ? `Cultura de recuperación consolidada (${v.avgSleep.toFixed(1)}h de sueño), factor diferencial en la sostenibilidad del rendimiento.` : `Hábitos de recuperación en desarrollo, con recorrido de optimización.`,
    ] },
    { title: 'Valoración y recorrido', lines: [
      `${n} presenta un perfil con recorrido de revalorización a medio plazo, sustentado en actitud, disciplina y evolución sostenida del trabajo.`,
      `Se recomienda seguimiento continuado del programa de desarrollo como palanca de proyección y valor.`,
    ] },
  ]
}
