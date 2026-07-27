import { useEffect, useState } from 'react'
import { Player, Match } from '../types/database'
import { supabase } from '../lib/supabase'
import { initials, isGoalkeeper } from '../lib/players'

interface Props { player: Player; onBack: () => void }

export default function PlayerDetail({ player, onBack }: Props) {
  const [matches, setMatches] = useState<Match[]>([])
  const gk = isGoalkeeper(player)

  useEffect(() => {
    supabase.from('matches').select('*').eq('player_id', player.id)
      .then(({ data }) => setMatches((data as Match[]) ?? []))
  }, [player.id])

  const totMins = matches.reduce((s, m) => s + (m.mins ?? 0), 0)
  const totGoals = matches.reduce((s, m) => s + (m.goals ?? 0), 0)
  const totAssists = matches.reduce((s, m) => s + (m.assists ?? 0), 0)
  const totConceded = matches.reduce((s, m) => s + (m.conceded ?? 0), 0)
  const cleanSheets = matches.filter(m => m.clean_sheet === true).length
  const called = matches.filter(m => m.called === 'yes' || ['titular', 'suplente', 'no-play'].includes(m.role ?? '')).length

  const stats: [string, number][] = [
    ['Convocatorias', called], ['Minutos', totMins], ['Goles', totGoals], ['Asistencias', totAssists],
    ...(gk ? [['Encajados', totConceded], ['Porterías a cero', cleanSheets]] as [string, number][] : []),
  ]

  // Atributos estimados (barras)
  const base = player.score ?? 70
  const attrs = player.ai_attributes ?? {
    Técnica: base - 4, Táctica: base - 7, Físico: base - 10, Mental: base - 2, Velocidad: base - 8, Lectura: base - 5,
  }

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <button onClick={onBack} className="text-[13px] text-muted hover:text-ink mb-6 transition">← Jugadores</button>

      <header className="flex items-center gap-5 mb-8">
        <div className="w-[72px] h-[72px] rounded-full bg-canvas border border-line flex items-center justify-center font-display font-semibold text-[24px] text-ink overflow-hidden shrink-0">
          {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : initials(player.name)}
        </div>
        <div>
          <h1 className="h-page text-[32px] leading-none">{player.name}</h1>
          <p className="text-sub text-[15px] mt-2">
            {player.pos_group ?? '—'}{player.pos ? ` · ${player.pos}` : ''}{player.age ? ` · ${player.age} años` : ''}
            {player.club ? ` · ${player.club}` : ''}
          </p>
        </div>
      </header>

      {/* Estadísticas de competición — números grandes tabulares */}
      <div className="card p-8 mb-6">
        <div className="eyebrow mb-6">Competición</div>
        <div className={`grid gap-y-8 gap-x-4 ${gk ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {stats.map(([label, val]) => (
            <div key={label}>
              <div className="stat-num text-[38px] leading-none">{val}</div>
              <div className="text-[12px] text-muted mt-2">{label}</div>
            </div>
          ))}
        </div>
        {matches.length === 0 && <p className="text-muted text-[13px] mt-6">Sin partidos registrados todavía.</p>}
      </div>

      {/* Atributos — barras finas */}
      <div className="card p-8">
        <div className="eyebrow mb-6">Atributos estimados</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
          {Object.entries(attrs).map(([k, v]) => (
            <div key={k}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[14px] text-ink">{k}</span>
                <span className="stat-num text-[14px]">{Math.round(Number(v))}</span>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(Number(v), 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
