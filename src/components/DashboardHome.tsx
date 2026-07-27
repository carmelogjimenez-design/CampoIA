import { useEffect, useState } from 'react'
import { Player, TrainingSession, Task, Match, Message } from '../types/database'
import { supabase } from '../lib/supabase'
import { getPlayerName, initials } from '../lib/players'

interface Data {
  coachId: string | null; players: Player[]; training: TrainingSession[]
  tasks: Task[]; matches: Match[]
}
interface Props { data: Data; onGo: (v: string) => void }

export default function DashboardHome({ data, onGo }: Props) {
  const { players, training, tasks, matches, coachId } = data
  const [recentMsgs, setRecentMsgs] = useState<Message[]>([])

  useEffect(() => {
    if (!coachId) return
    supabase.from('messages').select('*').eq('coach_id', coachId)
      .order('created_at', { ascending: false }).limit(4)
      .then(({ data }) => setRecentMsgs((data as Message[]) ?? []))
  }, [coachId])

  const now = new Date()
  const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10)
  const sessionsThisWeek = training.filter(t => (t.date ?? '') >= weekStart).length
  const pendingTasks = tasks.filter(t => !t.done).length
  const completed = training.filter(t => t.completed).length
  const adherence = training.length ? Math.round(completed / training.length * 100) : 0

  const upcoming = training
    .filter(t => !t.completed && (t.date ?? '') >= now.toISOString().slice(0, 10))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 5)

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-8">
        <div className="eyebrow mb-2">{greeting}</div>
        <h1 className="h-page text-[40px] leading-none">Resumen</h1>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Jugadores" value={players.length} onClick={() => onGo('players')} />
        <Kpi label="Sesiones · 7 días" value={sessionsThisWeek} onClick={() => onGo('training')} />
        <Kpi label="Tareas pendientes" value={pendingTasks} accent={pendingTasks > 0} onClick={() => onGo('tasks')} />
        <Kpi label="Adherencia" value={`${adherence}%`} big onClick={() => onGo('metrics')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas sesiones */}
        <div className="lg:col-span-2 card p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-[18px] tracking-tighter2">Próximas sesiones</h2>
            <button onClick={() => onGo('calendar')} className="text-[13px] text-sub hover:text-ink transition">Ver calendario →</button>
          </div>
          {upcoming.length === 0 && <p className="text-muted text-[14px]">No hay sesiones planificadas. <button onClick={() => onGo('training')} className="text-ink font-medium">Crea una</button>.</p>}
          <div className="space-y-1">
            {upcoming.map(s => (
              <button key={s.id} onClick={() => onGo('training')} className="w-full flex items-center gap-4 py-3 border-b border-line last:border-0 text-left hover:opacity-70 transition">
                <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-[12px] font-semibold text-sub shrink-0">
                  {initials(getPlayerName(players, s.player_id))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink">{getPlayerName(players, s.player_id)}</div>
                  <div className="text-[12px] text-muted">{s.type}</div>
                </div>
                <div className="text-[13px] text-sub tnum">{s.date?.slice(5)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lateral: mensajes + accesos */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-[16px] tracking-tighter2">Mensajes</h2>
              <button onClick={() => onGo('messages')} className="text-[12px] text-sub hover:text-ink">Ver →</button>
            </div>
            {recentMsgs.length === 0 && <p className="text-muted text-[13px]">Sin mensajes recientes.</p>}
            <div className="space-y-3">
              {recentMsgs.map(m => (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0">
                    {initials(getPlayerName(players, m.player_id))}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">{getPlayerName(players, m.player_id)}</div>
                    <div className="text-[12px] text-muted truncate">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-ink rounded-2xl p-6 text-paper">
            <div className="text-[13px] text-paper/60 mb-3">Acción rápida</div>
            <button onClick={() => onGo('training')} className="btn-volt w-full mb-2 justify-center">+ Nueva sesión</button>
            <button onClick={() => onGo('matches')} className="w-full border border-paper/20 text-paper rounded-full py-2.5 text-sm font-medium hover:bg-paper/10 transition">+ Registrar partido</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, onClick, accent, big }: { label: string; value: number | string; onClick?: () => void; accent?: boolean; big?: boolean }) {
  return (
    <button onClick={onClick} className={`card p-6 text-left hover:shadow-apple-lg transition-shadow ${big ? 'relative overflow-hidden' : ''}`}>
      {big && <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-volt/20" />}
      <div className={`stat-num text-[40px] leading-none ${accent ? 'text-ink' : ''}`}>
        {value}{accent && <span className="inline-block w-2 h-2 rounded-full bg-volt align-top ml-1 mt-1" />}
      </div>
      <div className="text-[13px] text-muted mt-2">{label}</div>
    </button>
  )
}
