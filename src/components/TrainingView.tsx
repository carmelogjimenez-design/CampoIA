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
  const [edit, setEdit] = useState<TrainingSession | null>(null)

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex items-end justify-between mb-7">
        <div>
          <div className="eyebrow mb-2">Planificación</div>
          <h1 className="h-page text-[40px] leading-none">Entrenamientos</h1>
          <p className="text-muted text-[15px] mt-2.5 tnum">{training.length} sesiones</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ink">+ Nueva sesión</button>
      </header>

      {training.length === 0 && <div className="card p-12 text-center text-muted text-[14px]">Sin sesiones. Crea la primera.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {training.map(s => {
          const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
          return (
            <div key={s.id} className="card p-5 group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-ink text-[15px]">{getPlayerName(players, s.player_id)}</div>
                  <div className="text-[12px] text-muted tnum">{s.date} · {s.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.completed ? <span className="chip bg-volt text-ink">Hecho</span> : <span className="chip">Pendiente</span>}
                  <button onClick={() => setEdit(s)} className="opacity-0 group-hover:opacity-100 text-[12px] text-sub hover:text-ink transition">Editar</button>
                </div>
              </div>
              {s.goal && <div className="text-[13px] text-sub mb-2">{s.goal}</div>}
              {exs.length > 0 && (
                <div className="border-t border-line pt-3 mt-2 space-y-1.5">
                  {exs.map((e, i) => (
                    <div key={e.id} className="flex items-start gap-2.5 text-[14px]">
                      <span className="tnum text-muted text-[12px] w-4 mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <span className="font-medium text-ink">{e.title}</span>
                        {e.video_url && <a href={e.video_url} target="_blank" className="text-ink ml-1.5 underline text-[12px]">vídeo</a>}
                        <div className="text-[12px] text-muted tnum">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.player_feedback && <div className="mt-3 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] text-sub">💬 {s.player_feedback}</div>}
            </div>
          )
        })}
      </div>

      {showAdd && <AddSessionModal players={players} coachId={coachId} onClose={() => setShowAdd(false)} onSaved={onReload} />}
      {edit && <AddSessionModal players={players} coachId={coachId} editSession={edit}
                 editExercises={sessionEx.filter(e => e.session_id === edit.id)}
                 onClose={() => setEdit(null)} onSaved={onReload} />}
    </div>
  )
}
