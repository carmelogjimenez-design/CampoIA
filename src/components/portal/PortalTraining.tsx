import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { TrainingSession } from '../../types/database'

export default function PortalTraining({ pd }: { pd: PlayerData }) {
  const { training, sessionEx, reload } = pd

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

  return (
    <div>
      <h1 className="h-page text-[28px] mb-5">Mis entrenamientos</h1>
      {training.length === 0 && <p className="text-muted text-[14px]">Sin entrenamientos aún.</p>}
      {training.map(s => {
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
