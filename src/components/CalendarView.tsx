import { useState } from 'react'
import { Player, TrainingSession } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[] }
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOWS = ['L','M','X','J','V','S','D']
// Tipología → estilo (monocromo + volt para destacar)
const TYPE_STYLE: Record<string, string> = {
  'Físico': 'bg-ink text-paper',
  'Técnico': 'bg-volt text-ink',
  'Táctico': 'bg-sub text-paper',
  'Recuperación': 'bg-paper border border-line-strong text-sub',
}
const TYPES = Object.keys(TYPE_STYLE)

export default function CalendarView({ players, training }: Props) {
  const [cal, setCal] = useState(new Date())
  const year = cal.getFullYear(), month = cal.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const byDate: Record<string, TrainingSession[]> = {}
  training.forEach(s => { if (s.date) (byDate[s.date.slice(0, 10)] ??= []).push(s) })
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Planificación</div><h1 className="h-page text-[26px] sm:text-[40px] leading-none">Calendario</h1></header>
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="font-display font-semibold text-[22px] text-ink tracking-tighter2">{MESES[month]} <span className="text-muted font-normal tnum">{year}</span></div>
          <div className="flex gap-1">
            <button onClick={() => setCal(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-full hover:bg-canvas flex items-center justify-center text-sub transition">‹</button>
            <button onClick={() => setCal(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-full hover:bg-canvas flex items-center justify-center text-sub transition">›</button>
          </div>
        </div>

        {/* Leyenda de tipologías */}
        <div className="flex flex-wrap gap-4 mb-6 pb-5 border-b border-line">
          {TYPES.map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-[4px] ${TYPE_STYLE[t].split(' ').filter(c => c.startsWith('bg-') || c.startsWith('border')).join(' ')}`} />
              <span className="text-[12px] text-sub">{t}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DOWS.map((d, i) => <div key={i} className="text-center eyebrow pb-2">{d}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const sesiones = byDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            return (
              <div key={i} className={`min-h-[64px] sm:min-h-[92px] rounded-lg sm:rounded-xl p-1 sm:p-2 flex flex-col transition ${isToday ? 'ring-2 ring-ink' : sesiones.length ? 'bg-canvas' : 'bg-canvas/40'}`}>
                <div className={`text-[13px] tnum font-medium mb-1 ${isToday ? 'text-ink' : 'text-sub'}`}>{day}</div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {sesiones.slice(0, 3).map(s => (
                    <div key={s.id} className={`text-[9px] leading-tight truncate px-1.5 py-0.5 rounded-md font-medium ${TYPE_STYLE[s.type ?? 'Físico'] ?? 'bg-ink text-paper'}`}>
                      {getPlayerName(players, s.player_id).split(' ')[0]}
                    </div>
                  ))}
                  {sesiones.length > 3 && <div className="text-[9px] text-muted">+{sesiones.length - 3}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
