import { useEffect, useState } from 'react'
import { Player, TrainingSession, Task, Match, Message } from '../types/database'
import { supabase } from '../lib/supabase'
import { getPlayerName, initials } from '../lib/players'

interface Data {
  coachId: string | null; players: Player[]; training: TrainingSession[]; tasks: Task[]; matches: Match[]
}
interface Props { data: Data; onGo: (v: string) => void }

export default function DashboardHome({ data, onGo }: Props) {
  const { players, training, tasks, matches, coachId } = data
  const [recentMsgs, setRecentMsgs] = useState<Message[]>([])

  useEffect(() => {
    if (!coachId) return
    supabase.from('messages').select('*').eq('coach_id', coachId)
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setRecentMsgs((data as Message[]) ?? []))
  }, [coachId])

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10)
  const sessionsThisWeek = training.filter(t => (t.date ?? '') >= weekStart).length
  const pendingTasks = tasks.filter(t => !t.done).length
  const completed = training.filter(t => t.completed).length
  const adherence = training.length ? Math.round(completed / training.length * 100) : 0

  const upcoming = training.filter(t => !t.completed && (t.date ?? '') >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 4)

  // Actividad últimos 7 días (sesiones completadas por día)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000).toISOString().slice(0, 10)
    const count = training.filter(t => t.completed && (t.completed_at ?? t.date ?? '').slice(0, 10) === d).length
    return { d, count, dow: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(d).getDay()] }
  })
  const maxWeek = Math.max(1, ...week.map(w => w.count))

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const R = 52, C = 2 * Math.PI * R

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-2">{greeting}</div>
          <h1 className="h-page text-[40px] leading-none">Resumen</h1>
        </div>
        <div className="hidden sm:flex gap-2">
          <button onClick={() => onGo('training')} className="btn-volt">+ Nueva sesión</button>
          <button onClick={() => onGo('matches')} className="btn-line">+ Partido</button>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(0,auto)] gap-4">

        {/* HERO — adherencia con anillo (2x2) */}
        <div className="col-span-2 row-span-2 bg-ink rounded-3xl p-8 text-paper relative overflow-hidden flex flex-col justify-between min-h-[340px]">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-volt/10 blur-2xl" />
          <div className="relative">
            <div className="text-[13px] text-paper/50 uppercase tracking-eyebrow font-semibold">Adherencia del equipo</div>
            <div className="text-[15px] text-paper/70 mt-1">{completed} de {training.length} sesiones completadas</div>
          </div>
          <div className="relative flex items-center gap-8">
            <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0 -rotate-90">
              <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
              <circle cx="66" cy="66" r={R} fill="none" stroke="#C9F31D" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C - (adherence / 100) * C}
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div>
              <div className="stat-num text-paper text-[64px] leading-none">{adherence}<span className="text-[32px] text-paper/50">%</span></div>
              <div className="text-[13px] text-paper/50 mt-1">del plan cumplido</div>
            </div>
          </div>
        </div>

        {/* Jugadores */}
        <button onClick={() => onGo('players')} className="card p-6 text-left hover:shadow-apple-lg transition-shadow flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted">Jugadores</span>
            <span className="text-faint group-hover:text-ink">›</span>
          </div>
          <div>
            <div className="stat-num text-[44px] leading-none mb-3">{players.length}</div>
            <div className="flex -space-x-2">
              {players.slice(0, 5).map(p => (
                <div key={p.id} className="w-7 h-7 rounded-full bg-canvas border-2 border-paper flex items-center justify-center text-[9px] font-semibold text-sub">{initials(p.name)}</div>
              ))}
              {players.length > 5 && <div className="w-7 h-7 rounded-full bg-ink border-2 border-paper flex items-center justify-center text-[9px] font-semibold text-paper">+{players.length - 5}</div>}
            </div>
          </div>
        </button>

        {/* Tareas pendientes */}
        <button onClick={() => onGo('tasks')} className="card p-6 text-left hover:shadow-apple-lg transition-shadow flex flex-col justify-between min-h-[160px] relative overflow-hidden">
          {pendingTasks > 0 && <div className="absolute right-5 top-5 w-2.5 h-2.5 rounded-full bg-volt" />}
          <span className="text-[13px] text-muted">Tareas pendientes</span>
          <div>
            <div className="stat-num text-[44px] leading-none">{pendingTasks}</div>
            <div className="text-[12px] text-muted mt-1">{pendingTasks === 0 ? 'Todo al día' : 'por completar'}</div>
          </div>
        </button>

        {/* Sesiones semana + sparkline (2-wide) */}
        <div className="col-span-2 card p-6 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted">Actividad · últimos 7 días</span>
            <span className="stat-num text-[15px]">{sessionsThisWeek} sesiones</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-20 mt-3">
            {week.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div className={`w-full max-w-[28px] rounded-md ${w.count > 0 ? 'bg-ink' : 'bg-canvas'} ${i === 6 && w.count > 0 ? '!bg-volt' : ''}`}
                       style={{ height: `${Math.max((w.count / maxWeek) * 100, 8)}%` }} />
                </div>
                <span className="text-[10px] text-muted">{w.dow}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas sesiones (2-wide, 2-row) */}
        <div className="col-span-2 lg:row-span-2 card p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-[17px] tracking-tighter2">Próximas sesiones</h2>
            <button onClick={() => onGo('calendar')} className="text-[13px] text-sub hover:text-ink transition">Calendario →</button>
          </div>
          {upcoming.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3 text-muted">◷</div>
              <p className="text-muted text-[14px]">No hay sesiones planificadas.</p>
              <button onClick={() => onGo('training')} className="btn-volt mt-4 text-[13px]">+ Crear sesión</button>
            </div>
          )}
          <div className="space-y-1">
            {upcoming.map(s => (
              <button key={s.id} onClick={() => onGo('training')} className="w-full flex items-center gap-3.5 py-3 border-b border-line last:border-0 text-left hover:opacity-70 transition">
                <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-[12px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, s.player_id))}</div>
                <div className="flex-1 min-w-0"><div className="text-[14px] font-medium text-ink truncate">{getPlayerName(players, s.player_id)}</div><div className="text-[12px] text-muted">{s.type}</div></div>
                <div className="chip tnum">{s.date?.slice(5)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mensajes (2-wide) */}
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[15px] tracking-tighter2">Mensajes recientes</h2>
            <button onClick={() => onGo('messages')} className="text-[12px] text-sub hover:text-ink">Ver →</button>
          </div>
          {recentMsgs.length === 0 && <p className="text-muted text-[13px]">Sin mensajes recientes.</p>}
          <div className="space-y-3">
            {recentMsgs.map(m => (
              <div key={m.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, m.player_id))}</div>
                <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-ink">{getPlayerName(players, m.player_id)}</div><div className="text-[12px] text-muted truncate">{m.text}</div></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
