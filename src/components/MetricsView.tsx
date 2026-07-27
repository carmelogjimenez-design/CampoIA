import { useState } from 'react'
import { Player, TrainingSession, Match } from '../types/database'
import { isGoalkeeper } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[]; matches: Match[] }

export default function MetricsView({ players, training, matches }: Props) {
  const [metricPlayer, setMetricPlayer] = useState(players[0]?.id ?? '')
  if (!players.length) return <Empty />

  const ranked = players.map(p => {
    const mins = (p.mins ?? 0) + matches.filter(m => m.player_id === p.id).reduce((s, m) => s + (m.mins ?? 0), 0)
    const train = training.filter(t => t.player_id === p.id && t.completed).length
    return { p, total: mins + train * 30, mins, train }
  }).sort((a, b) => b.total - a.total)
  const maxScore = Math.max(1, ranked[0]?.total ?? 1)

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
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-9">
        <div className="eyebrow mb-2">Rendimiento</div>
        <h1 className="h-page text-[40px] leading-none">Métricas</h1>
      </header>

      {/* RANKING — editorial */}
      <section className="card p-8 mb-6">
        <div className="flex items-baseline justify-between mb-7">
          <h2 className="font-display font-semibold text-[19px] text-ink tracking-tighter2">Ranking de carga</h2>
          <span className="text-[12px] text-muted">minutos + entrenamientos</span>
        </div>
        <div className="space-y-6">
          {ranked.map((r, i) => (
            <div key={r.p.id} className="grid grid-cols-[28px_1fr_auto] gap-5 items-center">
              <div className="stat-num text-[15px] text-faint">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[15px] font-medium text-ink">{r.p.name}</span>
                  <span className="text-[11px] text-muted tnum">{r.mins}′ · {r.train} sesiones</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.total / maxScore) * 100}%` }} /></div>
              </div>
              <div className="stat-num text-[26px] w-14 text-right">{r.total}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EVOLUCIÓN */}
      <section className="card p-8 mb-6">
        <div className="flex items-center justify-between mb-7">
          <h2 className="font-display font-semibold text-[19px] text-ink tracking-tighter2">Evolución</h2>
          <select className="bg-canvas rounded-full px-4 py-2 text-[13px] font-medium text-ink outline-none border border-line"
                  value={metricPlayer} onChange={e => setMetricPlayer(e.target.value)}>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Evolution playerId={metricPlayer} training={training} />
      </section>

      {/* PARTIDOS */}
      <section className="card p-8">
        <div className="flex items-baseline justify-between mb-7">
          <h2 className="font-display font-semibold text-[19px] text-ink tracking-tighter2">Competición</h2>
          <span className="text-[12px] text-muted">por goles + asistencias</span>
        </div>
        <div className="divide-y divide-line">
          {matchStats.map(s => (
            <div key={s.p.id} className="py-5 first:pt-0 last:pb-0 flex items-center justify-between gap-6">
              <span className="text-[15px] font-medium text-ink">{s.p.name}</span>
              <div className="flex gap-8">
                <MiniStat v={s.called} l="Conv" /><MiniStat v={s.mins} l="Min" />
                <MiniStat v={s.goals} l="Goles" /><MiniStat v={s.assists} l="Asist" />
                {s.gk && <MiniStat v={s.cleansheets} l="P.0" />}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MiniStat({ v, l }: { v: number; l: string }) {
  return (
    <div className="text-right w-11">
      <div className="stat-num text-[20px] leading-none">{v}</div>
      <div className="text-[10px] text-muted mt-1 uppercase tracking-wide">{l}</div>
    </div>
  )
}

function Evolution({ playerId, training }: { playerId: string; training: TrainingSession[] }) {
  const sessions = training.filter(t => t.player_id === playerId)
  if (!sessions.length) return <p className="text-muted text-[14px]">Sin sesiones registradas todavía.</p>
  const now = Date.now()
  let cum = 0
  const weeks = Array.from({ length: 10 }, (_, idx) => {
    const w = 9 - idx, end = now - w * 7 * 86400000, start = end - 7 * 86400000
    const done = sessions.filter(s => s.completed && (() => {
      const d = new Date(s.completed_at || s.date || '').getTime(); return d > start && d <= end
    })()).length
    cum += done; return cum
  })
  const max = Math.max(1, weeks[weeks.length - 1])
  const totalDone = sessions.filter(s => s.completed).length

  return (
    <div>
      <div className="flex items-end gap-2 h-32 mb-6">
        {weeks.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full rounded-t-[3px] bg-ink" style={{ height: `${Math.max((c / max) * 100, 2)}%`, opacity: 0.25 + 0.75 * (i / 9) }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-10 border-t border-line pt-6">
        <BigStat v={totalDone} l="Completados" />
        <BigStat v={sessions.length} l="Planificados" />
        <BigStat v={`${sessions.length ? Math.round(totalDone / sessions.length * 100) : 0}%`} l="Adherencia" />
      </div>
    </div>
  )
}
function BigStat({ v, l }: { v: number | string; l: string }) {
  return <div><div className="stat-num text-[32px] leading-none">{v}</div><div className="text-[12px] text-muted mt-1.5">{l}</div></div>
}

function Empty() {
  return (
    <div>
      <header className="mb-9"><div className="eyebrow mb-2">Rendimiento</div><h1 className="h-page text-[40px]">Métricas</h1></header>
      <div className="card p-16 text-center"><p className="text-muted text-[15px]">Añade jugadores y registra sesiones para ver las métricas.</p></div>
    </div>
  )
}
