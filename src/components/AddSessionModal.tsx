import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Player, TrainingSession, SessionExercise } from '../types/database'
import { TASK_TEMPLATES } from '../lib/templates'
import Modal from './Modal'

interface Ex { title: string; series: string; reps: string; weight: string; video_url: string }
interface Props {
  players: Player[]; coachId: string; prePlayerId?: string
  editSession?: TrainingSession; editExercises?: SessionExercise[]
  onClose: () => void; onSaved: () => void
}
const TYPES = ['Físico', 'Técnico', 'Táctico', 'Recuperación']

export default function AddSessionModal({ players, coachId, prePlayerId, editSession, editExercises, onClose, onSaved }: Props) {
  const editing = !!editSession
  const [playerId, setPlayerId] = useState(editSession?.player_id ?? prePlayerId ?? players[0]?.id ?? '')
  const [type, setType] = useState(editSession?.type ?? 'Físico')
  const [date, setDate] = useState(editSession?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [goal, setGoal] = useState(editSession?.goal ?? '')
  const [exList, setExList] = useState<Ex[]>([])
  const [ex, setEx] = useState<Ex>({ title: '', series: '', reps: '', weight: '', video_url: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editExercises) setExList(editExercises.map(e => ({
      title: e.title, series: e.series ?? '', reps: e.reps ?? '', weight: e.weight ?? '', video_url: e.video_url ?? '',
    })))
  }, [editExercises])

  function applyTemplate(val: string) {
    if (!val) return
    const [cat, i] = val.split('|')
    const t = TASK_TEMPLATES[cat]?.[parseInt(i)]
    if (t) setEx({ title: t.t, series: t.s, reps: t.r, weight: t.w === '—' ? '' : t.w, video_url: '' })
  }
  function addEx() {
    if (!ex.title.trim()) return
    setExList([...exList, ex]); setEx({ title: '', series: '', reps: '', weight: '', video_url: '' })
  }

  async function save() {
    if (!playerId) return
    setBusy(true)
    let sessionId = editSession?.id
    if (editing) {
      await supabase.from('training_sessions').update({ player_id: playerId, date, type, goal: goal.trim() }).eq('id', sessionId)
      await supabase.from('session_exercises').delete().eq('session_id', sessionId)  // recrear ejercicios
    } else {
      const { data } = await supabase.from('training_sessions')
        .insert([{ coach_id: coachId, player_id: playerId, date, type, goal: goal.trim(), completed: false }]).select().single()
      sessionId = data?.id
    }
    if (exList.length && sessionId) {
      await supabase.from('session_exercises').insert(exList.map((e, i) => ({
        session_id: sessionId, coach_id: coachId, player_id: playerId,
        title: e.title, series: e.series || null, reps: e.reps || null, weight: e.weight || null,
        video_url: e.video_url || null, ord: i, done: false,
      })))
    }
    setBusy(false); onSaved(); onClose()
  }

  return (
    <Modal title={editing ? 'Editar sesión' : 'Nueva sesión'} onClose={onClose} wide>
      <div className="mb-4"><label className="eyebrow block mb-2">Jugador</label>
        <select className="field" value={playerId} onChange={e => setPlayerId(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div><label className="eyebrow block mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-1.5">
            {TYPES.map(t => <button key={t} onClick={() => setType(t)} className={`py-2 rounded-lg text-[12px] font-medium transition ${type === t ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{t}</button>)}
          </div></div>
        <div><label className="eyebrow block mb-2">Fecha</label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>

      <div className="bg-canvas rounded-xl p-4 mb-5">
        <div className="text-[13px] font-semibold text-ink mb-3">Ejercicios {exList.length > 0 && <span className="text-muted font-normal">· {exList.length}</span>}</div>
        <select className="field mb-2 bg-paper" onChange={e => applyTemplate(e.target.value)} value="">
          <option value="">Plantilla rápida…</option>
          {Object.entries(TASK_TEMPLATES).map(([cat, list]) => (
            <optgroup key={cat} label={cat}>{list.map((t, i) => <option key={i} value={`${cat}|${i}`}>{t.t}</option>)}</optgroup>
          ))}
        </select>
        <input className="field mb-2 bg-paper" placeholder="Nombre del ejercicio" value={ex.title} onChange={e => setEx({ ...ex, title: e.target.value })} />
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input className="field bg-paper" placeholder="Series" value={ex.series} onChange={e => setEx({ ...ex, series: e.target.value })} />
          <input className="field bg-paper" placeholder="Reps" value={ex.reps} onChange={e => setEx({ ...ex, reps: e.target.value })} />
          <input className="field bg-paper" placeholder="Peso" value={ex.weight} onChange={e => setEx({ ...ex, weight: e.target.value })} />
        </div>
        <input className="field mb-2 bg-paper" placeholder="Enlace de vídeo (opcional)" value={ex.video_url} onChange={e => setEx({ ...ex, video_url: e.target.value })} />
        <button onClick={addEx} className="btn-line w-full text-[13px]">+ Añadir ejercicio</button>

        {exList.map((e, i) => (
          <EditableExercise key={i} ex={e} index={i}
            onChange={upd => setExList(exList.map((x, j) => j === i ? upd : x))}
            onRemove={() => setExList(exList.filter((_, j) => j !== i))} />
        ))}
      </div>

      <div className="mb-5"><label className="eyebrow block mb-2">Objetivo</label><input className="field" placeholder="Foco de la sesión" value={goal} onChange={e => setGoal(e.target.value)} /></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-line">Cancelar</button><button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : editing ? 'Guardar cambios' : 'Crear sesión'}</button></div>
    </Modal>
  )
}

// Fila de ejercicio editable: se despliega al tocar para editar todos los campos + vídeo
function EditableExercise({ ex, index, onChange, onRemove }: {
  ex: Ex; index: number; onChange: (upd: Ex) => void; onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-paper rounded-lg mt-2 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 text-[13px]">
        <span className="w-5 h-5 rounded bg-ink text-paper flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</span>
        <button onClick={() => setOpen(o => !o)} className="flex-1 text-left min-w-0">
          <span className="font-medium text-ink truncate block">{ex.title || 'Sin nombre'}</span>
        </button>
        <span className="text-[11px] text-muted shrink-0">{[ex.series && ex.series + '×' + ex.reps, ex.weight].filter(Boolean).join(' · ')}</span>
        {ex.video_url && <span title="Tiene vídeo" className="text-[11px] shrink-0">🎬</span>}
        <button onClick={() => setOpen(o => !o)} className="text-muted hover:text-ink shrink-0 text-[13px]">{open ? '▲' : '✎'}</button>
        <button onClick={onRemove} className="text-muted hover:text-ink shrink-0">✕</button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-line">
          <input className="field bg-canvas text-[13px]" placeholder="Nombre del ejercicio" value={ex.title} onChange={e => onChange({ ...ex, title: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className="field bg-canvas text-[13px]" placeholder="Series" value={ex.series} onChange={e => onChange({ ...ex, series: e.target.value })} />
            <input className="field bg-canvas text-[13px]" placeholder="Reps" value={ex.reps} onChange={e => onChange({ ...ex, reps: e.target.value })} />
            <input className="field bg-canvas text-[13px]" placeholder="Peso" value={ex.weight} onChange={e => onChange({ ...ex, weight: e.target.value })} />
          </div>
          <input className="field bg-canvas text-[13px]" placeholder="🎬 Enlace de vídeo (YouTube, Drive…)" value={ex.video_url} onChange={e => onChange({ ...ex, video_url: e.target.value })} />
        </div>
      )}
    </div>
  )
}
