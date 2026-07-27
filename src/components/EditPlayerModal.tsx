import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, PosGroup } from '../types/database'
import Modal from './Modal'

interface Props { player: Player; onClose: () => void; onSaved: () => void }
const POS_GROUPS: PosGroup[] = ['POR', 'DEF', 'MED', 'DEL']

export default function EditPlayerModal({ player, onClose, onSaved }: Props) {
  const [name, setName] = useState(player.name)
  const [posGroup, setPosGroup] = useState<PosGroup>(player.pos_group ?? 'MED')
  const [pos, setPos] = useState(player.pos ?? '')
  const [age, setAge] = useState(player.age?.toString() ?? '')
  const [club, setClub] = useState(player.club ?? '')
  const [foot, setFoot] = useState(player.foot ?? '')
  const [heightCm, setHeightCm] = useState(player.height_cm?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(player.weight_kg?.toString() ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    await supabase.from('players').update({
      name: name.trim(), pos_group: posGroup, pos: pos.trim() || null,
      age: age ? parseInt(age) : null, club: club.trim() || null, foot: foot.trim() || null,
      height_cm: heightCm ? parseFloat(heightCm) : null, weight_kg: weightKg ? parseFloat(weightKg) : null,
    }).eq('id', player.id)
    setBusy(false); onSaved(); onClose()
  }

  return (
    <Modal title="Editar jugador" onClose={onClose}>
      <div className="mb-4"><label className="eyebrow block mb-2">Nombre</label><input className="field" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Demarcación</label><select className="field" value={posGroup} onChange={e => setPosGroup(e.target.value as PosGroup)}>{POS_GROUPS.map(g => <option key={g}>{g}</option>)}</select></div>
        <div><label className="eyebrow block mb-2">Posición</label><input className="field" value={pos} onChange={e => setPos(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Edad</label><input type="number" className="field" value={age} onChange={e => setAge(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Pie</label><input className="field" value={foot} onChange={e => setFoot(e.target.value)} placeholder="Diestro" /></div>
        <div><label className="eyebrow block mb-2">Club</label><input className="field" value={club} onChange={e => setClub(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Altura (cm)</label><input type="number" className="field" value={heightCm} onChange={e => setHeightCm(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Peso (kg)</label><input type="number" className="field" value={weightKg} onChange={e => setWeightKg(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="btn-line">Cancelar</button><button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : 'Guardar cambios'}</button></div>
    </Modal>
  )
}
