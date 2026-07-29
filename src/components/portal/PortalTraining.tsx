import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { TrainingSession, Task } from '../../types/database'
import { TYPE_ICON, isOverdue, formatDue } from '../../lib/tasks'

export default function PortalTraining({ pd }: { pd: PlayerData }) {
  const { training, sessionEx, tasks, reload } = pd
  const [tab, setTab] = useState<'sesiones' | 'tareas'>('sesiones')
  const pendingTasks = tasks.filter(t => !t.done)

  async function complete(s: TrainingSession) {
    if (s.completed) return
    await supabase.from('training_sessions').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', s.id)
    reload()
  }
  async function feedback(s: TrainingSession) {
    const fb = prompt('¿Cómo te fue este entrenamiento?')
    if (!fb?.trim()) return
    await supabase.from('training_sessions').update({ player_feedback: fb.trim() }).eq('id', s.id)
    reload()
  }

  async function toggleTask(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
    reload()
  }

  return (
    <div>
      <h1 className="h-page text-[28px] mb-4">Mi trabajo</h1>

      <div className="grid grid-cols-2 gap-1.5 bg-canvas rounded-xl p-1.5 mb-5">
        {([['sesiones', 'Entrenos', training.filter(s => !s.completed).length],
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

      {tab === 'tareas' && (
        <>
          {tasks.length === 0 && <p className="text-muted text-[14px]">Tu coach aún no te ha puesto tareas.</p>}
          {[...tasks].sort((a, b) => Number(a.done) - Number(b.done)).map(t => (
            <div key={t.id} className={`card p-5 mb-3 ${t.done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3.5">
                <button onClick={() => toggleTask(t)}
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

              {t.video_url && !t.done && (
                <a href={t.video_url} target="_blank" rel="noreferrer"
                   className="mt-4 w-full bg-ink text-paper rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 active:scale-[.98] transition">
                  <span className="text-volt">▶</span> Ver el vídeo
                </a>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'sesiones' && training.length === 0 && <p className="text-muted text-[14px]">Sin entrenamientos aún.</p>}
      {tab === 'sesiones' && training.map(s => {
        const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
        return (
          <div key={s.id} className="card p-5 mb-3">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] text-ink flex items-center gap-2 flex-wrap">
                  {s.type}
                  {s.goal && /[[]En casa[]]/i.test(s.goal) && <span className="chip bg-volt text-ink">🏠 En casa</span>}
                  {s.goal && /[[]En club[]]/i.test(s.goal) && <span className="chip bg-ink text-paper">⚽ En club</span>}
                </div>
                <div className="text-[12px] text-muted tnum">{s.date}{s.goal ? ` · ${s.goal.replace(/^\s*[[](En casa|En club)[]]\s*/i, '')}` : ''}</div>
              </div>
              {s.completed ? <span className="chip bg-volt text-ink">✓ Hecho</span>
                : <button onClick={() => complete(s)} className="btn-ink text-[12px] px-4 py-2">Marcar hecho</button>}
            </div>
            {exs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                {exs.map((e, i) => (
                  <div key={e.id} className="flex items-start gap-2.5 text-[14px]">
                    <span className="tnum text-muted text-[12px] w-4 mt-0.5">{i + 1}</span>
                    <div><span className="font-medium text-ink">{e.title}</span>
                      {e.video_url && <a href={e.video_url} target="_blank" className="text-ink ml-1.5 underline text-[12px]">vídeo</a>}
                      <div className="text-[12px] text-muted tnum">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {s.player_feedback
              ? <div className="mt-3 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] text-sub">{s.player_feedback}</div>
              : <button onClick={() => feedback(s)} className="mt-3 w-full border border-line rounded-xl py-2.5 text-[13px] font-medium text-sub hover:bg-canvas transition">Dar feedback</button>}
          </div>
        )
      })}
    </div>
  )
}
