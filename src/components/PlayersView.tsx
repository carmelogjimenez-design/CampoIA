import { useState } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import { initials } from '../lib/players'
import { Player } from '../types/database'
import AddPlayerModal from './AddPlayerModal'
import PlayerDetail from './PlayerDetail'

export default function PlayersView() {
  const { players, loading, error, addPlayer } = usePlayers()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Player | null>(null)

  if (selected) return <PlayerDetail player={selected} onBack={() => setSelected(null)} />

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex items-end justify-between mb-9">
        <div>
          <div className="eyebrow mb-2">General</div>
          <h1 className="h-page text-[40px] leading-none">Jugadores</h1>
          <p className="text-muted text-[15px] mt-2.5 tnum">{players.length} en tu plantilla</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ink">+ Nuevo jugador</button>
      </header>

      {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">{error}</div>}
      {loading && <p className="text-muted text-[15px]">Cargando…</p>}

      {!loading && players.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-ink text-[16px] font-medium">Aún no hay jugadores</p>
          <p className="text-muted text-[14px] mt-1.5">Añade el primero para empezar a construir su desarrollo.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(p => (
          <button key={p.id} onClick={() => setSelected(p)}
                  className="card p-5 text-left hover:shadow-apple-lg transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-full bg-canvas border border-line flex items-center justify-center font-display font-semibold text-ink overflow-hidden shrink-0">
              {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : initials(p.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink truncate text-[15px]">{p.name}</div>
              <div className="text-[13px] text-muted truncate">
                {p.pos_group ?? '—'}{p.pos ? ` · ${p.pos}` : ''}{p.age ? ` · ${p.age}` : ''}
              </div>
            </div>
            <span className="text-faint group-hover:text-ink transition text-[15px]">›</span>
          </button>
        ))}
      </div>

      {showAdd && <AddPlayerModal onClose={() => setShowAdd(false)} onSave={addPlayer} />}
    </div>
  )
}
