import { useEffect, useState } from 'react'
import { Player, Match } from '../types/database'
import { supabase } from '../lib/supabase'
import { posColor, initials, isGoalkeeper } from '../lib/players'

interface Props { player: Player; onBack: () => void }

export default function PlayerDetail({ player, onBack }: Props) {
  const [matches, setMatches] = useState<Match[]>([])
  const c = posColor(player)
  const gk = isGoalkeeper(player)

  useEffect(() => {
    supabase.from('matches').select('*').eq('player_id', player.id)
      .then(({ data }) => setMatches((data as Match[]) ?? []))
  }, [player.id])

  // Totales de competición
  const totMins = matches.reduce((s, m) => s + (m.mins ?? 0), 0)
  const totGoals = matches.reduce((s, m) => s + (m.goals ?? 0), 0)
  const totAssists = matches.reduce((s, m) => s + (m.assists ?? 0), 0)
  const totConceded = matches.reduce((s, m) => s + (m.conceded ?? 0), 0)
  const cleanSheets = matches.filter(m => m.clean_sheet === true).length
  const called = matches.filter(m =>
    m.called === 'yes' || ['titular', 'suplente', 'no-play'].includes(m.role ?? '')).length

  const stats: [string, number | string][] = [
    ['Convocatorias', called],
    ['Minutos', totMins],
    ['Goles', totGoals],
    ['Asistencias', totAssists],
    ...(gk ? [['Encajados', totConceded], ['Porterías 0', cleanSheets]] as [string, number][] : []),
  ]

  return (
    <div>
      <button onClick={onBack} className="text-slate-500 text-sm mb-4 hover:text-ink">← Jugadores</button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 flex items-center gap-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl ${c.bg} ${c.text} overflow-hidden shrink-0`}>
          {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : initials(player.name)}
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-ink">{player.name}</h1>
          <p className="text-slate-500">
            {player.pos_group ?? '—'}{player.pos ? ` · ${player.pos}` : ''}
            {player.age ? ` · ${player.age} años` : ''}{player.foot ? ` · ${player.foot}` : ''}
          </p>
          {player.club && <p className="text-slate-400 text-sm">{player.club}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-ink mb-4">Estadísticas de competición</h2>
        <div className={`grid gap-3 text-center ${gk ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {stats.map(([label, val]) => (
            <div key={label} className="bg-slate-50 rounded-xl py-3">
              <div className="font-display font-bold text-xl text-ink">{val}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        {matches.length === 0 && (
          <p className="text-slate-400 text-sm mt-4">Aún no hay partidos registrados para este jugador.</p>
        )}
      </div>
    </div>
  )
}
