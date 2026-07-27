import { useAuth } from '../context/AuthContext'
import { usePlayerData } from '../hooks/usePlayerData'
import { supabase } from '../lib/supabase'
import { TrainingSession } from '../types/database'

export default function PlayerPortal() {
  const { signOut } = useAuth()
  const { profile, training, sessionEx, tasks, loading, reload } = usePlayerData()

  async function completeSession(s: TrainingSession) {
    if (s.completed) return
    await supabase.from('training_sessions').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', s.id)
    reload()
  }
  async function giveFeedback(s: TrainingSession) {
    const fb = prompt('¿Cómo te fue este entrenamiento?')
    if (!fb?.trim()) return
    await supabase.from('training_sessions').update({ player_feedback: fb.trim() }).eq('id', s.id)
    reload()
  }

  // Evolución: sesiones completadas por semana (8)
  const now = Date.now()
  const evo = Array.from({ length: 8 }, (_, idx) => {
    const w = 7 - idx
    const end = now - w * 7 * 86400000, start = end - 7 * 86400000
    return training.filter(s => {
      if (!s.completed) return false
      const d = new Date(s.completed_at || s.date || '').getTime()
      return d > start && d <= end
    }).length
  })
  const maxEvo = Math.max(1, ...evo)
  const totalDone = training.filter(s => s.completed).length

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando…</div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">No hay ficha vinculada a tu cuenta.</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display font-extrabold text-2xl text-ink">CAMPO</h1>
          <button onClick={signOut} className="text-sm text-slate-400">Salir</button>
        </div>

        {/* Hero */}
        <div className="rounded-2xl p-6 mb-5 bg-gradient-to-br from-campo-violet to-campo-magenta text-white">
          <div className="text-sm opacity-90">Hola, {profile.name.split(' ')[0]}</div>
          <div className="font-display font-extrabold text-2xl mt-1">Tu progreso no para</div>
        </div>

        {/* Entrenamientos */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-ink mb-3">Entrenamientos del coach</h2>
          {training.length === 0 && <p className="text-slate-400 text-sm">Sin entrenamientos aún.</p>}
          {training.slice(0, 6).map(s => {
            const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
            return (
              <div key={s.id} className="bg-slate-50 rounded-xl p-3 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-ink">{s.type}</div>
                    <div className="text-xs text-slate-400">{s.date}{s.goal ? ` · ${s.goal}` : ''}</div>
                  </div>
                  {s.completed
                    ? <span className="text-emerald-600 text-xs font-semibold">✓ Hecho</span>
                    : <button onClick={() => completeSession(s)} className="bg-gradient-to-r from-campo-violet to-campo-magenta text-white text-xs font-semibold rounded-lg px-3 py-1.5">Marcar hecho</button>}
                </div>
                {exs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                    {exs.map((e, i) => (
                      <div key={e.id} className="flex items-start gap-2 text-sm">
                        <span className="w-4 h-4 rounded bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <div><span className="font-medium text-ink">{e.title}</span>
                          {e.video_url && <a href={e.video_url} target="_blank" className="text-red-500 ml-1">▶</a>}
                          <div className="text-xs text-slate-400">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {s.player_feedback
                  ? <div className="mt-2 bg-violet-50 rounded-lg px-3 py-1.5 text-xs text-violet-700">💬 {s.player_feedback}</div>
                  : <button onClick={() => giveFeedback(s)} className="mt-2 w-full bg-slate-100 rounded-lg py-1.5 text-xs font-medium text-slate-500">💬 Dar feedback al coach</button>}
              </div>
            )
          })}
        </div>

        {/* Tareas */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-ink mb-3">Tus tareas</h2>
          {tasks.filter(t => !t.done).length === 0 && <p className="text-slate-400 text-sm">Sin tareas pendientes.</p>}
          {tasks.filter(t => !t.done).map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-ink flex-1">{t.title || t.description}</span>
              {t.type && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t.type}</span>}
              {t.video_url && <a href={t.video_url} target="_blank" className="text-red-500 text-xs">▶</a>}
            </div>
          ))}
        </div>

        {/* Evolución */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-ink mb-1">Tu evolución</h2>
          <p className="text-xs text-slate-400 mb-3">Trabajo completado (últimas 8 semanas)</p>
          <div className="flex items-end gap-1.5 h-20 mb-3">
            {evo.map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className={`w-full rounded-t ${i === evo.length - 1 ? 'bg-gradient-to-b from-campo-violet to-campo-magenta' : 'bg-slate-200'}`}
                     style={{ height: `${Math.max((c / maxEvo) * 100, 4)}%` }} />
              </div>
            ))}
          </div>
          <div className="text-center"><span className="font-display font-bold text-2xl text-ink">{totalDone}</span><span className="text-sm text-slate-400 ml-1">sesiones completadas</span></div>
        </div>
      </div>
    </div>
  )
}
