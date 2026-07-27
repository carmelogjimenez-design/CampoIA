import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import CoachDashboard from './pages/CoachDashboard'
import PlayerPortal from './pages/PlayerPortal'

export default function App() {
  const { session, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Cargando…</div>
      </div>
    )
  }
  if (!session) return <Login />
  if (role === 'player') return <PlayerPortal />
  return <CoachDashboard />
}
