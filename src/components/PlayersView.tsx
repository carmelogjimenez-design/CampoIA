import { useState, useMemo } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import { initials } from '../lib/players'
import { Player, PosGroup } from '../types/database'
import AddPlayerModal from './AddPlayerModal'
import PlayerDetail from './PlayerDetail'

const POS: (PosGroup | 'all')[] = ['all', 'POR', 'DEF', 'MED', 'DEL']

export default function PlayersView() {
  const { players, loading, error, addPlayer } = usePlayers()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Player | null>(null)
  const [pos, setPos] = useState<PosGroup | 'all'>('all')
  const [club, setClub] = useState('all')
  const [q, setQ] = useState('')

  const clubs = useMemo(() => Array.from(new Set(players.map(p => p.club).filter(Boolean))) as string[], [players])
  const filtered = players.filter(p =>
    (pos === 'all' || p.pos_group === pos) &&
    (club === 'all' || p.club === club) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  )

  if (selected) return <PlayerDetail player={selected} onBack={() => setSelected(null)} players={players} />

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex items-end justify-between mb-7">
        <div>
          <div className="eyebrow mb-2">General</div>
          <h1 className="h-page text-[40px] leading-none">Jugadores</h1>
          <p className="text-muted text-[15px] mt-2.5 tnum">{filtered.length} de {players.length}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ink">+ Nuevo jugador</button>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar jugador…"
               className="bg-paper border border-line rounded-full px-4 py-2 text-[14px] outline-none focus:border-ink/20 w-52" />
        <div className="flex gap-1.5">
          {POS.map(p => <button key={p} onClick={() => setPos(p)} className={pos === p ? 'chip bg-ink text-paper' : 'chip'}>{p === 'all' ? 'Todas' : p}</button>)}
        </div>
        {clubs.length > 0 && (
          <select value={club} onChange={e => setClub(e.target.value)} className="chip bg-paper border border-line cursor-pointer">
            <option value="all">Todos los clubs</option>
            {clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">{error}</div>}
      {loading && <p className="text-muted text-[15px]">Cargando…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-ink text-[16px] font-medium">Sin resultados</p>
          <p className="text-muted text-[14px] mt-1.5">Prueba a cambiar los filtros o añade un jugador.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => (
          <button key={p.id} onClick={() => setSelected(p)} className="card p-5 text-left hover:shadow-apple-lg transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-full bg-canvas border border-line flex items-center justify-center font-display font-semibold text-ink overflow-hidden shrink-0">
              {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : initials(p.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink truncate text-[15px]">{p.name}</div>
              <div className="text-[13px] text-muted truncate">{p.pos_group ?? '—'}{p.pos ? ` · ${p.pos}` : ''}{p.age ? ` · ${p.age}` : ''}</div>
            </div>
            <span className="text-faint group-hover:text-ink transition">›</span>
          </button>
        ))}
      </div>

      {showAdd && <AddPlayerModal onClose={() => setShowAdd(false)} onSave={addPlayer} />}
    </div>
  )
}
