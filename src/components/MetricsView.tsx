import { useState } from 'react'
import { Player, TrainingSession, Match } from '../types/database'
import { isGoalkeeper, initials } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[]; matches: Match[] }

export default function MetricsView({ players, training, matches }: Props) {
  const [metricPlayer, setMetricPlayer] = useState(players[0]?.id ?? '')

  if (!players.length) return <p className="text-slate-400">Añade jugadores para ver métricas.</p>

  // 1. Ranking score = minutos + entrenamientos completados ×30
  const ranked = players.map(p => {
    const mins = (p.mins ?? 0) + matches.filter(m => m.player_id === p.id).reduce((s, m) => s + (m.mins ?? 0), 0)
    const train = training.filter(t => t.player_id === p.id && t.completed).length
    return { p, total: mins + train * 30, mins, train }
  }).sort((a, b) => b.total - a.total)
  const maxScore = Math.max(1, ranked[0]?.total ?? 1)

  // 3. Métrica de partidos
  const matchStats = players.map(p => {
    const pm = matches.filter(m => m.player_id === p.id)
    return {
      p, gk: isGoalkeeper(p),
      mins: pm.reduce((s, m) => s + (m.mins ?? 0), 0),
      goals: pm.reduce((s, m) => s + (m.goals ?? 0), 0),
      assists: pm.reduce((s, m) => s + (m.assists ?? 0), 0),
      called: pm.filter(m => m.called === 'yes' || ['titular', 'suplente', 'no-play'].includes(m.role ?? '')).length,
      cleansheets: pm.filter(m => m.clean_sheet === true).length,
    }
  }).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Métricas</h1>
      <p className="text-slate-500 mb-6">Evolución y análisis de rendimiento</p>

      {/* 1. Ranking score */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-ink mb-3">🏆 Ranking de score <span className="text-xs font-normal text-slate-400">· minutos + entrenamientos</span></h2>
        {ranked.map((r, i) => (
          <div key={r.p.id} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2"><span className="text-slate-400 w-4">{i + 1}</span>{r.p.name}</span>
              <span className="font-bold">{r.total}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-campo-violet rounded-full" style={{ width: `${(r.total / maxScore) * 100}%` }} />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{r.mins} min · {r.train} entrenos completados</div>
          </div>
        ))}
      </div>

      {/* 2. Evolución por jugador */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-ink">📈 Evolución de entrenamiento</h2>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  value={metricPlayer} onChange={e => setMetricPlayer(e.target.value)}>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Evolution playerId={metricPlayer} training={training} />
      </div>

      {/* 3. Métrica de partidos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-ink mb-3">⚽ Métrica de partidos <span className="text-xs font-normal text-slate-400">· por goles + asistencias</span></h2>
        {matchStats.map(s => (
          <div key={s.p.id} className="py-3 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{initials(s.p.name)}</div>
              <span className="font-medium text-sm">{s.p.name}</span>
            </div>
            <div className={`grid gap-2 text-center ${s.gk ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <Cell v={s.called} l="CONV" /><Cell v={s.mins} l="MIN" color="text-campo-blue" />
              <Cell v={s.goals} l="GOLES" color="text-emerald-600" /><Cell v={s.assists} l="ASIST" color="text-campo-blue" />
              {s.gk && <Cell v={s.cleansheets} l="P.0" color="text-emerald-600" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Cell({ v, l, color = 'text-ink' }: { v: number; l: string; color?: string }) {
  return <div><div className={`font-display font-bold text-lg ${color}`}>{v}</div><div className="text-[8px] text-slate-400">{l}</div></div>
}

function Evolution({ playerId, training }: { playerId: string; training: TrainingSession[] }) {
  const sessions = training.filter(t => t.player_id === playerId)
  if (!sessions.length) return <p className="text-slate-400 text-sm">Sin sesiones para este jugador.</p>
  const now = Date.now()
  let cum = 0
  const weeks = Array.from({ length: 10 }, (_, idx) => {
    const w = 9 - idx
    const end = now - w * 7 * 86400000
    const start = end - 7 * 86400000
    const done = sessions.filter(s => s.completed && (() => {
      const d = new Date(s.completed_at || s.date || '').getTime()
      return d > start && d <= end
    })()).length
    cum += done
    return { cum, done }
  })
  const max = Math.max(1, weeks[weeks.length - 1].cum)
  const totalDone = sessions.filter(s => s.completed).length

  return (
    <div>
      <div className="flex items-end gap-1 h-24 mb-2">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full rounded-t bg-gradient-to-b from-campo-violet to-campo-magenta"
                 style={{ height: `${Math.max((w.cum / max) * 100, 3)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Stat v={totalDone} l="completados" color="text-emerald-600" />
        <Stat v={sessions.length} l="planificados" />
        <Stat v={`${sessions.length ? Math.round(totalDone / sessions.length * 100) : 0}%`} l="adherencia" color="text-campo-blue" />
      </div>
    </div>
  )
}
function Stat({ v, l, color = 'text-ink' }: { v: number | string; l: string; color?: string }) {
  return <div className="flex-1 bg-slate-50 rounded-xl py-2 text-center"><div className={`font-display font-bold text-lg ${color}`}>{v}</div><div className="text-[10px] text-slate-400">{l}</div></div>
}
