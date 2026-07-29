import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Task } from '../types/database'
import { TASK_TYPES, TASK_PRIORITIES, videoSearchUrl, wantsVideo, cleanUrl } from '../lib/tasks'
import Modal from './Modal'

interface Props {
  task: Task
  players: Player[]
  onClose: () => void
  onSaved: () => void
}

export default function EditTaskModal({ task, players, onClose, onSaved }: Props) {
  const [playerId, setPlayerId] = useState(task.player_id)
  const [title, setTitle] = useState(task.title ?? task.description ?? '')
  const [description, setDescription] = useState(task.description && task.description !== task.title ? task.description : '')
  const [type, setType] = useState(task.type ?? 'Vídeo')
  const [priority, setPriority] = useState(task.priority ?? 'normal')
  const [due, setDue] = useState(task.due_date ?? '')
  const [videoUrl, setVideoUrl] = useState(task.video_url ?? '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const player = players.find(p => p.id === playerId) ?? null
  const showVideo = wantsVideo({ type, title })

  async function save() {
    if (!title.trim()) { setError('El título no puede quedar vacío.'); return }
    setBusy('save'); setError('')
    const { error: err } = await supabase.from('tasks').update({
      player_id: playerId,
      title: title.trim(),
      description: description.trim() || title.trim(),
      type, priority,
      due_date: due || null,
      video_url: cleanUrl(videoUrl),
    }).eq('id', task.id)
    setBusy('')
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  async function remove() {
    setBusy('del')
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    setBusy('')
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Modal title="Editar tarea" onClose={onClose}>
      {error && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {error}</div>}

      <label className="eyebrow block mb-2">Título</label>
      <input className="field mb-4" value={title} onChange={e => setTitle(e.target.value)} />

      <label className="eyebrow block mb-2">Detalle para el jugador <span className="text-faint normal-case tracking-normal">(opcional)</span></label>
      <textarea className="field mb-4" rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Qué tiene que fijarse, cuántas veces, cómo…" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="eyebrow block mb-2">Jugador</label>
          <select className="field" value={playerId} onChange={e => setPlayerId(e.target.value)}>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-2">Tipo</label>
          <select className="field" value={type} onChange={e => setType(e.target.value)}>
            {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="eyebrow block mb-2">Prioridad</label>
          <div className="flex gap-1.5">
            {TASK_PRIORITIES.map(p => (
              <button key={p} onClick={() => setPriority(p)}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium capitalize transition ${priority === p ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-2">Fecha límite</label>
          <input type="date" className="field" value={due} onChange={e => setDue(e.target.value)} />
        </div>
      </div>

      {showVideo && (
        <div className="mb-5">
          <label className="eyebrow block mb-2">Enlace del vídeo</label>
          <input className="field mb-2" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                 placeholder="https://youtube.com/watch?v=…" />
          <div className="flex items-center gap-3">
            <a href={videoSearchUrl(title, player)} target="_blank" rel="noreferrer"
               className="text-[12px] text-ink underline">Buscar en YouTube</a>
            <span className="text-[12px] text-faint">
              {videoUrl ? 'El jugador verá este vídeo dentro de la tarea.' : 'Sin enlace, el jugador solo verá el texto.'}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-5">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-muted hover:text-ink transition">Borrar</button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink">¿Seguro?</span>
            <button onClick={remove} disabled={!!busy} className="text-[13px] font-semibold text-ink underline">
              {busy === 'del' ? '…' : 'Sí, borrar'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[13px] text-muted">No</button>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-line">Cancelar</button>
          <button onClick={save} disabled={!!busy} className="btn-ink">{busy === 'save' ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  )
}
