import { useState } from 'react'
import { Player, PosGroup } from '../types/database'

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
      name: name.trim(),
      pos_group: posGroup,
      pos: pos.trim() || null,
      age: age ? parseInt(age) : null,
      club: club.trim() || null,
      status: 'active',
    })
    setBusy(false)
    if ('error' in res && res.error) { setError(res.error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-apple-lg w-full max-w-md p-6">
        <h2 className="font-display font-extrabold text-xl text-ink mb-4">Nuevo jugador</h2>
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2 mb-3">{error}</div>}

        <label className="block text-xs font-bold text-sub mb-1">NOMBRE *</label>
        <input className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 mb-3 outline-none focus:border-campo-violet"
               value={name} onChange={e => setName(e.target.value)} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-sub mb-1">DEMARCACIÓN</label>
            <select className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 outline-none"
                    value={posGroup} onChange={e => setPosGroup(e.target.value as PosGroup)}>
              {POS_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-sub mb-1">POSICIÓN</label>
            <input className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 outline-none focus:border-campo-violet"
                   placeholder="Ej: Central" value={pos} onChange={e => setPos(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-bold text-sub mb-1">EDAD</label>
            <input type="number" className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 outline-none focus:border-campo-violet"
                   value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-sub mb-1">CLUB</label>
            <input className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 outline-none focus:border-campo-violet"
                   value={club} onChange={e => setClub(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sub font-medium">Cancelar</button>
          <button onClick={save} disabled={busy}
                  className="px-5 py-2 bg-ink text-white font-semibold rounded-xl disabled:opacity-60">
            {busy ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
