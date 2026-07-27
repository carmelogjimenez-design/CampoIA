import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

export interface ParsedSession { type: string; goal: string; exercises: { title: string; series?: string; reps?: string; weight?: string }[] }
export interface ParsedTask { title: string; type: string }
export interface ParsedPlan { sessions: ParsedSession[]; tasks: ParsedTask[] }

interface Props { plan: ParsedPlan; playerId: string; coachId: string; onClose: () => void; onDone: () => void }

export default function ExportPlanModal({ plan, playerId, coachId, onClose, onDone }: Props) {
  const [selSessions, setSelSessions] = useState<boolean[]>(plan.sessions.map(() => true))
  const [selTasks, setSelTasks] = useState<boolean[]>(plan.tasks.map(() => true))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const nSessions = selSessions.filter(Boolean).length
  const nTasks = selTasks.filter(Boolean).length

  async function exportAll() {
    setBusy(true)
    // Sesiones seleccionadas
    for (let i = 0; i < plan.sessions.length; i++) {
      if (!selSessions[i]) continue
      const s = plan.sessions[i]
      const { data } = await supabase.from('training_sessions')
        .insert([{ coach_id: coachId, player_id: playerId, date, type: s.type || 'Físico', goal: s.goal || '', completed: false }])
        .select().single()
      if (data && s.exercises?.length) {
        await supabase.from('session_exercises').insert(s.exercises.map((e, j) => ({
          session_id: data.id, coach_id: coachId, player_id: playerId,
          title: e.title, series: e.series || null, reps: e.reps || null, weight: e.weight || null,
          ord: j, done: false,
        })))
      }
    }
    // Tareas seleccionadas
    const tasksToAdd = plan.tasks.filter((_, i) => selTasks[i])
    if (tasksToAdd.length) {
      await supabase.from('tasks').insert(tasksToAdd.map(t => ({
        coach_id: coachId, player_id: playerId, title: t.title, description: t.title,
        type: t.type || 'Mental', priority: 'normal', done: false,
      })))
    }
    setBusy(false); setDone(true)
    setTimeout(() => { onDone(); onClose() }, 1200)
  }

  return (
    <Modal title="Convertir en plan" onClose={onClose} wide>
      {done ? (
        <div className="py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-volt flex items-center justify-center text-ink text-[24px] mx-auto mb-4">✓</div>
          <p className="text-ink font-medium text-[16px]">¡Añadido al jugador!</p>
          <p className="text-muted text-[13px] mt-1">{nSessions} sesiones · {nTasks} tareas</p>
        </div>
      ) : (
        <>
          <p className="text-sub text-[14px] mb-5">He detectado esto en la respuesta de la IA. Elige qué añadir al jugador:</p>

          {plan.sessions.length > 0 && (
            <div className="mb-5">
              <div className="eyebrow mb-3">Entrenamientos · {plan.sessions.length}</div>
              <div className="space-y-2">
                {plan.sessions.map((s, i) => (
                  <button key={i} onClick={() => setSelSessions(v => v.map((x, j) => j === i ? !x : x))}
                          className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${selSessions[i] ? 'border-ink bg-canvas' : 'border-line'}`}>
                    <span className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 ${selSessions[i] ? 'bg-volt border-volt text-ink' : 'border-line-strong'}`}>{selSessions[i] && '✓'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="chip">{s.type}</span><span className="text-[14px] font-medium text-ink">{s.goal}</span></div>
                      {s.exercises?.length > 0 && <div className="text-[12px] text-muted mt-1">{s.exercises.length} ejercicios: {s.exercises.map(e => e.title).slice(0, 3).join(', ')}{s.exercises.length > 3 ? '…' : ''}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {plan.tasks.length > 0 && (
            <div className="mb-5">
              <div className="eyebrow mb-3">Tareas · {plan.tasks.length}</div>
              <div className="space-y-2">
                {plan.tasks.map((t, i) => (
                  <button key={i} onClick={() => setSelTasks(v => v.map((x, j) => j === i ? !x : x))}
                          className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${selTasks[i] ? 'border-ink bg-canvas' : 'border-line'}`}>
                    <span className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center ${selTasks[i] ? 'bg-volt border-volt text-ink' : 'border-line-strong'}`}>{selTasks[i] && '✓'}</span>
                    <span className="chip">{t.type}</span><span className="text-[14px] text-ink">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5 bg-canvas rounded-xl p-3">
            <span className="text-[13px] text-sub">Fecha de las sesiones:</span>
            <input type="date" className="bg-paper border border-line rounded-lg px-3 py-1.5 text-[13px] outline-none" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-line">Cancelar</button>
            <button onClick={exportAll} disabled={busy || (nSessions + nTasks === 0)} className="btn-volt">
              {busy ? 'Añadiendo…' : `Añadir ${nSessions + nTasks} elementos`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// Parser: extrae el bloque <CAMPO_DATA> y lo separa del texto visible
export function parsePlan(text: string): { visible: string; plan: ParsedPlan | null } {
  const match = text.match(/<CAMPO_DATA>([\s\S]*?)<\/CAMPO_DATA>/)
  if (!match) return { visible: text, plan: null }
  const visible = text.replace(/<CAMPO_DATA>[\s\S]*?<\/CAMPO_DATA>/, '').trim()
  try {
    const parsed = JSON.parse(match[1].trim())
    const plan: ParsedPlan = { sessions: parsed.sessions ?? [], tasks: parsed.tasks ?? [] }
    if (!plan.sessions.length && !plan.tasks.length) return { visible, plan: null }
    return { visible, plan }
  } catch { return { visible, plan: null } }
}
