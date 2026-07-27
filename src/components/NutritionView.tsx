import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, NutritionLog } from '../types/database'
import { getPlayerName, initials } from '../lib/players'

interface Props { players: Player[]; coachId: string }
const QEMOJI: Record<string, string> = { good: '🟢', regular: '🟡', bad: '🔴' }

export default function NutritionView({ players, coachId }: Props) {
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('nutrition_logs').select('*').eq('coach_id', coachId).order('date', { ascending: false }).limit(100)
      .then(({ data }) => setLogs((data as NutritionLog[]) ?? []))
  }, [coachId])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.player_id === filter)
  const good = filtered.filter(l => l.quality === 'good').length
  const score = filtered.length ? Math.round(good / filtered.length * 100) : 0

  // Agrupar por jugador para el ranking de adherencia nutricional
  const byPlayer = players.map(p => {
    const pl = logs.filter(l => l.player_id === p.id)
    const g = pl.filter(l => l.quality === 'good').length
    return { p, count: pl.length, score: pl.length ? Math.round(g / pl.length * 100) : 0 }
  }).filter(x => x.count > 0).sort((a, b) => b.score - a.score)

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Seguimiento</div><h1 className="h-page text-[40px] leading-none">Alimentación</h1></header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 bg-ink rounded-2xl p-7 text-paper flex flex-col justify-between">
          <div className="text-[13px] text-paper/60 uppercase tracking-eyebrow font-semibold">Calidad global</div>
          <div><div className="stat-num text-volt text-[54px] leading-none">{score}<span className="text-[28px]">%</span></div><div className="text-[13px] text-paper/50 mt-1">comidas saludables · {filtered.length} registros</div></div>
        </div>
        <div className="lg:col-span-2 card p-7">
          <div className="eyebrow mb-5">Adherencia por jugador</div>
          {byPlayer.length === 0 && <p className="text-muted text-[14px]">Sin registros aún.</p>}
          <div className="space-y-4">
            {byPlayer.map(x => (
              <div key={x.p.id}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[14px] text-ink">{x.p.name}</span>
                  <span className="stat-num text-[14px]">{x.score}%</span>
                </div>
                <div className="bar-track"><div className={x.score >= 70 ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${x.score}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
        {players.map(p => <button key={p.id} onClick={() => setFilter(p.id)} className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>)}
      </div>

      <div className="space-y-2.5">
        {filtered.map(l => (
          <div key={l.id} className="card p-4 flex items-center gap-4">
            <span className="text-[18px]">{QEMOJI[l.quality ?? ''] ?? '⚪'}</span>
            <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, l.player_id))}</div>
            <div className="flex-1 min-w-0"><div className="text-[14px] text-ink">{l.description}</div><div className="text-[11px] text-muted tnum">{getPlayerName(players, l.player_id).split(' ')[0]} · {l.meal_type} · {l.date}</div></div>
          </div>
        ))}
        {!filtered.length && <div className="card p-12 text-center text-muted text-[14px]">Sin registros. Los jugadores apuntan su comida desde el portal (pestaña Comida).</div>}
      </div>
    </div>
  )
}
