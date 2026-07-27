import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCoachData } from '../hooks/useCoachData'
import PlayersView from '../components/PlayersView'
import TrainingView from '../components/TrainingView'
import TasksView from '../components/TasksView'
import MatchesView from '../components/MatchesView'
import MetricsView from '../components/MetricsView'
import CalendarView from '../components/CalendarView'
import VideoAnalysisView from '../components/VideoAnalysisView'
import MessagesView from '../components/MessagesView'
import HabitsView from '../components/HabitsView'
import AICoachView from '../components/AICoachView'
import ReportsView from '../components/ReportsView'

const NAV = [
  { section: 'General', items: [['players', 'Jugadores']] },
  { section: 'Planificación', items: [['training', 'Entrenamientos'], ['calendar', 'Calendario'], ['tasks', 'Tareas']] },
  { section: 'Competición', items: [['matches', 'Partidos'], ['metrics', 'Métricas']] },
  { section: 'Seguimiento', items: [['habits', 'Bienestar'], ['messages', 'Mensajes'], ['vanalysis', 'Vídeo']] },
  { section: 'Herramientas', items: [['ai', 'IA Coach'], ['reports', 'Informes']] },
]

export default function CoachDashboard() {
  const { signOut } = useAuth()
  const [view, setView] = useState('players')
  const data = useCoachData()
  const coachId = data.coachId ?? ''

  function render() {
    if (data.loading) return <div className="text-muted text-[15px]">Cargando…</div>
    switch (view) {
      case 'players': return <PlayersView />
      case 'training': return <TrainingView players={data.players} training={data.training} sessionEx={data.sessionEx} coachId={coachId} onReload={data.reload} />
      case 'calendar': return <CalendarView players={data.players} training={data.training} />
      case 'tasks': return <TasksView players={data.players} tasks={data.tasks} coachId={coachId} onReload={data.reload} />
      case 'matches': return <MatchesView players={data.players} matches={data.matches} coachId={coachId} onReload={data.reload} />
      case 'metrics': return <MetricsView players={data.players} training={data.training} matches={data.matches} />
      case 'habits': return <HabitsView players={data.players} coachId={coachId} />
      case 'messages': return <MessagesView players={data.players} coachId={coachId} />
      case 'vanalysis': return <VideoAnalysisView players={data.players} coachId={coachId} />
      case 'ai': return <AICoachView players={data.players} />
      case 'reports': return <ReportsView players={data.players} />
      default: return <PlayersView />
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="w-[228px] shrink-0 flex flex-col px-4 py-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-3 pb-8">
          <div className="w-8 h-8 rounded-[10px] bg-ink flex items-center justify-center">
            <span className="text-paper font-display font-bold text-[15px] tracking-tightest">C</span>
          </div>
          <span className="font-display font-bold text-[17px] text-ink tracking-tightest">CAMPO</span>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.section} className="mb-6">
              <div className="eyebrow px-3 mb-2">{group.section}</div>
              {group.items.map(([id, label]) => (
                <button key={id} onClick={() => setView(id)}
                        className={`w-full text-left px-3 py-2 rounded-[10px] text-[14px] mb-0.5 transition ${
                          view === id ? 'bg-paper text-ink font-medium shadow-apple' : 'text-sub hover:text-ink font-normal'}`}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button onClick={signOut} className="text-[13px] text-muted hover:text-ink px-3 py-2 text-left transition">
          Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 px-10 py-9 max-w-[1200px]">{render()}</main>
    </div>
  )
}
