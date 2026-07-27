import { useState } from 'react'
import { Player, TrainingSession } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[] }
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOWS = ['L','M','X','J','V','S','D']

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
      <header className="mb-9"><div className="eyebrow mb-2">Planificación</div><h1 className="h-page text-[40px] leading-none">Calendario</h1></header>
      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="font-display font-semibold text-[22px] text-ink tracking-tighter2">
            {MESES[month]} <span className="text-muted font-normal tnum">{year}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCal(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-full hover:bg-canvas flex items-center justify-center text-sub transition">‹</button>
            <button onClick={() => setCal(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-full hover:bg-canvas flex items-center justify-center text-sub transition">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DOWS.map((d, i) => <div key={i} className="text-center eyebrow pb-2">{d}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const sesiones = byDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            return (
              <div key={i} className={`aspect-square rounded-xl p-2 flex flex-col transition ${
                isToday ? 'bg-ink' : sesiones.length ? 'bg-canvas' : ''}`}>
                <div className={`text-[13px] tnum font-medium ${isToday ? 'text-paper' : 'text-sub'}`}>{day}</div>
                <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                  {sesiones.slice(0, 2).map(s => (
                    <div key={s.id} className={`text-[9px] leading-tight truncate px-1.5 py-0.5 rounded-md ${
                      isToday ? 'bg-paper/20 text-paper' : s.completed ? 'bg-ink text-paper' : 'bg-paper border border-line text-sub'}`}>
                      {getPlayerName(players, s.player_id).split(' ')[0]}
                    </div>
                  ))}
                  {sesiones.length > 2 && <div className={`text-[9px] ${isToday ? 'text-paper/70' : 'text-muted'}`}>+{sesiones.length - 2}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
