import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, CheckIn } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; coachId: string }

export default function HabitsView({ players, coachId }: Props) {
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  useEffect(() => {
    supabase.from('check_ins').select('*').eq('coach_id', coachId).order('date', { ascending: false })
      .then(({ data }) => setCheckins((data as CheckIn[]) ?? []))
  }, [coachId])

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Hábitos y bienestar</h1>
      <p className="text-sub mb-6">Check-ins de tus jugadores · sueño, ánimo, energía</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {checkins.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-line p-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-ink">{getPlayerName(players, c.player_id)}</span>
              <span className="text-xs text-muted">{c.date}</span>
            </div>
            <div className="flex gap-4 text-sm text-sub">
              {c.mood && <span>😊 Ánimo: {c.mood}</span>}
              {c.energy && <span>⚡ Energía: {c.energy}</span>}
              {c.sleep_hours != null && <span>😴 {c.sleep_hours}h</span>}
            </div>
            {c.notes && <p className="text-sm text-sub mt-2 italic">"{c.notes}"</p>}
          </div>
        ))}
        {!checkins.length && <p className="text-muted py-8">Aún no hay check-ins de los jugadores.</p>}
      </div>
    </div>
  )
}
