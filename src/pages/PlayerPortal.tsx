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

  if (pd.loading) return <div className="min-h-screen flex items-center justify-center bg-canvas text-muted">Cargando…</div>
  if (!pd.profile) return <div className="min-h-screen flex items-center justify-center bg-canvas text-sub p-6 text-center">No hay ficha vinculada a tu cuenta.</div>

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
