import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { isGoalkeeper } from '../lib/players'
import Modal from './Modal'

interface Props { players: Player[]; coachId: string; prePlayerId?: string; onClose: () => void; onSaved: () => void }

export default function AddMatchModal({ players, coachId, prePlayerId, onClose, onSaved }: Props) {
  const [playerId, setPlayerId] = useState(prePlayerId ?? players[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rival, setRival] = useState('')
  const [result, setResult] = useState('')
  const [mins, setMins] = useState('0')
  const [goals, setGoals] = useState('0')
  const [assists, setAssists] = useState('0')
  const [conceded, setConceded] = useState('0')
  const [cleanSheet, setCleanSheet] = useState('0')
  const [busy, setBusy] = useState(false)
  const gk = isGoalkeeper(players.find(p => p.id === playerId) ?? {} as Player)

  async function save() {
    if (!rival.trim() || !playerId) return
    setBusy(true)
    await supabase.from('matches').insert([{
      coach_id: coachId, player_id: playerId, date, rival: rival.trim(), result: result || null,
      mins: parseInt(mins) || 0, goals: parseInt(goals) || 0, assists: parseInt(assists) || 0,
      conceded: gk ? (parseInt(conceded) || 0) : null, clean_sheet: gk ? cleanSheet === '1' : null,
      called: 'yes', role: 'titular',
    }])
    setBusy(false); onSaved(); onClose()
  }

  return (
    <Modal title="Registrar partido" onClose={onClose}>
      <div className="mb-4"><label className="eyebrow block mb-2">Jugador</label>
        <select className="field" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Fecha</label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Rival</label><input className="field" value={rival} onChange={e => setRival(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Resultado</label><input className="field" placeholder="2-1" value={result} onChange={e => setResult(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Minutos</label><input type="number" className="field" value={mins} onChange={e => setMins(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Goles</label><input type="number" className="field" value={goals} onChange={e => setGoals(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Asistencias</label><input type="number" className="field" value={assists} onChange={e => setAssists(e.target.value)} /></div>
      </div>
      {gk && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="eyebrow block mb-2">Goles encajados</label><input type="number" className="field" value={conceded} onChange={e => setConceded(e.target.value)} /></div>
          <div><label className="eyebrow block mb-2">¿Portería a 0?</label><select className="field" value={cleanSheet} onChange={e => setCleanSheet(e.target.value)}><option value="0">No</option><option value="1">Sí</option></select></div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2"><button onClick={onClose} className="btn-line">Cancelar</button><button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : 'Guardar'}</button></div>
    </Modal>
  )
}
