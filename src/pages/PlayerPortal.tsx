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

  const now = Date.now()
  const evo = Array.from({ length: 8 }, (_, idx) => {
    const w = 7 - idx, end = now - w * 7 * 86400000, start = end - 7 * 86400000
    return training.filter(s => {
      if (!s.completed) return false
      const d = new Date(s.completed_at || s.date || '').getTime(); return d > start && d <= end
    }).length
  })
  const maxEvo = Math.max(1, ...evo)
  const totalDone = training.filter(s => s.completed).length

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-canvas text-muted">Cargando…</div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-canvas text-sub p-6 text-center">No hay ficha vinculada a tu cuenta.</div>

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[540px] mx-auto px-5 py-7 pb-24 animate-[fadeIn_.4s_ease]">
        <div className="flex justify-between items-center mb-6">
          <span className="font-display font-bold text-[19px] text-ink tracking-tightest">CAMPO</span>
          <button onClick={signOut} className="text-[13px] text-muted">Salir</button>
        </div>

        <div className="rounded-3xl p-7 mb-5 bg-ink text-paper">
          <div className="text-[14px] text-paper/60">Hola, {profile.name.split(' ')[0]}</div>
          <div className="font-display font-bold text-[26px] tracking-tightest mt-1.5">Tu progreso no para.</div>
          <div className="flex gap-8 mt-6">
            <div><div className="stat-num text-paper text-[30px] leading-none">{totalDone}</div><div className="text-[11px] text-paper/50 mt-1.5">Completados</div></div>
            <div><div className="stat-num text-paper text-[30px] leading-none">{training.length}</div><div className="text-[11px] text-paper/50 mt-1.5">Planificados</div></div>
          </div>
        </div>

        <Section title="Entrenamientos">
          {training.length === 0 && <p className="text-muted text-[14px]">Sin entrenamientos aún.</p>}
          {training.slice(0, 6).map(s => {
            const exs = sessionEx.filter(e => e.session_id === s.id).sort((a, b) => a.ord - b.ord)
            return (
              <div key={s.id} className="border border-line rounded-2xl p-4 mb-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-[15px] text-ink">{s.type}</div>
                    <div className="text-[12px] text-muted tnum">{s.date}{s.goal ? ` · ${s.goal}` : ''}</div>
                  </div>
                  {s.completed
                    ? <span className="text-[12px] font-medium text-ink">✓ Hecho</span>
                    : <button onClick={() => completeSession(s)} className="btn-ink text-[12px] px-4 py-2">Marcar hecho</button>}
                </div>
                {exs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                    {exs.map((e, i) => (
                      <div key={e.id} className="flex items-start gap-2.5 text-[14px]">
                        <span className="tnum text-muted text-[12px] w-4 mt-0.5">{i + 1}</span>
                        <div><span className="font-medium text-ink">{e.title}</span>
                          {e.video_url && <a href={e.video_url} target="_blank" className="text-ink ml-1.5 underline">vídeo</a>}
                          <div className="text-[12px] text-muted tnum">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {s.player_feedback
                  ? <div className="mt-3 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] text-sub">{s.player_feedback}</div>
                  : <button onClick={() => giveFeedback(s)} className="mt-3 w-full border border-line rounded-xl py-2.5 text-[13px] font-medium text-sub hover:bg-canvas transition">Dar feedback al coach</button>}
              </div>
            )
          })}
        </Section>

        <Section title="Tareas">
          {tasks.filter(t => !t.done).length === 0 && <p className="text-muted text-[14px]">Sin tareas pendientes.</p>}
          {tasks.filter(t => !t.done).map(t => (
            <div key={t.id} className="flex items-center gap-2 py-3 border-b border-line last:border-0">
              <span className="text-[14px] text-ink flex-1">{t.title || t.description}</span>
              {t.type && <span className="text-[11px] text-muted">{t.type}</span>}
              {t.video_url && <a href={t.video_url} target="_blank" className="text-ink text-[12px] underline">vídeo</a>}
            </div>
          ))}
        </Section>

        <Section title="Tu evolución">
          <p className="text-[12px] text-muted mb-4 -mt-2">Sesiones completadas · 8 semanas</p>
          <div className="flex items-end gap-1.5 h-24 mb-4">
            {evo.map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full rounded-t-[3px] bg-ink" style={{ height: `${Math.max((c / maxEvo) * 100, 3)}%`, opacity: 0.2 + 0.8 * (i / 7) }} />
              </div>
            ))}
          </div>
          <div className="stat-num text-[30px] leading-none">{totalDone}<span className="text-[14px] text-muted font-normal ml-2">sesiones completadas</span></div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-5">
      <h2 className="font-display font-semibold text-[17px] text-ink tracking-tighter2 mb-4">{title}</h2>
      {children}
    </div>
  )
}
