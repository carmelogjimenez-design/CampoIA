import { useState } from 'react'
import { Player, TrainingSession, SessionExercise } from '../types/database'
import { isSearchUrl } from '../lib/tasks'
import { getPlayerName } from '../lib/players'
import AddSessionModal from './AddSessionModal'
import { EmptyState } from './States'

interface Props {
  players: Player[]; training: TrainingSession[]; sessionEx: SessionExercise[]
  coachId: string; onReload: () => void
}

export default function TrainingView({ players, training, sessionEx, coachId, onReload }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [edit, setEdit] = useState<TrainingSession | null>(null)
  const [tab, setTab] = useState<'active' | 'done'>('active')

  const active = training.filter(s => !s.completed)
  const done = training.filter(s => s.completed)
  const list = tab === 'active' ? active : done

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-2">Planificación</div>
          <h1 className="h-page text-[26px] sm:text-[40px] leading-none">Entrenamientos</h1>
          <p className="text-muted text-[15px] mt-2.5 tnum">{active.length} activos · {done.length} realizados</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ink">+ Nueva sesión</button>
      </header>

      {/* Pestañas */}
      <div className="inline-flex bg-canvas rounded-full p-1 mb-6">
        <button onClick={() => setTab('active')} className={`px-5 py-2 rounded-full text-[13px] font-medium transition ${tab === 'active' ? 'bg-paper text-ink shadow-apple' : 'text-sub'}`}>
          Activos {active.length > 0 && <span className="tabular-nums opacity-60">· {active.length}</span>}
        </button>
        <button onClick={() => setTab('done')} className={`px-5 py-2 rounded-full text-[13px] font-medium transition ${tab === 'done' ? 'bg-paper text-ink shadow-apple' : 'text-sub'}`}>
          Realizados {done.length > 0 && <span className="tabular-nums opacity-60">· {done.length}</span>}
        </button>
      </div>

      {list.length === 0 && (
        tab === 'active'
          ? <EmptyState icon="◷" title="No hay sesiones activas" description="Todo al día, o planifica una nueva sesión para tus jugadores." actionLabel="+ Nueva sesión" onAction={() => setShowAdd(true)} />
          : <EmptyState icon="✓" title="Aún no hay sesiones realizadas" description="Aquí verás el historial de entrenamientos completados por tus jugadores." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map(s => {
          const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
          return (
            <div key={s.id} className={`card p-5 group ${s.completed ? 'opacity-[0.92]' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-ink text-[15px]">{getPlayerName(players, s.player_id)}</div>
                  <div className="text-[12px] text-muted tnum">{s.date} · {s.type}{s.completed && s.completed_at ? ` · hecho ${s.completed_at.slice(0, 10)}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.completed ? <span className="chip bg-volt text-ink">Hecho</span> : <span className="chip">Pendiente</span>}
                  <button onClick={() => setEdit(s)} className="opacity-0 group-hover:opacity-100 text-[12px] text-sub hover:text-ink transition">Editar</button>
                </div>
              </div>
              {s.goal && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {/[[]En casa[]]/i.test(s.goal) && <span className="chip bg-volt text-ink">🏠 En casa</span>}
                  {/[[]En club[]]/i.test(s.goal) && <span className="chip bg-ink text-paper">⚽ En club</span>}
                  <span className="text-[13px] text-sub">{s.goal.replace(/^\s*[[](En casa|En club)[]]\s*/i, '')}</span>
                </div>
              )}
              {exs.length > 0 && !s.completed && exs.some(e => e.done) && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="bar-track flex-1">
                    <div className={exs.every(e => e.done) ? 'bar-fill-volt' : 'bar-fill'}
                         style={{ width: `${(exs.filter(e => e.done).length / exs.length) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-muted tnum shrink-0">{exs.filter(e => e.done).length}/{exs.length} hechos</span>
                </div>
              )}
              {s.completed && exs.length > 0 && exs.some(e => !e.done) && exs.some(e => e.done) && (
                <div className="text-[12px] text-ink mt-2">
                  ⚠ Marcó la sesión como hecha pero dejó {exs.filter(e => !e.done).length} ejercicios sin marcar
                </div>
              )}
              {exs.length > 0 && (
                <div className="border-t border-line pt-3 mt-2 space-y-1.5">
                  {exs.map((e, i) => (
                    <div key={e.id} className="flex items-start gap-2.5 text-[14px]">
                      <span className={`w-4 shrink-0 mt-0.5 text-center text-[12px] ${e.done ? 'text-ink' : 'tnum text-muted'}`}>
                        {e.done ? '✓' : i + 1}
                      </span>
                      <div className="flex-1">
                        <span className={`font-medium ${e.done ? 'text-muted' : 'text-ink'}`}>{e.title}</span>
                        {isSearchUrl(e.video_url)
                          ? <a href={e.video_url!} target="_blank" rel="noreferrer" className="chip ml-2 hover:bg-line transition">Buscar vídeo</a>
                          : e.video_url
                            ? <a href={e.video_url} target="_blank" rel="noreferrer" className="chip bg-ink text-paper ml-2 hover:opacity-85 transition">▶ vídeo</a>
                            : <span className="text-[11px] text-faint ml-2">sin vídeo</span>}
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
