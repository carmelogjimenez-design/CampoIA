import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Match } from '../types/database'
import { getPlayerName, initials, isGoalkeeper } from '../lib/players'
import { matchSeason, seasonsIn, seasonTitle } from '../lib/seasons'
import AddMatchModal from './AddMatchModal'
import { EmptyState } from './States'

interface Props { players: Player[]; matches: Match[]; coachId: string; onReload: () => void }

export default function MatchesView({ players, matches, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [filter, setFilter] = useState('all')
  const [season, setSeason] = useState('all')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  async function remove(m: Match) {
    await supabase.from('matches').delete().eq('id', m.id)
    setConfirmDel(null); onReload()
  }

  const seasons = seasonsIn(matches)
  const byPlayer = filter === 'all' ? matches : matches.filter(m => m.player_id === filter)
  const filtered = season === 'all' ? byPlayer : byPlayer.filter(m => matchSeason(m) === season)

  // Si estás mirando a un portero, los goles y las asistencias no dicen nada
  const selectedPlayer = players.find(p => p.id === filter) ?? null
  const gkView = selectedPlayer ? isGoalkeeper(selectedPlayer) : false

  const totMins = filtered.reduce((s, m) => s + (m.mins ?? 0), 0)
  const totGoals = filtered.reduce((s, m) => s + (m.goals ?? 0), 0)
  const totAssists = filtered.reduce((s, m) => s + (m.assists ?? 0), 0)
  const totConceded = filtered.reduce((s, m) => s + (m.conceded ?? 0), 0)
  const cleanSheets = filtered.filter(m => m.clean_sheet === true).length

  const kpis: [string, number][] = [
    ['Partidos', filtered.length],
    ['Minutos', totMins],
    ...(gkView
      ? [['Encajados', totConceded], ['Porterías a 0', cleanSheets]] as [string, number][]
      : [['Goles', totGoals], ['Asistencias', totAssists]] as [string, number][]),
  ]

  // Agrupado por temporada cuando se ven todas
  const grupos: [string, Match[]][] = season === 'all'
    ? seasonsIn(filtered).map(s => [s, filtered.filter(m => matchSeason(m) === s)])
    : [[season, filtered]]

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow mb-2">Competición</div>
          <h1 className="h-page text-[26px] sm:text-[40px] leading-none">Partidos</h1>
        </div>
        <button onClick={() => setShow(true)} className="btn-ink">+ Registrar partido</button>
      </header>

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
        {kpis.map(([l, v]) => (
          <div key={l} className="card p-6">
            <div className="stat-num text-[34px] leading-none">{v}</div>
            <div className="text-[12px] text-muted mt-1.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Temporada */}
      {seasons.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-3 items-center">
          <span className="eyebrow mr-1">Temporada</span>
          {seasons.map(s => (
            <button key={s} onClick={() => setSeason(s)}
                    className={season === s ? 'chip bg-ink text-paper' : 'chip'}>{s}</button>
          ))}
          <button onClick={() => setSeason('all')}
                  className={season === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todas</button>
        </div>
      )}

      {/* Jugador */}
      <div className="flex gap-2 flex-wrap mb-5 items-center">
        <span className="eyebrow mr-1">Jugador</span>
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
        {players.map(p => (
          <button key={p.id} onClick={() => setFilter(p.id)}
                  className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>
        ))}
      </div>

      {/* Lista */}
      {grupos.map(([sn, ms]) => (
        <div key={sn} className="mb-7 last:mb-0">
          {grupos.length > 1 && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="eyebrow">{seasonTitle(sn)}</span>
              <span className="text-[11px] text-faint tnum">{ms.length}</span>
              <div className="flex-1 h-px bg-line" />
            </div>
          )}

          <div className="space-y-2.5">
            {ms.map(m => {
              const player = players.find(p => p.id === m.player_id) ?? null
              const gk = player ? isGoalkeeper(player) : false
              const casa = /casa/i.test(m.notes ?? '') ? 'Casa' : /fuera/i.test(m.notes ?? '') ? 'Fuera' : null
              const detalle = [
                getPlayerName(players, m.player_id),
                m.role === 'no-play' ? 'no jugó' : m.role,
                m.mins != null ? `${m.mins}′` : null,
                casa,
              ].filter(Boolean).join(' · ')

              return (
                <div key={m.id} className="card p-5 flex items-center gap-4 sm:gap-5 group">
                  <div className="w-11 h-11 rounded-full bg-canvas flex items-center justify-center text-[12px] font-semibold text-sub shrink-0 overflow-hidden">
                    {player?.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : initials(getPlayerName(players, m.player_id))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-medium text-ink">vs {m.rival || '—'}</span>
                      <span className="text-[12px] text-muted tnum">{m.date ?? 'sin fecha'}</span>
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">{detalle}</div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {(m.goals ?? 0) > 0 && <span className="chip bg-volt text-ink font-semibold">{m.goals} ⚽</span>}
                    {(m.assists ?? 0) > 0 && <span className="chip">{m.assists} 🅰</span>}
                    {gk && m.clean_sheet && <span className="chip bg-volt text-ink">🧤 Portería a 0</span>}
                    {gk && !m.clean_sheet && (m.conceded ?? 0) > 0 && <span className="chip">{m.conceded} encajados</span>}
                  </div>

                  <div className="stat-num text-[22px] w-16 text-right shrink-0">{m.result || '—'}</div>

                  {confirmDel === m.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => remove(m)} className="text-[12px] font-semibold text-ink underline">Borrar</button>
                      <button onClick={() => setConfirmDel(null)} className="text-[12px] text-muted">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(m.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink transition text-[13px] shrink-0">✕</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!filtered.length && (
        <EmptyState icon="⚽" title={matches.length ? 'Sin partidos con estos filtros' : 'Sin partidos registrados'}
                    description={matches.length
                      ? 'Prueba con otra temporada u otro jugador.'
                      : 'Anota el primer partido, o importa la temporada entera desde la ficha del jugador.'}
                    actionLabel="+ Nuevo partido" onAction={() => setShow(true)} />
      )}

      {show && <AddMatchModal players={players} coachId={coachId} onClose={() => setShow(false)} onSaved={onReload} />}
    </div>
  )
}
