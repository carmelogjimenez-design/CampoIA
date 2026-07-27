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
  { section: 'Principal', items: [['players', 'Jugadores']] },
  { section: 'Planificación', items: [['training', 'Entrenamientos'], ['calendar', 'Calendario'], ['tasks', 'Tareas']] },
  { section: 'Competición', items: [['matches', 'Partidos'], ['metrics', 'Métricas']] },
  { section: 'Seguimiento', items: [['habits', 'Hábitos'], ['messages', 'Mensajes'], ['vanalysis', 'Vídeo análisis']] },
  { section: 'Herramientas', items: [['ai', 'IA Coach'], ['reports', 'Informes']] },
]

export default function CoachDashboard() {
  const { signOut } = useAuth()
  const [view, setView] = useState('players')
  const data = useCoachData()
  const coachId = data.coachId ?? ''

  function render() {
    if (data.loading) return <p className="text-slate-400">Cargando datos…</p>
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
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 pb-5">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-white font-display font-extrabold">C</span>
          </div>
          <span className="font-display font-extrabold text-lg text-ink">CAMPO</span>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.section} className="mb-4">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider px-3 mb-1 uppercase">{group.section}</div>
              {group.items.map(([id, label]) => (
                <button key={id} onClick={() => setView(id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition ${
                          view === id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button onClick={signOut} className="text-sm text-slate-400 hover:text-red-500 px-3 py-2 text-left">Cerrar sesión</button>
      </aside>
      <main className="flex-1 p-8">{render()}</main>
    </div>
  )
}
