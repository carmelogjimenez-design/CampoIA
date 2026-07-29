import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { UserRole } from '../types/database'
import { getPendingInvite, consumePendingInvite } from '../lib/invite'

interface AuthState {
  session: Session | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null, role: null, loading: true, signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      resolveRole(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      resolveRole(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function resolveRole(s: Session | null) {
    if (!s) { setRole(null); setLoading(false); return }
    // 0. Código de invitación pendiente: ahora que hay sesión, lo canjeamos
    //    y la ficha del jugador queda vinculada a esta cuenta.
    if (getPendingInvite()) await consumePendingInvite()
    // 1. Rol desde los metadatos del usuario (prioritario)
    const metaRole = s.user.user_metadata?.role as UserRole | undefined
    if (metaRole) { setRole(metaRole); setLoading(false); return }
    // 2. ¿Tiene ficha de jugador vinculada?
    const { data: player } = await supabase
      .from('players').select('id').eq('auth_user_id', s.user.id).maybeSingle()
    setRole(player ? 'player' : 'coach')
    setLoading(false)
  }

  async function signOut() { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{ session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
