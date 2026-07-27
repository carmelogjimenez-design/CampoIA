import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Task } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; tasks: Task[]; coachId: string; onReload: () => void }
const TYPES = ['Vídeo', 'Nutrición', 'Sueño', 'Mental']

export default function TasksView({ players, tasks, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Vídeo')
  const [videoUrl, setVideoUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim() || !playerId) return
    setBusy(true)
    await supabase.from('tasks').insert([{
      coach_id: coachId, player_id: playerId, title: title.trim(),
      description: title.trim(), type, priority: 'normal',
      video_url: videoUrl.trim() || null, done: false,
    }])
    setBusy(false); setShow(false); setTitle(''); setVideoUrl(''); onReload()
  }

  async function toggle(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
    onReload()
  }

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-campo-violet text-sm'
  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Tareas</h1>
          <p className="text-slate-500 mt-1">{pending.length} pendientes</p>
        </div>
        <button onClick={() => setShow(true)} className="bg-ink text-white font-semibold rounded-xl px-4 py-2.5">+ Nueva tarea</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-bold text-slate-600 mb-3">PENDIENTES</h2>
          {pending.map(t => <TaskRow key={t.id} t={t} players={players} onToggle={toggle} />)}
          {!pending.length && <p className="text-slate-400 text-sm">Sin pendientes.</p>}
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-600 mb-3">COMPLETADAS</h2>
          {done.map(t => <TaskRow key={t.id} t={t} players={players} onToggle={toggle} />)}
          {!done.length && <p className="text-slate-400 text-sm">Ninguna aún.</p>}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
             onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-display font-extrabold text-xl text-ink mb-4">Nueva tarea</h2>
            <label className="block text-xs font-bold text-slate-600 mb-1">JUGADOR</label>
            <select className={inp + ' mb-3'} value={playerId} onChange={e => setPlayerId(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="block text-xs font-bold text-slate-600 mb-1">TÍTULO *</label>
            <input className={inp + ' mb-3'} value={title} onChange={e => setTitle(e.target.value)} />
            <label className="block text-xs font-bold text-slate-600 mb-1">TIPO</label>
            <select className={inp + ' mb-3'} value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label className="block text-xs font-bold text-slate-600 mb-1">ENLACE DE VÍDEO</label>
            <input className={inp + ' mb-5'} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-slate-500 font-medium">Cancelar</button>
              <button onClick={save} disabled={busy} className="px-5 py-2 bg-ink text-white font-semibold rounded-xl disabled:opacity-60">
                {busy ? '...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ t, players, onToggle }: { t: Task; players: Player[]; onToggle: (t: Task) => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 mb-2 flex items-start gap-3">
      <button onClick={() => onToggle(t)}
              className={`w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
        {t.done && '✓'}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${t.done ? 'line-through text-slate-400' : 'text-ink'}`}>{t.title || t.description}</div>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{getPlayerName(players, t.player_id)}</span>
          {t.type && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t.type}</span>}
          {t.video_url && <a href={t.video_url} target="_blank" className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">▶ Vídeo</a>}
        </div>
      </div>
    </div>
  )
}
