import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { TASK_TEMPLATES } from '../lib/templates'

interface Ex { title: string; series: string; reps: string; weight: string; video_url: string }
interface Props { players: Player[]; coachId: string; onClose: () => void; onSaved: () => void }

const TYPES = ['Físico', 'Técnico', 'Táctico', 'Recuperación']

export default function AddSessionModal({ players, coachId, onClose, onSaved }: Props) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [type, setType] = useState('Físico')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [goal, setGoal] = useState('')
  const [exList, setExList] = useState<Ex[]>([])
  const [ex, setEx] = useState<Ex>({ title: '', series: '', reps: '', weight: '', video_url: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function applyTemplate(val: string) {
    if (!val) return
    const [cat, i] = val.split('|')
    const t = TASK_TEMPLATES[cat]?.[parseInt(i)]
    if (t) setEx({ title: t.t, series: t.s, reps: t.r, weight: t.w === '—' ? '' : t.w, video_url: '' })
  }
  function addEx() {
    if (!ex.title.trim()) return
    setExList([...exList, ex])
    setEx({ title: '', series: '', reps: '', weight: '', video_url: '' })
  }

  async function save() {
    if (!playerId) { setError('Elige un jugador'); return }
    setBusy(true); setError('')
    const { data, error } = await supabase.from('training_sessions')
      .insert([{ coach_id: coachId, player_id: playerId, date, type, goal: goal.trim(), completed: false }])
      .select().single()
    if (error) { setError(error.message); setBusy(false); return }
    if (exList.length && data) {
      await supabase.from('session_exercises').insert(
        exList.map((e, i) => ({
          session_id: data.id, coach_id: coachId, player_id: playerId,
          title: e.title, series: e.series || null, reps: e.reps || null,
          weight: e.weight || null, video_url: e.video_url || null, ord: i, done: false,
        }))
      )
    }
    setBusy(false); onSaved(); onClose()
  }

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-campo-violet text-sm'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-extrabold text-xl text-ink mb-4">Nueva sesión</h2>
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2 mb-3">{error}</div>}

        <label className="block text-xs font-bold text-slate-600 mb-1">JUGADOR *</label>
        <select className={inp + ' mb-3'} value={playerId} onChange={e => setPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">TIPO</label>
            <select className={inp} value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">FECHA</label>
            <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 mb-2">
          <div className="text-sm font-bold text-ink mb-1">Ejercicios de la sesión</div>
          <select className={inp + ' mb-2'} onChange={e => applyTemplate(e.target.value)} value="">
            <option value="">— Plantilla rápida —</option>
            {Object.entries(TASK_TEMPLATES).map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((t, i) => <option key={i} value={`${cat}|${i}`}>{t.t}</option>)}
              </optgroup>
            ))}
          </select>
          <input className={inp + ' mb-2'} placeholder="Ejercicio" value={ex.title}
                 onChange={e => setEx({ ...ex, title: e.target.value })} />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input className={inp} placeholder="Series" value={ex.series} onChange={e => setEx({ ...ex, series: e.target.value })} />
            <input className={inp} placeholder="Reps" value={ex.reps} onChange={e => setEx({ ...ex, reps: e.target.value })} />
            <input className={inp} placeholder="Peso" value={ex.weight} onChange={e => setEx({ ...ex, weight: e.target.value })} />
          </div>
          <input className={inp + ' mb-2'} placeholder="Vídeo (opcional)" value={ex.video_url}
                 onChange={e => setEx({ ...ex, video_url: e.target.value })} />
          <button onClick={addEx} className="w-full border border-slate-200 rounded-xl py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 mb-3">
            + Añadir ejercicio
          </button>
          {exList.map((e, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 mb-1.5 text-sm">
              <span className="w-5 h-5 rounded bg-campo-blue text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="flex-1 font-medium">{e.title}</span>
              <span className="text-xs text-slate-400">{[e.series && e.series + ' series', e.reps && e.reps + ' reps', e.weight].filter(Boolean).join(' · ')}</span>
              <button onClick={() => setExList(exList.filter((_, j) => j !== i))} className="text-slate-400 text-lg leading-none">×</button>
            </div>
          ))}
        </div>

        <label className="block text-xs font-bold text-slate-600 mb-1 mt-2">OBJETIVO</label>
        <input className={inp + ' mb-5'} placeholder="Foco de la sesión" value={goal} onChange={e => setGoal(e.target.value)} />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium">Cancelar</button>
          <button onClick={save} disabled={busy} className="px-5 py-2 bg-ink text-white font-semibold rounded-xl disabled:opacity-60">
            {busy ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
