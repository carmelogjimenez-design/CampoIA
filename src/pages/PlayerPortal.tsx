import { useAuth } from '../context/AuthContext'

export default function PlayerPortal() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display font-extrabold text-2xl text-ink">CAMPO</h1>
          <button onClick={signOut} className="text-sm text-slate-400">Salir</button>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-slate-600">Portal del jugador — se migrará en las siguientes fases.</p>
        </div>
      </div>
    </div>
  )
}
