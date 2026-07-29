import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { TASK_TYPES, TASK_PRIORITIES, videoSearchUrl, wantsVideo, cleanUrl } from '../lib/tasks'
import Modal from './Modal'

interface Props { players: Player[]; coachId: string; prePlayerId?: string; onClose: () => void; onSaved: () => void }

export default function AddTaskModal({ players, coachId, prePlayerId, onClose, onSaved }: Props) {
  const [playerId, setPlayerId] = useState(prePlayerId ?? players[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('Vídeo')
  const [priority, setPriority] = useState('normal')
  const [due, setDue] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const player = players.find(p => p.id === playerId) ?? null
  const showVideo = wantsVideo({ type, title })

  async function save() {
    if (!title.trim() || !playerId) { setError('Necesito al menos un título y un jugador.'); return }
    setBusy(true); setError('')
    const { error: err } = await supabase.from('tasks').insert([{
      coach_id: coachId, player_id: playerId,
      title: title.trim(),
      description: description.trim() || title.trim(),
      type, priority,
      due_date: due || null,
      video_url: cleanUrl(videoUrl),
      done: false,
    }])
    setBusy(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Modal title="Nueva tarea" onClose={onClose}>
      {error && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {error}</div>}

      <label className="eyebrow block mb-2">Título</label>
      <input className="field mb-4" value={title} onChange={e => setTitle(e.target.value)}
             placeholder="Ej: Ver vídeo de tu último partido" />

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
        <div className="mb-2">
          <label className="eyebrow block mb-2">Enlace del vídeo</label>
          <input className="field mb-2" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                 placeholder="https://youtube.com/watch?v=…" />
          <a href={videoSearchUrl(title || 'técnica', player)} target="_blank" rel="noreferrer"
             className="text-[12px] text-ink underline">Buscar en YouTube</a>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="btn-line">Cancelar</button>
        <button onClick={save} disabled={busy} className="btn-ink">{busy ? '…' : 'Asignar'}</button>
      </div>
    </Modal>
  )
}
