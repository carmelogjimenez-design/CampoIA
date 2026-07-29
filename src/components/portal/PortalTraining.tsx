import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { TrainingSession, SessionExercise, Task } from '../../types/database'
import { TYPE_ICON, isOverdue, formatDue, playableVideo } from '../../lib/tasks'

export default function PortalTraining({ pd }: { pd: PlayerData }) {
  const { training, sessionEx, tasks, reload } = pd
  const [tab, setTab] = useState<'sesiones' | 'tareas'>('sesiones')
  const [busyEx, setBusyEx] = useState<string | null>(null)

  const pendingSessions = training.filter(s => !s.completed)
  const doneSessions = training.filter(s => s.completed)
  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  const exercisesOf = (s: TrainingSession) =>
    sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)

  async function completeSession(s: TrainingSession) {
    if (s.completed) return
    await supabase.from('training_sessions')
      .update({ completed: true, completed_at: new Date().toISOString() }).eq('id', s.id)
    reload()
  }

  async function toggleExercise(e: SessionExercise) {
    setBusyEx(e.id)
    await supabase.from('session_exercises').update({ done: !e.done }).eq('id', e.id)
    await reload()
    setBusyEx(null)
  }

  async function toggleTask(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
    reload()
  }

  async function feedback(s: TrainingSession) {
    const fb = prompt('¿Cómo te fue este entrenamiento?')
    if (!fb?.trim()) return
    await supabase.from('training_sessions').update({ player_feedback: fb.trim() }).eq('id', s.id)
    reload()
  }

  return (
    <div>
      <h1 className="h-page text-[28px] mb-4">Mi trabajo</h1>

      <div className="grid grid-cols-2 gap-1.5 bg-canvas rounded-xl p-1.5 mb-5">
        {([['sesiones', 'Entrenos', pendingSessions.length],
           ['tareas', 'Tareas', pendingTasks.length]] as const).map(([id, label, n]) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`py-2.5 rounded-[9px] text-[14px] font-medium transition flex items-center justify-center gap-2 ${
                    tab === id ? 'bg-paper text-ink shadow-apple' : 'text-muted'}`}>
            {label}
            {n > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
              tab === id ? 'bg-volt text-ink' : 'bg-line text-sub'}`}>{n}</span>}
          </button>
        ))}
      </div>

      {/* ══════════ ENTRENOS ══════════ */}
      {tab === 'sesiones' && (
        <>
          {training.length === 0 && <p className="text-muted text-[14px]">Sin entrenamientos aún.</p>}

          {pendingSessions.length > 0 && (
            <>
              <SectionTitle label="Por hacer" n={pendingSessions.length} />
              {pendingSessions.map(s => (
                <SessionCard key={s.id} s={s} exs={exercisesOf(s)} busyEx={busyEx}
                             onToggleEx={toggleExercise} onComplete={completeSession} onFeedback={feedback} />
              ))}
            </>
          )}

          {doneSessions.length > 0 && (
            <>
              <SectionTitle label="Hechos" n={doneSessions.length} muted />
              {doneSessions.map(s => (
                <SessionCard key={s.id} s={s} exs={exercisesOf(s)} busyEx={busyEx}
                             onToggleEx={toggleExercise} onComplete={completeSession} onFeedback={feedback} />
              ))}
            </>
          )}

          {training.length > 0 && !pendingSessions.length && (
            <div className="card p-8 text-center mb-4">
              <div className="text-[28px] mb-2">💪</div>
              <p className="text-ink text-[15px] font-medium">Todo hecho</p>
              <p className="text-muted text-[13px] mt-1">No te queda ningún entreno pendiente.</p>
            </div>
          )}
        </>
      )}

      {/* ══════════ TAREAS ══════════ */}
      {tab === 'tareas' && (
        <>
          {tasks.length === 0 && <p className="text-muted text-[14px]">Tu coach aún no te ha puesto tareas.</p>}

          {pendingTasks.length > 0 && (
            <>
              <SectionTitle label="Por hacer" n={pendingTasks.length} />
              {pendingTasks.map(t => <TaskCard key={t.id} t={t} onToggle={toggleTask} />)}
            </>
          )}

          {doneTasks.length > 0 && (
            <>
              <SectionTitle label="Hechas" n={doneTasks.length} muted />
              {doneTasks.map(t => <TaskCard key={t.id} t={t} onToggle={toggleTask} />)}
            </>
          )}

          {tasks.length > 0 && !pendingTasks.length && (
            <div className="card p-8 text-center mb-4">
              <div className="text-[28px] mb-2">✓</div>
              <p className="text-ink text-[15px] font-medium">Ni una pendiente</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SectionTitle({ label, n, muted }: { label: string; n: number; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 mb-3 mt-6 first:mt-0 ${muted ? 'opacity-60' : ''}`}>
      <span className="eyebrow">{label}</span>
      <span className="text-[11px] text-faint tnum">{n}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}

// ── Tarjeta de sesión ──────────────────────────────────────

function SessionCard({ s, exs, busyEx, onToggleEx, onComplete, onFeedback }: {
  s: TrainingSession
  exs: SessionExercise[]
  busyEx: string | null
  onToggleEx: (e: SessionExercise) => void
  onComplete: (s: TrainingSession) => void
  onFeedback: (s: TrainingSession) => void
}) {
  const hechos = exs.filter(e => e.done).length
  const conVideo = exs.filter(e => playableVideo(e.video_url)).length
  const todosHechos = exs.length > 0 && hechos === exs.length

  return (
    <div className={`card p-5 mb-3 ${s.completed ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[15px] text-ink flex items-center gap-2 flex-wrap">
            {s.type}
            {s.goal && /\[En casa\]/i.test(s.goal) && <span className="chip bg-volt text-ink">🏠 En casa</span>}
            {s.goal && /\[En club\]/i.test(s.goal) && <span className="chip bg-ink text-paper">⚽ En club</span>}
          </div>
          <div className="text-[12px] text-muted tnum">
            {s.date}{s.goal ? ` · ${s.goal.replace(/^\s*\[(En casa|En club)\]\s*/i, '')}` : ''}
          </div>
          {conVideo > 0 && !s.completed && (
            <div className="text-[12px] text-ink mt-1 flex items-center gap-1.5">
              <span className="text-[10px]">▶</span>
              {conVideo === 1 ? '1 ejercicio con vídeo' : `${conVideo} ejercicios con vídeo`}
            </div>
          )}
        </div>
        {s.completed
          ? <span className="chip bg-volt text-ink shrink-0">✓ Hecho</span>
          : <button onClick={() => onComplete(s)}
                    className={`shrink-0 text-[12px] px-4 py-2 rounded-full font-medium transition ${
                      todosHechos ? 'bg-volt text-ink' : 'bg-ink text-paper'}`}>
              Marcar hecho
            </button>}
      </div>

      {/* Progreso de ejercicios */}
      {exs.length > 0 && !s.completed && (
        <div className="mt-3 flex items-center gap-3">
          <div className="bar-track flex-1">
            <div className={todosHechos ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${(hechos / exs.length) * 100}%` }} />
          </div>
          <span className="text-[11px] text-muted tnum shrink-0">{hechos}/{exs.length}</span>
        </div>
      )}

      {exs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line space-y-3">
          {exs.map((e, i) => {
            const video = playableVideo(e.video_url)
            const detalle = [e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')
            return (
              <div key={e.id} className="flex items-start gap-3">
                {s.completed ? (
                  <span className={`w-4 h-4 mt-1 shrink-0 text-[12px] ${e.done ? 'text-ink' : 'text-faint'}`}>{e.done ? '✓' : '·'}</span>
                ) : (
                  <button onClick={() => onToggleEx(e)} disabled={busyEx === e.id}
                          className={`w-6 h-6 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                            e.done ? 'bg-volt border-volt text-ink' : 'border-line-strong active:scale-90'}`}>
                    {e.done && <span className="text-[11px]">✓</span>}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-[14px] font-medium ${e.done ? 'text-muted line-through' : 'text-ink'}`}>{e.title}</div>
                  {detalle && <div className="text-[12px] text-muted tnum">{detalle}</div>}
                  {video && !e.done && (
                    <a href={video} target="_blank" rel="noreferrer"
                       className="mt-2 inline-flex items-center gap-2 bg-ink text-paper rounded-full pl-3 pr-4 h-9 text-[13px] font-medium active:scale-[.97] transition">
                      <span className="text-volt text-[11px]">▶</span> Ver cómo se hace
                    </a>
                  )}
                </div>
                <span className="text-[11px] tnum text-faint shrink-0 mt-1">{i + 1}</span>
              </div>
            )
          })}
        </div>
      )}

      {s.player_feedback
        ? <div className="mt-3 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] text-sub">{s.player_feedback}</div>
        : <button onClick={() => onFeedback(s)}
                  className="mt-3 w-full border border-line rounded-xl py-2.5 text-[13px] font-medium text-sub hover:bg-canvas transition">
            Dar feedback
          </button>}
    </div>
  )
}

// ── Tarjeta de tarea ───────────────────────────────────────

function TaskCard({ t, onToggle }: { t: Task; onToggle: (t: Task) => void }) {
  const video = playableVideo(t.video_url)
  return (
    <div className={`card p-5 mb-3 ${t.done ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3.5">
        <button onClick={() => onToggle(t)}
                className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                  t.done ? 'bg-volt border-volt text-ink' : 'border-line-strong active:scale-95'}`}>
          {t.done && <span className="text-[13px]">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-medium ${t.done ? 'line-through text-muted' : 'text-ink'}`}>
            {t.title || t.description}
          </div>
          {t.description && t.description !== t.title && (
            <p className="text-[13px] text-sub mt-1.5 leading-relaxed">{t.description}</p>
          )}
          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {t.type && <span className="text-[11px] text-muted">{TYPE_ICON[t.type] ?? '•'} {t.type}</span>}
            {t.priority === 'alta' && !t.done && <span className="chip bg-ink text-paper">Importante</span>}
            {t.due_date && !t.done && (
              <span className={`text-[11px] ${isOverdue(t) ? 'text-ink font-semibold' : 'text-muted'}`}>
                {isOverdue(t) ? '⚠ ' : ''}{formatDue(t.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {video && !t.done && (
        <a href={video} target="_blank" rel="noreferrer"
           className="mt-4 w-full bg-ink text-paper rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 active:scale-[.98] transition">
          <span className="text-volt">▶</span> Ver el vídeo
        </a>
      )}
    </div>
  )
}
