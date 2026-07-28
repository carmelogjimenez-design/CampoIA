import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Task } from '../types/database'
import { getPlayerName, initials } from '../lib/players'
import AddTaskModal from './AddTaskModal'

interface Props { players: Player[]; tasks: Task[]; coachId: string; onReload: () => void }
const TYPE_META: Record<string, string> = { 'Vídeo': '▶', 'Nutrición': '◆', 'Sueño': '☾', 'Mental': '◇' }

export default function TasksView({ players, tasks, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  async function toggle(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id); onReload()
  }
  async function remove(t: Task) {
    await supabase.from('tasks').delete().eq('id', t.id); onReload()
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.player_id === filter)
  const pending = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)
  const pct = filtered.length ? Math.round(done.length / filtered.length * 100) : 0

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow mb-2">Planificación</div>
          <h1 className="h-page text-[26px] sm:text-[40px] leading-none">Tareas</h1>
        </div>
        <button onClick={() => setShow(true)} className="btn-ink">+ Nueva tarea</button>
      </header>

      {/* Barra de progreso + filtro */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] text-sub">{done.length} de {filtered.length} completadas</span>
          <span className="stat-num text-[15px]">{pct}%</span>
        </div>
        <div className="bar-track mb-5"><div className="bar-fill-volt" style={{ width: `${pct}%` }} /></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
          {players.map(p => (
            <button key={p.id} onClick={() => setFilter(p.id)} className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="eyebrow mb-4">Pendientes · {pending.length}</div>
          <div className="space-y-2.5">
            {pending.map(t => <TaskCard key={t.id} t={t} players={players} onToggle={toggle} onRemove={remove} />)}
            {!pending.length && <div className="card p-8 text-center text-muted text-[14px]">Nada pendiente. 🎯</div>}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-4">Completadas · {done.length}</div>
          <div className="space-y-2.5">
            {done.map(t => <TaskCard key={t.id} t={t} players={players} onToggle={toggle} onRemove={remove} />)}
            {!done.length && <div className="card p-8 text-center text-muted text-[14px]">Aún ninguna.</div>}
          </div>
        </div>
      </div>

      {show && <AddTaskModal players={players} coachId={coachId} onClose={() => setShow(false)} onSaved={onReload} />}
    </div>
  )
}

function TaskCard({ t, players, onToggle, onRemove }: { t: Task; players: Player[]; onToggle: (t: Task) => void; onRemove: (t: Task) => void }) {
  return (
    <div className={`card p-4 flex items-start gap-3.5 group ${t.done ? 'opacity-60' : ''}`}>
      <button onClick={() => onToggle(t)}
              className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition ${t.done ? 'bg-volt border-volt text-ink' : 'border-line-strong hover:border-ink'}`}>
        {t.done && <span className="text-[12px]">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-medium ${t.done ? 'line-through text-muted' : 'text-ink'}`}>{t.title || t.description}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-canvas flex items-center justify-center text-[8px] font-semibold text-sub">{initials(getPlayerName(players, t.player_id))}</div>
            <span className="text-[12px] text-muted">{getPlayerName(players, t.player_id).split(' ')[0]}</span>
          </div>
          {t.type && <span className="text-[11px] text-sub">{TYPE_META[t.type] ?? '•'} {t.type}</span>}
          {t.video_url && <a href={t.video_url} target="_blank" className="text-[11px] text-ink underline">vídeo</a>}
        </div>
      </div>
      <button onClick={() => onRemove(t)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink transition text-[13px]">✕</button>
    </div>
  )
}
