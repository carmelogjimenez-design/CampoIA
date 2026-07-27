import { useState } from 'react'
import { Player } from '../types/database'
import { supabase } from '../lib/supabase'
import { isGoalkeeper, initials } from '../lib/players'
import { jsPDF } from 'jspdf'

interface Props { players: Player[] }

export default function ReportsView({ players }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function generate(p: Player) {
    setBusyId(p.id)
    try {
      const [{ data: matches }, { data: sessions }] = await Promise.all([
        supabase.from('matches').select('*').eq('player_id', p.id),
        supabase.from('training_sessions').select('*').eq('player_id', p.id),
      ])
      const m = matches ?? [], s = sessions ?? []
      const gk = isGoalkeeper(p)
      const totMins = m.reduce((a, x) => a + (x.mins ?? 0), 0)
      const totGoals = m.reduce((a, x) => a + (x.goals ?? 0), 0)
      const totAssists = m.reduce((a, x) => a + (x.assists ?? 0), 0)
      const cleanSheets = m.filter(x => x.clean_sheet === true).length
      const done = s.filter(x => x.completed).length
      const adherence = s.length ? Math.round(done / s.length * 100) : 0

      const doc = new jsPDF()
      const W = doc.internal.pageSize.width
      // Cabecera negra
      doc.setFillColor(29, 29, 31); doc.rect(0, 0, W, 46, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text('CAMPO', 16, 20)
      doc.setFontSize(22); doc.text(p.name, 16, 34)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(180, 180, 180)
      doc.text(`Informe de rendimiento · ${new Date().toLocaleDateString('es-ES')}`, 16, 41)

      let y = 62
      doc.setTextColor(29, 29, 31); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
      doc.text('Datos del jugador', 16, y); y += 8
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80, 80, 80)
      const info = [
        `Demarcación: ${p.pos_group ?? '—'}${p.pos ? ` (${p.pos})` : ''}`,
        `Edad: ${p.age ?? '—'}    Pie: ${p.foot ?? '—'}    Club: ${p.club ?? '—'}`,
        `Altura: ${p.height_cm ?? '—'} cm    Peso: ${p.weight_kg ?? '—'} kg`,
      ]
      info.forEach(t => { doc.text(t, 16, y); y += 6 })

      y += 8
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(29, 29, 31)
      doc.text('Competición', 16, y); y += 8
      const stats: [string, string][] = [
        ['Convocatorias', String(m.length)], ['Minutos jugados', String(totMins)],
        ['Goles', String(totGoals)], ['Asistencias', String(totAssists)],
        ...(gk ? [['Porterías a cero', String(cleanSheets)]] as [string, string][] : []),
      ]
      stats.forEach(([label, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120, 120, 120)
        doc.text(label, 16, y)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(29, 29, 31)
        doc.text(val, 90, y); y += 8
      })

      y += 6
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Entrenamiento', 16, y); y += 8
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80, 80, 80)
      doc.text(`Sesiones planificadas: ${s.length}    Completadas: ${done}    Adherencia: ${adherence}%`, 16, y)

      // Footer
      doc.setFontSize(8); doc.setTextColor(160, 160, 160)
      doc.text('Generado por CAMPO · plataforma de desarrollo de futbolistas', 16, 285)

      doc.save(`Informe-${p.name.replace(/\s+/g, '-')}.pdf`)
    } finally { setBusyId(null) }
  }

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Herramientas</div><h1 className="h-page text-[40px] leading-none">Informes</h1></header>
      <p className="text-sub text-[15px] mb-6">Genera un informe PDF de rendimiento por jugador con sus datos, competición y adherencia.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(p => (
          <div key={p.id} className="card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-canvas flex items-center justify-center text-[12px] font-semibold text-sub">{initials(p.name)}</div>
            <div className="flex-1 min-w-0"><div className="font-medium text-ink text-[15px] truncate">{p.name}</div><div className="text-[12px] text-muted">{p.pos_group ?? '—'}{p.club ? ` · ${p.club}` : ''}</div></div>
            <button onClick={() => generate(p)} disabled={busyId === p.id} className="btn-ink text-[13px] px-4 py-2">{busyId === p.id ? '...' : 'PDF'}</button>
          </div>
        ))}
        {!players.length && <div className="card p-12 text-center text-muted text-[14px] col-span-full">Añade jugadores para generar informes.</div>}
      </div>
    </div>
  )
}
