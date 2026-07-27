import { useState } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import { posColor, initials } from '../lib/players'
import { Player } from '../types/database'
import AddPlayerModal from './AddPlayerModal'
import PlayerDetail from './PlayerDetail'

export default function PlayersView() {
  const { players, loading, error, addPlayer } = usePlayers()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Player | null>(null)

  if (selected) return <PlayerDetail player={selected} onBack={() => setSelected(null)} />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Jugadores</h1>
          <p className="text-slate-500 mt-1">{players.length} en tu plantilla</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="bg-ink text-white font-semibold rounded-xl px-4 py-2.5">
          + Nuevo jugador
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
      {loading && <p className="text-slate-400">Cargando…</p>}

      {!loading && players.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold text-slate-600">Aún no tienes jugadores</p>
          <p className="text-sm mt-1">Añade el primero para empezar.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(p => {
          const c = posColor(p)
          return (
            <button key={p.id} onClick={() => setSelected(p)}
                    className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:shadow-md transition flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${c.bg} ${c.text} overflow-hidden shrink-0`}>
                {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : initials(p.name)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.pos_group ?? '—'}{p.pos ? ` · ${p.pos}` : ''}{p.age ? ` · ${p.age} años` : ''}
                </div>
                {p.club && <div className="text-xs text-slate-400 truncate">{p.club}</div>}
              </div>
            </button>
          )
        })}
      </div>

      {showAdd && <AddPlayerModal onClose={() => setShowAdd(false)} onSave={addPlayer} />}
    </div>
  )
}
