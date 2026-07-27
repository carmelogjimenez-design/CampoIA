import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import Modal from './Modal'

interface Props { players: Player[]; coachId: string; prePlayerId?: string; onClose: () => void; onSaved: () => void }
const TYPES = ['Vídeo', 'Nutrición', 'Sueño', 'Mental']

export default function AddTaskModal({ players, coachId, prePlayerId, onClose, onSaved }: Props) {
  const [playerId, setPlayerId] = useState(prePlayerId ?? players[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Vídeo')
  const [videoUrl, setVideoUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim() || !playerId) return
    setBusy(true)
    await supabase.from('tasks').insert([{
      coach_id: coachId, player_id: playerId, title: title.trim(),
      description: title.trim(), type, priority: 'normal', video_url: videoUrl.trim() || null, done: false,
    }])
    setBusy(false); onSaved(); onClose()
  }

  return (
    <Modal title="Nueva tarea" onClose={onClose}>
      <Field label="Jugador">
        <select className="field" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Título"><input className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Ver vídeo de tu último partido" /></Field>
      <Field label="Tipo">
        <select className="field" value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </Field>
      <Field label="Enlace de vídeo (opcional)"><input className="field" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." /></Field>
      <Actions onClose={onClose} onSave={save} busy={busy} label="Asignar" />
    </Modal>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><label className="eyebrow block mb-2">{label}</label>{children}</div>
}
function Actions({ onClose, onSave, busy, label }: { onClose: () => void; onSave: () => void; busy: boolean; label: string }) {
  return <div className="flex justify-end gap-2 mt-6"><button onClick={onClose} className="btn-line">Cancelar</button><button onClick={onSave} disabled={busy} className="btn-ink">{busy ? '...' : label}</button></div>
}
