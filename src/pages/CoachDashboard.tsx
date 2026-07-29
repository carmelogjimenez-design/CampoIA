import { useState, useEffect } from 'react'
import { versionLabel } from '../lib/version'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen, ErrorState, FirstRun } from '../components/States'
import { useCoachData } from '../hooks/useCoachData'
import DashboardHome from '../components/DashboardHome'
import PlayersView from '../components/PlayersView'
import TrainingView from '../components/TrainingView'
import TasksView from '../components/TasksView'
import MatchesView from '../components/MatchesView'
import MetricsView from '../components/MetricsView'
import CalendarView from '../components/CalendarView'
import VideoAnalysisView from '../components/VideoAnalysisView'
import MessagesView from '../components/MessagesView'
import HabitsView from '../components/HabitsView'
import NutritionView from '../components/NutritionView'
import AICoachView from '../components/AICoachView'
import ReportsView from '../components/ReportsView'

const NAV = [
  { section: 'General', items: [['dashboard', 'Dashboard'], ['players', 'Jugadores']] },
  { section: 'Planificación', items: [['training', 'Entrenamientos'], ['calendar', 'Calendario'], ['tasks', 'Tareas']] },
  { section: 'Competición', items: [['matches', 'Partidos'], ['metrics', 'Métricas']] },
  { section: 'Seguimiento', items: [['habits', 'Bienestar'], ['nutrition', 'Alimentación'], ['messages', 'Mensajes'], ['vanalysis', 'Vídeo']] },
  { section: 'Herramientas', items: [['ai', 'IA Coach'], ['reports', 'Informes']] },
]

export default function CoachDashboard() {
  const { signOut } = useAuth()
  const [view, setView] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const data = useCoachData()
  const coachId = data.coachId ?? ''
  const [unread, setUnread] = useState(0)

  const loadUnread = async () => {
    if (!coachId) return
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId).eq('from_role', 'player').eq('read', false)
    const n = count ?? 0
    setUnread(n)
    try { if ('setAppBadge' in navigator) { n > 0 ? (navigator as any).setAppBadge(n) : (navigator as any).clearAppBadge() } } catch {}
  }
  useEffect(() => { loadUnread() }, [coachId, view])

  function render() {
    if (data.loading) return <LoadingScreen />
    if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />
    // Onboarding: sin jugadores, invita a crear el primero (salvo en vistas donde no aplica)
    if (!data.players.length && !['players'].includes(view)) return <FirstRun onAdd={() => setView('players')} />
    switch (view) {
      case 'dashboard': return <DashboardHome data={data} onGo={setView} />
      case 'players': return <PlayersView />
      case 'training': return <TrainingView players={data.players} training={data.training} sessionEx={data.sessionEx} coachId={coachId} onReload={data.reload} />
      case 'calendar': return <CalendarView players={data.players} training={data.training} />
      case 'tasks': return <TasksView players={data.players} tasks={data.tasks} coachId={coachId} onReload={data.reload} />
      case 'matches': return <MatchesView players={data.players} matches={data.matches} coachId={coachId} onReload={data.reload} />
      case 'metrics': return <MetricsView players={data.players} training={data.training} matches={data.matches} />
      case 'habits': return <HabitsView players={data.players} coachId={coachId} />
      case 'nutrition': return <NutritionView players={data.players} coachId={coachId} />
      case 'messages': return <MessagesView players={data.players} coachId={coachId} onRead={loadUnread} />
      case 'vanalysis': return <VideoAnalysisView players={data.players} coachId={coachId} />
      case 'ai': return <AICoachView players={data.players} />
      case 'reports': return <ReportsView players={data.players} />
      default: return <DashboardHome data={data} onGo={setView} />
    }
  }

  function go(id: string) { setView(id); setMenuOpen(false) }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Top bar solo móvil */}
      <div className="lg:hidden sticky top-0 z-30 bg-paper/85 backdrop-blur-xl border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] bg-ink flex items-center justify-center"><span className="text-paper font-display font-bold text-[13px] tracking-tightest">C</span></div>
            <span className="font-display font-bold text-[15px] text-ink tracking-tightest">CAMPO</span>
          </div>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-canvas transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Overlay móvil */}
      {menuOpen && <div className="lg:hidden fixed inset-0 bg-ink/40 z-40 animate-[fadeIn_.2s_ease]" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar: drawer en móvil, fijo en desktop */}
      <aside style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
             className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-[260px] lg:w-[228px] shrink-0 flex flex-col px-4 pb-6 bg-canvas border-r border-line/60 transition-transform duration-300 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3 pb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-ink flex items-center justify-center">
              <span className="text-paper font-display font-bold text-[15px] tracking-tightest">C</span>
            </div>
            <span className="font-display font-bold text-[17px] text-ink tracking-tightest">CAMPO</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-muted hover:text-ink text-[20px] leading-none">✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.section} className="mb-6">
              <div className="eyebrow px-3 mb-2">{group.section}</div>
              {group.items.map(([id, label]) => {
                const active = view === id
                return (
                  <button key={id} onClick={() => go(id)}
                          className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-[10px] text-[14px] mb-0.5 transition ${
                            active ? 'bg-paper text-ink font-semibold shadow-apple' : 'text-sub hover:text-ink'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full transition ${active ? 'bg-volt' : 'bg-transparent'}`} />
                    {label}
                    {id === 'messages' && unread > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-volt text-ink text-[11px] font-bold flex items-center justify-center tabular-nums">{unread > 99 ? '99+' : unread}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="mt-2">
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-2.5 text-[13px] font-medium text-sub hover:bg-canvas hover:text-ink transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </button>
          <div className="text-[10px] text-faint text-center mt-4 leading-relaxed">©2026 CIMA CIRCUS.<br/>Todos los derechos reservados.<br/><span className="tnum">{versionLabel}</span></div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 sm:px-8 xl:px-12 py-6 lg:py-9">
        <div className="max-w-[1400px] mx-auto">{render()}</div>
      </main>
    </div>
  )
}
