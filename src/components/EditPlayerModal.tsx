import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, PosGroup } from '../types/database'
import { countPlayerData, deletePlayer, PlayerFootprint } from '../lib/players'
import Modal from './Modal'
import FieldSelector from './FieldSelector'

interface Props { player: Player; onClose: () => void; onSaved: () => void; onDeleted?: () => void }
const FEET = ['Diestro', 'Zurdo', 'Ambidiestro']

export default function EditPlayerModal({ player, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(player.name)
  const [posGroup, setPosGroup] = useState<PosGroup>(player.pos_group ?? 'MED')
  const [pos, setPos] = useState(player.pos ?? '')
  const [foot, setFoot] = useState(player.foot ?? '')
  const [age, setAge] = useState(player.age?.toString() ?? '')
  const [club, setClub] = useState(player.club ?? '')
  const [rffmId, setRffmId] = useState(player.rffm_id ?? '')
  const [heightCm, setHeightCm] = useState(player.height_cm?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(player.weight_kg?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [footprint, setFootprint] = useState<PlayerFootprint | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [delError, setDelError] = useState('')

  async function openDelete() {
    setDeleting(true); setDelError(''); setConfirmName('')
    setFootprint(await countPlayerData(player.id))
  }

  async function confirmDelete() {
    setBusy(true); setDelError('')
    const res = await deletePlayer(player.id)
    setBusy(false)
    if (res.error) { setDelError(res.error); return }
    onDeleted ? onDeleted() : onSaved()
    onClose()
  }

  async function save() {
    setBusy(true)
    await supabase.from('players').update({
      name: name.trim(), pos_group: posGroup, pos: pos.trim() || null, foot: foot || null,
      age: age ? parseInt(age) : null, club: club.trim() || null,
      rffm_id: rffmId.trim().replace(/\D/g, '') || null,
      height_cm: heightCm ? parseFloat(heightCm) : null, weight_kg: weightKg ? parseFloat(weightKg) : null,
    }).eq('id', player.id)
    setBusy(false); onSaved(); onClose()
  }

  // ── Confirmar borrado ──
  if (deleting) {
    const total = footprint
      ? footprint.matches + footprint.sessions + footprint.tasks + footprint.checkins
        + footprint.nutrition + footprint.tests + footprint.messages + footprint.videos
      : null
    const filas: [string, number][] = footprint ? ([
      ['Partidos', footprint.matches], ['Sesiones', footprint.sessions], ['Tareas', footprint.tasks],
      ['Check-ins', footprint.checkins], ['Comidas', footprint.nutrition], ['Tests físicos', footprint.tests],
      ['Mensajes', footprint.messages], ['Vídeos', footprint.videos],
    ] as [string, number][]).filter(([, n]) => n > 0) : []

    return (
      <Modal title={`Eliminar a ${player.name.split(' ')[0]}`} onClose={() => setDeleting(false)}>
        {delError && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {delError}</div>}

        <p className="text-sub text-[14px] leading-relaxed mb-5">
          Esto borra su ficha y <span className="text-ink font-medium">todo su historial</span>.
          No hay papelera: no se puede deshacer.
        </p>

        {footprint === null && <p className="text-muted text-[14px] mb-5">Contando lo que se perdería…</p>}

        {footprint && (
          <>
            {filas.length > 0 ? (
              <div className="card-line p-4 mb-4">
                <div className="eyebrow mb-3">Se perderán {total} registros</div>
                <div className="grid grid-cols-2 gap-y-1.5">
                  {filas.map(([l, n]) => (
                    <div key={l} className="flex justify-between pr-4 text-[13px]">
                      <span className="text-sub">{l}</span><span className="stat-num">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted text-[13px] mb-4">No tiene historial guardado todavía.</p>
            )}

            {footprint.linked && (
              <div className="card-line p-4 mb-4">
                <p className="text-[13px] text-ink leading-relaxed">
                  ⚠ Tiene cuenta vinculada. Perderá el acceso a su portal y su usuario quedará huérfano.
                  Si solo quieres quitarle el acceso, cierra esto y usa <span className="font-medium">Acceso jugador → Desvincular</span>.
                </p>
              </div>
            )}

            <label className="eyebrow block mb-2">Escribe «{player.name}» para confirmar</label>
            <input className="field mb-5" value={confirmName} autoFocus
                   onChange={e => setConfirmName(e.target.value)}
                   placeholder={player.name} />
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(false)} className="btn-line">Cancelar</button>
          <button onClick={confirmDelete}
                  disabled={busy || confirmName.trim() !== player.name.trim()}
                  className="btn-ink">
            {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Editar jugador" onClose={onClose} wide>
      <div className="mb-4"><label className="eyebrow block mb-2">Nombre</label><input className="field" value={name} onChange={e => setName(e.target.value)} /></div>

      <label className="eyebrow block mb-2">Posición en el campo</label>
      <FieldSelector value={pos} group={posGroup} onChange={(p, g) => { setPos(p); setPosGroup(g) }} />
      <div className="text-center text-[12px] text-muted mt-2 mb-4">{pos ? `${pos} · ${posGroup}` : 'Toca una posición'}</div>

      <label className="eyebrow block mb-2">Pie dominante</label>
      <div className="flex gap-2 mb-4">
        {FEET.map(f => <button key={f} onClick={() => setFoot(f)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${foot === f ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{f}</button>)}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="eyebrow block mb-2">Edad</label><input type="number" className="field" value={age} onChange={e => setAge(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Club</label><input className="field" value={club} onChange={e => setClub(e.target.value)} /></div>
        <div className="col-span-2">
          <label className="eyebrow block mb-2">Ficha RFFM <span className="text-faint normal-case tracking-normal">(opcional)</span></label>
          <input className="field" value={rffmId} inputMode="numeric"
                 onChange={e => setRffmId(e.target.value)}
                 placeholder="15409336 — el número del final de la URL de su ficha" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div><label className="eyebrow block mb-2">Altura (cm)</label><input type="number" className="field" value={heightCm} onChange={e => setHeightCm(e.target.value)} /></div>
        <div><label className="eyebrow block mb-2">Peso (kg)</label><input type="number" className="field" value={weightKg} onChange={e => setWeightKg(e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-5">
        <button onClick={openDelete} className="text-[13px] text-muted hover:text-ink transition">Eliminar jugador</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-line">Cancelar</button>
          <button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  )
}
