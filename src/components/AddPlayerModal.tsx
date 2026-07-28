import { useState } from 'react'
import { Player, PosGroup } from '../types/database'
import Modal from './Modal'

interface Props {
  onClose: () => void
  onSave: (input: Partial<Player>) => Promise<{ error?: string } | { data: Player }>
}

const POS_GROUPS: PosGroup[] = ['POR', 'DEF', 'MED', 'DEL']

export default function AddPlayerModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [posGroup, setPosGroup] = useState<PosGroup>('MED')
  const [pos, setPos] = useState('')
  const [age, setAge] = useState('')
  const [club, setClub] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setBusy(true); setError('')
    const res = await onSave({
      name: name.trim(), pos_group: posGroup, pos: pos.trim() || null,
      age: age ? parseInt(age) : null, club: club.trim() || null, status: 'active',
    })
    setBusy(false)
    if ('error' in res && res.error) { setError(res.error); return }
    onClose()
  }

  return (
    <Modal title="Nuevo jugador" onClose={onClose}>
      {error && <div className="bg-canvas border border-line text-ink text-[13px] rounded-xl px-4 py-2.5 mb-4">⚠ {error}</div>}

      <label className="eyebrow block mb-2">Nombre *</label>
      <input className="field mb-4" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del jugador" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="eyebrow block mb-2">Demarcación</label>
          <select className="field" value={posGroup} onChange={e => setPosGroup(e.target.value as PosGroup)}>
            {POS_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-2">Posición</label>
          <input className="field" placeholder="Ej: Central" value={pos} onChange={e => setPos(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div><label className="eyebrow block mb-2">Edad</label><input type="number" className="field" value={age} onChange={e => setAge(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Club</label><input className="field" value={club} onChange={e => setClub(e.target.value)} /></div>
      </div>

      <p className="text-[12px] text-muted mb-5">Podrás añadir foto, posición en el campo, pie dominante y medidas después, desde su ficha.</p>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-line">Cancelar</button>
        <button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : 'Guardar'}</button>
      </div>
    </Modal>
  )
}
