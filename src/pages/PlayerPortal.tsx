import { LoadingScreen, ErrorState } from '../components/States'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePlayerData } from '../hooks/usePlayerData'
import PortalHome from '../components/portal/PortalHome'
import PortalTraining from '../components/portal/PortalTraining'
import PortalCheckin from '../components/portal/PortalCheckin'
import PortalNutrition from '../components/portal/PortalNutrition'
import PortalChat from '../components/portal/PortalChat'
import { claimInviteCode } from '../lib/invite'

const TABS: [string, string][] = [
  ['home', 'Inicio'], ['training', 'Entrenos'], ['checkin', 'Bienestar'], ['nutrition', 'Comida'], ['chat', 'Coach'],
]

export default function PlayerPortal() {
  const { signOut } = useAuth()
  const pd = usePlayerData()
  const [tab, setTab] = useState('home')
  const [unreadChat, setUnreadChat] = useState(0)
  const [linkCode, setLinkCode] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState('')

  async function link() {
    setLinkBusy(true); setLinkError('')
    const res = await claimInviteCode(linkCode)
    setLinkBusy(false)
    if (!res.ok) { setLinkError(res.error); return }
    await pd.reload()
  }

  const loadUnreadChat = async () => {
    if (!pd.profile) return
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
      .eq('player_id', pd.profile.id).eq('from_role', 'coach').eq('read', false)
    setUnreadChat(count ?? 0)
  }
  useEffect(() => { loadUnreadChat() }, [pd.profile, tab])

  if (pd.loading) return <div className="min-h-screen flex items-center justify-center bg-canvas"><LoadingScreen /></div>
  if (pd.error) return <div className="min-h-screen flex items-center justify-center bg-canvas"><ErrorState message={pd.error} onRetry={pd.reload} /></div>
  if (!pd.profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[340px] text-center">
        <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center mb-4 mx-auto"><span className="text-volt font-display font-bold text-[20px]">C</span></div>
        <p className="text-ink font-medium text-[17px] mb-1.5">Vincula tu ficha</p>
        <p className="text-sub text-[14px] leading-relaxed mb-6">
          Introduce el código de acceso que te ha dado tu entrenador y entrarás en tu portal.
        </p>

        {linkError && (
          <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink text-left">⚠ {linkError}</div>
        )}

        <input className="field text-center tnum text-[21px] tracking-[0.32em] uppercase font-semibold mb-3"
               value={linkCode} maxLength={6} placeholder="ABC123" autoCapitalize="characters" autoComplete="off"
               onChange={e => setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
               onKeyDown={e => e.key === 'Enter' && link()} />

        <button onClick={link} disabled={linkBusy || linkCode.length < 4} className="btn-ink w-full py-3 text-[15px] mb-5">
          {linkBusy ? 'Vinculando…' : 'Vincular mi ficha'}
        </button>

        <p className="text-[12px] text-muted mb-5">
          ¿No tienes código? Pídeselo a tu entrenador: lo genera desde tu ficha en un toque.
        </p>
        <button onClick={signOut} className="text-[13px] text-muted hover:text-ink transition">Cerrar sesión</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[560px] mx-auto px-5 pb-28 animate-[fadeIn_.4s_ease]" style={{ paddingTop: 'max(1.75rem, calc(env(safe-area-inset-top) + 0.75rem))' }}>
        <div className="flex justify-between items-center mb-6">
          <span className="font-display font-bold text-[19px] text-ink tracking-tightest">CAMPO</span>
          <button onClick={signOut} className="text-[13px] text-muted">Salir</button>
        </div>

        {tab === 'home' && <PortalHome pd={pd} onGo={setTab} />}
        {tab === 'training' && <PortalTraining pd={pd} />}
        {tab === 'checkin' && <PortalCheckin pd={pd} />}
        {tab === 'nutrition' && <PortalNutrition pd={pd} />}
        {tab === 'chat' && <PortalChat pd={pd} onRead={loadUnreadChat} />}

        <div className="text-[10px] text-faint text-center mt-8">©2026 CIMA CIRCUS. Todos los derechos reservados.</div>
      </div>

      {/* Tab bar inferior estilo iOS */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper/80 backdrop-blur-xl border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-[560px] mx-auto grid grid-cols-5">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
                    className={`relative py-3 flex flex-col items-center gap-1 transition ${tab === id ? 'text-ink' : 'text-muted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full transition ${tab === id ? 'bg-volt' : 'bg-transparent'}`} />
              <span className="text-[11px] font-medium">{label}</span>
              {id === 'chat' && unreadChat > 0 && (
                <span className="absolute top-1.5 right-[22%] min-w-[16px] h-4 px-1 rounded-full bg-volt text-ink text-[10px] font-bold flex items-center justify-center tabular-nums">{unreadChat > 9 ? '9+' : unreadChat}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
