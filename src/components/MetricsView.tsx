import { useState } from 'react'
import { Player, TrainingSession, Match } from '../types/database'
import { isGoalkeeper, initials } from '../lib/players'

interface Props { players: Player[]; training: TrainingSession[]; matches: Match[] }

export default function MetricsView({ players, training, matches }: Props) {
  const [radarPlayer, setRadarPlayer] = useState(players[0]?.id ?? '')
  if (!players.length) return <Empty />

  const stat = (p: Player) => {
    const pm = matches.filter(m => m.player_id === p.id)
    const mins = (p.mins ?? 0) + pm.reduce((s, m) => s + (m.mins ?? 0), 0)
    const train = training.filter(t => t.player_id === p.id && t.completed).length
    const planned = training.filter(t => t.player_id === p.id).length
    return {
      p, mins, train, planned, gk: isGoalkeeper(p),
      score: mins + train * 30,
      goals: pm.reduce((s, m) => s + (m.goals ?? 0), 0),
      assists: pm.reduce((s, m) => s + (m.assists ?? 0), 0),
      called: pm.length, cleansheets: pm.filter(m => m.clean_sheet === true).length,
      adherence: planned ? Math.round(train / planned * 100) : 0,
    }
  }
  const all = players.map(stat)
  const ranked = [...all].sort((a, b) => b.score - a.score)
  const maxScore = Math.max(1, ranked[0]?.score ?? 1)

  // KPIs globales del equipo
  const totGoals = all.reduce((s, x) => s + x.goals, 0)
  const totMins = all.reduce((s, x) => s + x.mins, 0)
  const avgAdh = all.length ? Math.round(all.reduce((s, x) => s + x.adherence, 0) / all.length) : 0
  const totSessions = training.filter(t => t.completed).length

  const radar = all.find(x => x.p.id === radarPlayer)?.p
  const base = radar?.score ?? 70
  const attrs = radar?.ai_attributes ?? { Técnica: base - 4, Táctica: base - 7, Físico: base - 10, Mental: base - 2, Velocidad: base - 8, Lectura: base - 5 }

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Rendimiento</div><h1 className="h-page text-[40px] leading-none">Métricas</h1></header>

      {/* KPIs del equipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi v={players.length} l="Jugadores" />
        <Kpi v={totSessions} l="Sesiones completadas" />
        <Kpi v={totGoals} l="Goles del equipo" />
        <Kpi v={`${avgAdh}%`} l="Adherencia media" accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-6">
        {/* Ranking visual */}
        <div className="card p-8">
          <div className="flex items-baseline justify-between mb-7">
            <h2 className="font-display font-semibold text-[19px] tracking-tighter2">Ranking de carga</h2>
            <span className="text-[12px] text-muted">minutos + entrenamientos</span>
          </div>
          <div className="space-y-6">
            {ranked.map((r, i) => (
              <div key={r.p.id} className="grid grid-cols-[28px_1fr_auto] gap-5 items-center">
                <div className="stat-num text-[15px] text-faint">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[15px] font-medium text-ink flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub overflow-hidden">
                        {r.p.photo_url ? <img src={r.p.photo_url} className="w-full h-full object-cover" /> : initials(r.p.name)}
                      </span>{r.p.name}
                    </span>
                    <span className="text-[11px] text-muted tnum">{r.mins}′ · {r.train} ses.</span>
                  </div>
                  <div className="bar-track"><div className={i === 0 ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${(r.score / maxScore) * 100}%` }} /></div>
                </div>
                <div className="stat-num text-[24px] w-12 text-right">{r.score}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar de atributos */}
        <div className="card p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-[17px] tracking-tighter2">Perfil</h2>
            <select className="bg-canvas rounded-full px-3 py-1.5 text-[12px] font-medium outline-none border border-line" value={radarPlayer} onChange={e => setRadarPlayer(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>)}
            </select>
          </div>
          <Radar attrs={Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, Number(v)]))} />
        </div>
      </div>

      {/* Competición */}
      <div className="card p-8">
        <div className="flex items-baseline justify-between mb-6"><h2 className="font-display font-semibold text-[19px] tracking-tighter2">Competición</h2><span className="text-[12px] text-muted">{totMins} minutos totales</span></div>
        <div className="divide-y divide-line">
          {[...all].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)).map(s => (
            <div key={s.p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-6">
              <span className="text-[15px] font-medium text-ink flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub overflow-hidden">{s.p.photo_url ? <img src={s.p.photo_url} className="w-full h-full object-cover" /> : initials(s.p.name)}</span>
                {s.p.name}
              </span>
              <div className="flex gap-7">
                <Mini v={s.called} l="PJ" /><Mini v={s.mins} l="Min" /><Mini v={s.goals} l="Gol" /><Mini v={s.assists} l="Ast" />
                {s.gk && <Mini v={s.cleansheets} l="P0" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Radar({ attrs }: { attrs: Record<string, number> }) {
  const keys = Object.keys(attrs)
  const n = keys.length
  const cx = 130, cy = 120, R = 88
  const pt = (i: number, r: number) => {
    const a = (-90 + i * 360 / n) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const grid = [0.25, 0.5, 0.75, 1].map(f => keys.map((_, i) => pt(i, R * f).join(',')).join(' '))
  const shape = keys.map((k, i) => pt(i, R * Math.min(attrs[k], 100) / 100).join(',')).join(' ')

  return (
    <svg viewBox="0 0 260 240" className="w-full">
      {grid.map((g, i) => <polygon key={i} points={g} fill="none" stroke="#E8E8ED" strokeWidth="1" />)}
      {keys.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E8E8ED" strokeWidth="1" /> })}
      <polygon points={shape} fill="rgba(201,243,29,0.25)" stroke="#1D1D1F" strokeWidth="2" strokeLinejoin="round" />
      {keys.map((k, i) => {
        const [x, y] = pt(i, R + 16)
        return <text key={k} x={x} y={y} fontSize="9" fill="#6E6E73" textAnchor="middle" dominantBaseline="middle" fontWeight="600">{k}</text>
      })}
      {keys.map((k, i) => { const [x, y] = pt(i, R * Math.min(attrs[k], 100) / 100); return <circle key={k} cx={x} cy={y} r="2.5" fill="#1D1D1F" /> })}
    </svg>
  )
}
function Kpi({ v, l, accent }: { v: number | string; l: string; accent?: boolean }) {
  return <div className="card p-6 relative overflow-hidden">{accent && <div className="absolute -right-5 -bottom-5 w-20 h-20 rounded-full bg-volt/20" />}<div className="stat-num text-[36px] leading-none relative">{v}</div><div className="text-[12px] text-muted mt-1.5 relative">{l}</div></div>
}
function Mini({ v, l }: { v: number; l: string }) {
  return <div className="text-right w-9"><div className="stat-num text-[18px] leading-none">{v}</div><div className="text-[9px] text-muted mt-0.5 uppercase">{l}</div></div>
}
function Empty() {
  return <div><header className="mb-7"><div className="eyebrow mb-2">Rendimiento</div><h1 className="h-page text-[40px]">Métricas</h1></header><div className="card p-16 text-center text-muted text-[15px]">Añade jugadores para ver las métricas.</div></div>
}
