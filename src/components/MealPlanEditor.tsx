import { useState } from 'react'
import { MealPlan, MealPlanItem } from '../types/database'
import { DAYS, MEAL_TYPES, getActivePlan, updateMealItem, deleteMealItem, addMealItem, deletePlan } from '../lib/mealPlan'
import Modal from './Modal'

export interface PlanState { playerId: string; plan: MealPlan; items: MealPlanItem[] }

export default function PlanEditor({ ps, coachId, onClose, onChanged, onReplace }: { ps: PlanState; coachId: string; onClose: () => void; onChanged: () => void; onReplace: () => void }) {
  const [items, setItems] = useState<MealPlanItem[]>(ps.items)
  const [day, setDay] = useState(0)
  const [newType, setNewType] = useState('Desayuno')
  const [newDesc, setNewDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dayItems = items.filter(i => i.day_index === day)

  async function saveItem(id: string, description: string) {
    await updateMealItem(id, description)
    setItems(v => v.map(i => i.id === id ? { ...i, description } : i)); onChanged()
  }
  async function removeItem(id: string) {
    await deleteMealItem(id); setItems(v => v.filter(i => i.id !== id)); onChanged()
  }
  async function add() {
    if (!newDesc.trim()) return
    await addMealItem(ps.plan.id, ps.playerId, coachId, day, newType, newDesc.trim())
    setNewDesc(''); const active = await getActivePlan(ps.playerId); if (active) setItems(active.items); onChanged()
  }
  async function removePlan() {
    await deletePlan(ps.plan.id); onChanged(); onClose()
  }

  return (
    <Modal title="Plan de alimentación" onClose={onClose} wide>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {DAYS.map((d, i) => <button key={i} onClick={() => setDay(i)} className={`shrink-0 px-3 py-2 rounded-xl text-[12px] font-medium ${day === i ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{d.slice(0, 3)}</button>)}
      </div>

      <div className="space-y-2 mb-5 max-h-[40vh] overflow-y-auto">
        {dayItems.map(it => <EditableRow key={it.id} item={it} onSave={saveItem} onRemove={removeItem} />)}
        {dayItems.length === 0 && <p className="text-muted text-[13px] text-center py-4">Sin comidas para {DAYS[day]}.</p>}
      </div>

      {/* Añadir comida */}
      <div className="bg-canvas rounded-xl p-3 mb-5">
        <div className="text-[12px] font-semibold text-ink mb-2">Añadir comida a {DAYS[day]}</div>
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {MEAL_TYPES.slice(0, 7).map(t => <button key={t} onClick={() => setNewType(t)} className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] ${newType === t ? 'bg-ink text-paper' : 'bg-paper text-sub'}`}>{t}</button>)}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-paper rounded-lg px-3 py-2 text-[13px] outline-none" value={newDesc} onChange={e => setNewDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Descripción de la comida" />
          <button onClick={add} className="btn-ink text-[13px] px-4">Añadir</button>
        </div>
      </div>

      {/* Acciones del plan */}
      <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-muted hover:text-ink">Borrar plan</button>
        ) : (
          <div className="flex items-center gap-2"><span className="text-[13px] text-ink">¿Seguro?</span><button onClick={removePlan} className="text-[13px] font-semibold text-ink underline">Sí, borrar</button><button onClick={() => setConfirmDelete(false)} className="text-[13px] text-muted">No</button></div>
        )}
        <div className="flex gap-2">
          <button onClick={onReplace} className="btn-line text-[13px]">Reemplazar con IA</button>
          <button onClick={onClose} className="btn-ink text-[13px]">Hecho</button>
        </div>
      </div>
    </Modal>
  )
}

function EditableRow({ item, onSave, onRemove }: { item: MealPlanItem; onSave: (id: string, d: string) => void; onRemove: (id: string) => void }) {
  const [val, setVal] = useState(item.description ?? '')
  const [dirty, setDirty] = useState(false)
  return (
    <div className="flex items-start gap-2.5 group">
      <div className="w-24 shrink-0 pt-2"><span className="text-[11px] font-semibold text-ink uppercase tracking-wide">{item.meal_type}</span></div>
      <input className="flex-1 bg-canvas rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-ink" value={val}
             onChange={e => { setVal(e.target.value); setDirty(true) }}
             onBlur={() => { if (dirty) { onSave(item.id, val); setDirty(false) } }} />
      {dirty && <button onClick={() => { onSave(item.id, val); setDirty(false) }} className="text-[11px] text-ink font-semibold pt-2">✓</button>}
      <button onClick={() => onRemove(item.id)} className="text-muted hover:text-ink opacity-0 group-hover:opacity-100 transition pt-2 text-[13px]">✕</button>
    </div>
  )
}
