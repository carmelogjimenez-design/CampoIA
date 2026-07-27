import { useState } from 'react'
import { Player, TrainingSession, SessionExercise } from '../types/database'
import { getPlayerName } from '../lib/players'
import AddSessionModal from './AddSessionModal'

interface Props {
  players: Player[]; training: TrainingSession[]; sessionEx: SessionExercise[]
  coachId: string; onReload: () => void
}

export default function TrainingView({ players, training, sessionEx, coachId, onReload }: Props) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Entrenamientos</h1>
          <p className="text-slate-500 mt-1">{training.length} sesiones</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-ink text-white font-semibold rounded-xl px-4 py-2.5">
          + Nueva sesión
        </button>
      </div>

      {training.length === 0 && <p className="text-slate-400 py-12 text-center">Sin sesiones. Crea la primera.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {training.map(s => {
          const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
          return (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-ink">{getPlayerName(players, s.player_id)}</div>
                  <div className="text-xs text-slate-500">{s.date} · {s.type}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {s.completed ? 'Completado' : 'Pendiente'}
                </span>
              </div>
              {s.goal && <div className="text-sm text-slate-600 mb-2"><b>Objetivo:</b> {s.goal}</div>}
              {exs.length > 0 && (
                <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                  {exs.map((e, i) => (
                    <div key={e.id} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <span className="font-medium text-ink">{e.title}</span>
                        {e.video_url && <a href={e.video_url} target="_blank" className="text-red-500 ml-1">▶</a>}
                        <div className="text-xs text-slate-400">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.player_feedback && (
                <div className="mt-2 bg-violet-50 rounded-lg px-3 py-2 text-sm text-violet-700">
                  💬 <b>Feedback:</b> {s.player_feedback}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && <AddSessionModal players={players} coachId={coachId}
                    onClose={() => setShowAdd(false)} onSaved={onReload} />}
    </div>
  )
}
