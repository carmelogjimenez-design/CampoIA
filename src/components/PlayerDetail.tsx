import { useEffect, useState, useCallback } from 'react'
import { Player, Match, TrainingSession, Task } from '../types/database'
import { supabase } from '../lib/supabase'
import { initials, isGoalkeeper } from '../lib/players'
import { useAuth } from '../context/AuthContext'
import EditPlayerModal from './EditPlayerModal'
import AddSessionModal from './AddSessionModal'
import AddTaskModal from './AddTaskModal'
import AddMatchModal from './AddMatchModal'
import Modal from './Modal'

interface Props { player: Player; onBack: () => void; players?: Player[] }

export default function PlayerDetail({ player: initial, onBack, players = [] }: Props) {
  const { session } = useAuth()
  const coachId = session?.user.id ?? ''
  const [player, setPlayer] = useState(initial)
  const [matches, setMatches] = useState<Match[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [modal, setModal] = useState<null | 'edit' | 'session' | 'task' | 'match' | 'ai' | 'import' | 'report'>(null)
  const gk = isGoalkeeper(player)
  const single = players.length ? players : [player]

  const load = useCallback(async () => {
    const [m, s, t, p] = await Promise.all([
      supabase.from('matches').select('*').eq('player_id', player.id).order('date', { ascending: false }),
      supabase.from('training_sessions').select('*').eq('player_id', player.id).order('date', { ascending: false }),
      supabase.from('tasks').select('*').eq('player_id', player.id).order('created_at', { ascending: false }),
      supabase.from('players').select('*').eq('id', player.id).single(),
    ])
    setMatches((m.data as Match[]) ?? [])
    setSessions((s.data as TrainingSession[]) ?? [])
    setTasks((t.data as Task[]) ?? [])
    if (p.data) setPlayer(p.data as Player)
  }, [player.id])

  useEffect(() => { load() }, [load])

  const totMins = matches.reduce((s, m) => s + (m.mins ?? 0), 0)
  const totGoals = matches.reduce((s, m) => s + (m.goals ?? 0), 0)
  const totAssists = matches.reduce((s, m) => s + (m.assists ?? 0), 0)
  const cleanSheets = matches.filter(m => m.clean_sheet === true).length
  const totConceded = matches.reduce((s, m) => s + (m.conceded ?? 0), 0)
  const called = matches.filter(m => m.called === 'yes' || ['titular', 'suplente', 'no-play'].includes(m.role ?? '')).length
  const stats: [string, number][] = [
    ['Convocatorias', called], ['Minutos', totMins], ['Goles', totGoals], ['Asistencias', totAssists],
    ...(gk ? [['Encajados', totConceded], ['Porterías 0', cleanSheets]] as [string, number][] : []),
  ]

  const base = player.score ?? 70
  const attrs: Record<string, number> = player.ai_attributes ?? {
    Técnica: base - 4, Táctica: base - 7, Físico: base - 10, Mental: base - 2, Velocidad: base - 8, Lectura: base - 5,
  }
  const maxAttr = Math.max(...Object.values(attrs).map(Number))

  const actions: [string, typeof modal, string][] = [
    ['+ Entrenamiento', 'session', 'ink'], ['+ Tarea', 'task', 'line'], ['+ Partido', 'match', 'line'],
    ['Análisis IA', 'ai', 'line'], ['Importar temporada', 'import', 'line'], ['Descargar informe', 'report', 'line'],
  ]

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <button onClick={onBack} className="text-[13px] text-muted hover:text-ink mb-6 transition">← Jugadores</button>

      {/* HERO */}
      <div className="card p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-[80px] h-[80px] rounded-full bg-canvas border border-line flex items-center justify-center font-display font-semibold text-[26px] text-ink overflow-hidden shrink-0">
              {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : initials(player.name)}
            </div>
            <div>
              <h1 className="h-page text-[34px] leading-none">{player.name}</h1>
              <p className="text-sub text-[15px] mt-2.5">
                {player.pos_group ?? '—'}{player.pos ? ` · ${player.pos}` : ''}{player.age ? ` · ${player.age} años` : ''}
                {player.foot ? ` · ${player.foot}` : ''}{player.club ? ` · ${player.club}` : ''}
              </p>
              {(player.height_cm || player.weight_kg) && (
                <p className="text-muted text-[13px] mt-1 tnum">
                  {player.height_cm ? `${player.height_cm} cm` : ''}{player.height_cm && player.weight_kg ? ' · ' : ''}{player.weight_kg ? `${player.weight_kg} kg` : ''}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setModal('edit')} className="btn-line text-[13px] px-4 py-2">Editar</button>
        </div>

        {/* Barra de acciones */}
        <div className="flex flex-wrap gap-2 mt-7 pt-6 border-t border-line">
          {actions.map(([label, m, style]) => (
            <button key={label} onClick={() => setModal(m)}
                    className={style === 'ink' ? 'btn-ink text-[13px] px-4 py-2' : 'btn-line text-[13px] px-4 py-2'}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Competición */}
        <div className="lg:col-span-2 card p-7">
          <div className="eyebrow mb-6">Competición</div>
          <div className="grid grid-cols-2 gap-y-7">
            {stats.map(([label, val], i) => (
              <div key={label}>
                <div className={`stat-num text-[34px] leading-none ${i === 2 && totGoals > 0 ? 'text-ink' : ''}`}>{val}</div>
                <div className="text-[12px] text-muted mt-1.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Atributos */}
        <div className="lg:col-span-3 card p-7">
          <div className="eyebrow mb-6">Atributos</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            {Object.entries(attrs).map(([k, v]) => {
              const val = Math.round(Number(v))
              const isTop = Number(v) === maxAttr
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[14px] text-ink">{k}</span>
                    <span className="stat-num text-[14px]">{val}</span>
                  </div>
                  <div className="bar-track"><div className={isTop ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${Math.min(val, 100)}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Historial reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="eyebrow">Últimas sesiones</div>
            <span className="chip tnum">{sessions.length}</span>
          </div>
          {sessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
              <div><span className="text-[14px] text-ink">{s.type}</span><span className="text-[12px] text-muted ml-2 tnum">{s.date?.slice(5)}</span></div>
              {s.completed ? <span className="chip bg-volt text-ink">Hecho</span> : <span className="chip">Pendiente</span>}
            </div>
          ))}
          {!sessions.length && <p className="text-muted text-[13px]">Sin sesiones aún.</p>}
        </div>
        <div className="card p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="eyebrow">Últimos partidos</div>
            <span className="chip tnum">{matches.length}</span>
          </div>
          {matches.slice(0, 5).map(m => (
            <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
              <div><span className="text-[14px] text-ink">vs {m.rival}</span><span className="text-[12px] text-muted ml-2 tnum">{m.date?.slice(5)}</span></div>
              <div className="flex items-center gap-2">
                {(m.goals ?? 0) > 0 && <span className="chip">{m.goals} G</span>}
                {(m.assists ?? 0) > 0 && <span className="chip">{m.assists} A</span>}
                <span className="stat-num text-[14px]">{m.result || '—'}</span>
              </div>
            </div>
          ))}
          {!matches.length && <p className="text-muted text-[13px]">Sin partidos aún.</p>}
        </div>
      </div>

      {/* Modales */}
      {modal === 'edit' && <EditPlayerModal player={player} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'session' && <AddSessionModal players={single} coachId={coachId} prePlayerId={player.id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'task' && <AddTaskModal players={single} coachId={coachId} prePlayerId={player.id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'match' && <AddMatchModal players={single} coachId={coachId} prePlayerId={player.id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'ai' && <Modal title="Análisis IA" onClose={() => setModal(null)}><p className="text-sub text-[14px]">El análisis con IA se conectará cuando validemos la Edge Function. Lo dejamos preparado en la ficha.</p><div className="flex justify-end mt-6"><button onClick={() => setModal(null)} className="btn-ink">Entendido</button></div></Modal>}
      {modal === 'import' && <Modal title="Importar temporada" onClose={() => setModal(null)}><p className="text-sub text-[14px]">Aquí pegarás el histórico de la temporada y la IA lo estructurará. Pendiente de conectar la Edge Function.</p><div className="flex justify-end mt-6"><button onClick={() => setModal(null)} className="btn-ink">Entendido</button></div></Modal>}
      {modal === 'report' && <Modal title="Descargar informe" onClose={() => setModal(null)}><p className="text-sub text-[14px]">La generación de informe en PDF con los datos del jugador se añadirá en la fase de informes.</p><div className="flex justify-end mt-6"><button onClick={() => setModal(null)} className="btn-ink">Entendido</button></div></Modal>}
    </div>
  )
}
