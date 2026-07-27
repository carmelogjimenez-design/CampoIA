import { useState } from 'react'
import { Player, TrainingSession } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[] }
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOWS = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']

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
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Calendario</h1>
      <p className="text-slate-500 mb-6">Planificación mensual de entrenamientos</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCal(new Date(year, month - 1, 1))} className="px-3 py-1.5 border border-slate-200 rounded-lg">‹</button>
          <div className="font-display font-bold text-ink">{MESES[month]} {year}</div>
          <button onClick={() => setCal(new Date(year, month + 1, 1))} className="px-3 py-1.5 border border-slate-200 rounded-lg">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DOWS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const sesiones = byDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            return (
              <div key={i} className={`min-h-[70px] border rounded-lg p-1.5 ${isToday ? 'border-campo-blue ring-1 ring-campo-blue' : 'border-slate-200'}`}>
                <div className={`text-xs font-bold ${isToday ? 'text-campo-blue' : 'text-slate-500'}`}>{day}</div>
                {sesiones.slice(0, 3).map(s => (
                  <div key={s.id} className={`text-[9px] px-1 py-0.5 rounded mt-0.5 truncate ${s.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-campo-blue'}`}>
                    {getPlayerName(players, s.player_id).split(' ')[0]} · {s.type}
                  </div>
                ))}
                {sesiones.length > 3 && <div className="text-[8px] text-slate-400">+{sesiones.length - 3}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
