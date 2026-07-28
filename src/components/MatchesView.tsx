import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Match } from '../types/database'
import { getPlayerName, initials } from '../lib/players'
import AddMatchModal from './AddMatchModal'
import { EmptyState } from './States'

interface Props { players: Player[]; matches: Match[]; coachId: string; onReload: () => void }

export default function MatchesView({ players, matches, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [filter, setFilter] = useState('all')

  async function remove(m: Match) { await supabase.from('matches').delete().eq('id', m.id); onReload() }

  const filtered = filter === 'all' ? matches : matches.filter(m => m.player_id === filter)
  const totGoals = filtered.reduce((s, m) => s + (m.goals ?? 0), 0)
  const totAssists = filtered.reduce((s, m) => s + (m.assists ?? 0), 0)
  const totMins = filtered.reduce((s, m) => s + (m.mins ?? 0), 0)

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex items-end justify-between mb-7">
        <div>
          <div className="eyebrow mb-2">Competición</div>
          <h1 className="h-page text-[40px] leading-none">Partidos</h1>
        </div>
        <button onClick={() => setShow(true)} className="btn-ink">+ Registrar partido</button>
      </header>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{totGoals}</div><div className="text-[12px] text-muted mt-1.5">Goles</div></div>
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{totAssists}</div><div className="text-[12px] text-muted mt-1.5">Asistencias</div></div>
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{totMins}</div><div className="text-[12px] text-muted mt-1.5">Minutos</div></div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
        {players.map(p => <button key={p.id} onClick={() => setFilter(p.id)} className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>)}
      </div>

      {/* Timeline */}
      <div className="space-y-2.5">
        {filtered.map(m => (
          <div key={m.id} className="card p-5 flex items-center gap-5 group">
            <div className="w-11 h-11 rounded-full bg-canvas flex items-center justify-center text-[12px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, m.player_id))}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-medium text-ink">vs {m.rival}</span>
                <span className="text-[12px] text-muted tnum">{m.date}</span>
              </div>
              <div className="text-[12px] text-muted mt-0.5">{getPlayerName(players, m.player_id)} · {m.mins}′</div>
            </div>
            <div className="flex items-center gap-2">
              {(m.goals ?? 0) > 0 && <span className="chip bg-volt text-ink font-semibold">{m.goals} ⚽</span>}
              {(m.assists ?? 0) > 0 && <span className="chip">{m.assists} 🅰</span>}
              {m.clean_sheet && <span className="chip bg-volt text-ink">🧤 0</span>}
            </div>
            <div className="stat-num text-[22px] w-16 text-right">{m.result || '—'}</div>
            <button onClick={() => remove(m)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink transition text-[13px]">✕</button>
          </div>
        ))}
        {!filtered.length && <EmptyState icon="⚽" title="Sin partidos registrados" description="Anota el primer partido para empezar a seguir la competición." actionLabel="+ Nuevo partido" onAction={() => setShow(true)} />}
      </div>

      {show && <AddMatchModal players={players} coachId={coachId} onClose={() => setShow(false)} onSaved={onReload} />}
    </div>
  )
}
