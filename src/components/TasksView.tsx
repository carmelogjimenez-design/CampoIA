import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Task } from '../types/database'
import { getPlayerName, initials } from '../lib/players'
import AddTaskModal from './AddTaskModal'
import EditTaskModal from './EditTaskModal'
import { TYPE_ICON, wantsVideo, videoSearchUrl, isOverdue, formatDue } from '../lib/tasks'

interface Props { players: Player[]; tasks: Task[]; coachId: string; onReload: () => void }

export default function TasksView({ players, tasks, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [filter, setFilter] = useState<string>('all')

  async function toggle(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id); onReload()
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
            {pending.map(t => <TaskCard key={t.id} t={t} players={players} onToggle={toggle} onEdit={setEditing} />)}
            {!pending.length && <div className="card p-8 text-center text-muted text-[14px]">Nada pendiente. 🎯</div>}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-4">Completadas · {done.length}</div>
          <div className="space-y-2.5">
            {done.map(t => <TaskCard key={t.id} t={t} players={players} onToggle={toggle} onEdit={setEditing} />)}
            {!done.length && <div className="card p-8 text-center text-muted text-[14px]">Aún ninguna.</div>}
          </div>
        </div>
      </div>

      {show && <AddTaskModal players={players} coachId={coachId} onClose={() => setShow(false)} onSaved={onReload} />}
      {editing && <EditTaskModal task={editing} players={players} onClose={() => setEditing(null)} onSaved={onReload} />}
    </div>
  )
}

function TaskCard({ t, players, onToggle, onEdit }: {
  t: Task; players: Player[]; onToggle: (t: Task) => void; onEdit: (t: Task) => void
}) {
  const player = players.find(p => p.id === t.player_id) ?? null
  const overdue = isOverdue(t)
  const hasVideo = wantsVideo(t)

  return (
    <div className={`card p-4 group ${t.done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3.5">
        <button onClick={() => onToggle(t)}
                className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition ${t.done ? 'bg-volt border-volt text-ink' : 'border-line-strong hover:border-ink'}`}>
          {t.done && <span className="text-[12px]">✓</span>}
        </button>

        <button onClick={() => onEdit(t)} className="flex-1 min-w-0 text-left">
          <div className={`text-[14px] font-medium ${t.done ? 'line-through text-muted' : 'text-ink'}`}>
            {t.title || t.description}
          </div>
          {t.description && t.description !== t.title && (
            <div className="text-[12px] text-sub mt-1 leading-relaxed line-clamp-2">{t.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-canvas flex items-center justify-center text-[8px] font-semibold text-sub overflow-hidden">
                {player?.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : initials(getPlayerName(players, t.player_id))}
              </div>
              <span className="text-[12px] text-muted">{getPlayerName(players, t.player_id).split(' ')[0]}</span>
            </div>
            {t.type && <span className="text-[11px] text-sub">{TYPE_ICON[t.type] ?? '•'} {t.type}</span>}
            {t.priority === 'alta' && !t.done && <span className="chip bg-ink text-paper">Prioridad alta</span>}
            {t.due_date && !t.done && (
              <span className={`text-[11px] ${overdue ? 'text-ink font-semibold' : 'text-muted'}`}>
                {overdue ? '⚠ ' : ''}{formatDue(t.due_date)}
              </span>
            )}
          </div>
        </button>

        <button onClick={() => onEdit(t)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink transition text-[12px] shrink-0 mt-0.5">
          Editar
        </button>
      </div>

      {/* Vídeo: enlace real, o búsqueda para que le pongas uno */}
      {hasVideo && !t.done && (
        <div className="mt-3 pt-3 border-t border-line flex items-center gap-3">
          {t.video_url ? (
            <>
              <a href={t.video_url} target="_blank" rel="noreferrer"
                 className="chip bg-ink text-paper hover:opacity-85 transition">▶ Ver vídeo</a>
              <span className="text-[11px] text-faint truncate flex-1">{t.video_url}</span>
            </>
          ) : (
            <>
              <a href={videoSearchUrl(t.title || t.description || '', player)} target="_blank" rel="noreferrer"
                 className="chip hover:bg-line transition">Buscar en YouTube</a>
              <span className="text-[11px] text-faint">Sin enlace: el jugador no verá ningún vídeo.</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
