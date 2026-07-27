import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, CheckIn } from '../types/database'
import { getPlayerName, initials } from '../lib/players'

interface Props { players: Player[]; coachId: string }

export default function HabitsView({ players, coachId }: Props) {
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('check_ins').select('*').eq('coach_id', coachId).order('date', { ascending: false }).limit(60)
      .then(({ data }) => setCheckins((data as CheckIn[]) ?? []))
  }, [coachId])

  const filtered = filter === 'all' ? checkins : checkins.filter(c => c.player_id === filter)
  const avgSleep = filtered.filter(c => c.sleep_hours).length
    ? (filtered.reduce((s, c) => s + (c.sleep_hours ?? 0), 0) / filtered.filter(c => c.sleep_hours).length).toFixed(1) : '—'

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Seguimiento</div><h1 className="h-page text-[40px] leading-none">Bienestar</h1></header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{filtered.length}</div><div className="text-[12px] text-muted mt-1.5">Registros</div></div>
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{avgSleep}</div><div className="text-[12px] text-muted mt-1.5">Sueño medio (h)</div></div>
        <div className="card p-6"><div className="stat-num text-[34px] leading-none">{new Set(filtered.map(c => c.player_id)).size}</div><div className="text-[12px] text-muted mt-1.5">Jugadores activos</div></div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
        {players.map(p => <button key={p.id} onClick={() => setFilter(p.id)} className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(c => (
          <div key={c.id} className="card p-5 flex items-center gap-4">
            <span className="text-[26px]">{c.mood || '—'}</span>
            <div className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-[11px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, c.player_id))}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink">{getPlayerName(players, c.player_id)}</div>
              <div className="text-[12px] text-muted tnum">{c.date} · {c.energy || '—'} energía{c.sleep_hours ? ` · ${c.sleep_hours}h` : ''}</div>
              {c.notes && <div className="text-[12px] text-sub mt-1 italic">"{c.notes}"</div>}
            </div>
          </div>
        ))}
        {!filtered.length && <div className="card p-12 text-center text-muted text-[14px] lg:col-span-2">Aún no hay check-ins. Los jugadores los registran desde su portal (pestaña Bienestar).</div>}
      </div>
    </div>
  )
}
