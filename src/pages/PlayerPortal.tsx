import { LoadingScreen, ErrorState } from '../components/States'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayerData } from '../hooks/usePlayerData'
import PortalHome from '../components/portal/PortalHome'
import PortalTraining from '../components/portal/PortalTraining'
import PortalCheckin from '../components/portal/PortalCheckin'
import PortalNutrition from '../components/portal/PortalNutrition'
import PortalChat from '../components/portal/PortalChat'

const TABS: [string, string][] = [
  ['home', 'Inicio'], ['training', 'Entrenos'], ['checkin', 'Bienestar'], ['nutrition', 'Comida'], ['chat', 'Coach'],
]

export default function PlayerPortal() {
  const { signOut } = useAuth()
  const pd = usePlayerData()
  const [tab, setTab] = useState('home')

  if (pd.loading) return <div className="min-h-screen flex items-center justify-center bg-canvas"><LoadingScreen /></div>
  if (pd.error) return <div className="min-h-screen flex items-center justify-center bg-canvas"><ErrorState message={pd.error} onRetry={pd.reload} /></div>
  if (!pd.profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center mb-4"><span className="text-volt font-display font-bold text-[20px]">C</span></div>
      <p className="text-ink font-medium text-[16px] mb-1">Tu cuenta aún no está vinculada</p>
      <p className="text-sub text-[14px] max-w-xs mb-5">Pídele a tu entrenador que te asocie a tu ficha de jugador para acceder a tu portal.</p>
      <button onClick={signOut} className="btn-line">Cerrar sesión</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[560px] mx-auto px-5 pt-7 pb-28 animate-[fadeIn_.4s_ease]">
        <div className="flex justify-between items-center mb-6">
          <span className="font-display font-bold text-[19px] text-ink tracking-tightest">CAMPO</span>
          <button onClick={signOut} className="text-[13px] text-muted">Salir</button>
        </div>

        {tab === 'home' && <PortalHome pd={pd} onGo={setTab} />}
        {tab === 'training' && <PortalTraining pd={pd} />}
        {tab === 'checkin' && <PortalCheckin pd={pd} />}
        {tab === 'nutrition' && <PortalNutrition pd={pd} />}
        {tab === 'chat' && <PortalChat pd={pd} />}

        <div className="text-[10px] text-faint text-center mt-8">©2026 CIMA CIRCUS. Todos los derechos reservados.</div>
      </div>

      {/* Tab bar inferior estilo iOS */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper/80 backdrop-blur-xl border-t border-line">
        <div className="max-w-[560px] mx-auto grid grid-cols-5">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
                    className={`py-3 flex flex-col items-center gap-1 transition ${tab === id ? 'text-ink' : 'text-muted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full transition ${tab === id ? 'bg-volt' : 'bg-transparent'}`} />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
