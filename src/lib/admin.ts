// ════════════════════════════════════════════════════════════
// CAMPO — Cliente del panel de superadmin
// Todo pasa por la Edge Function `admin-api`, que comprueba en
// servidor que eres admin antes de hacer nada. Aquí nunca hay
// claves privilegiadas.
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase'

export interface AdminUser {
  user_id: string
  email: string | null
  name: string | null
  role: string
  status: 'active' | 'suspended'
  created_at: string
  last_seen_at: string | null
  last_sign_in_at: string | null
  email_confirmed: boolean
  suspend_reason: string | null
  players: number
  matches: number
  sessions: number
  ai_calls: number
  last_ai_at: string | null
}

export interface AiUsageRow {
  coach_id: string | null
  mode: string | null
  prompt_chars: number | null
  output_chars: number | null
  ok: boolean
  ms: number | null
  created_at: string
}

export interface AppError {
  id: number
  coach_id: string | null
  context: string | null
  message: string | null
  detail: string | null
  created_at: string
}

export interface AuditRow {
  id: number
  admin_email: string | null
  action: string
  target_email: string | null
  detail: string | null
  created_at: string
}

export interface AdminPlayer {
  id: string
  name: string
  pos: string | null
  pos_group: string | null
  age: number | null
  club: string | null
  category: string | null
  status: string | null
  coach_id: string
  coach_email: string | null
  coach_name: string | null
  photo_url: string | null
  created_at: string
  matches: number
  sessions: number
  last_checkin: string | null
  linked: boolean
}

export interface CoachDetail {
  profile: AdminUser | null
  auth: { last_sign_in_at: string | null; email_confirmed: boolean; created_at: string | null }
  players: { id: string; name: string; pos: string | null; pos_group: string | null; age: number | null; status: string | null; auth_user_id: string | null; photo_url: string | null }[]
  usage: AiUsageRow[]
  lastMatch: string | null
  sessions: { date: string | null; completed: boolean }[]
}

export interface AdminStats {
  totals: {
    coaches: number; suspended: number; players: number; matches: number
    sessions: number; aiTotal: number; ai30: number; aiFail: number; errors30: number
  }
  usage: AiUsageRow[]
  signups: string[]
  recentErrors: AppError[]
  auditLog: AuditRow[]
}

// El nombre que ve uno en el panel de Supabase NO siempre es el endpoint real:
// aquí la función "admin-api" responde en /hyper-action, igual que "ai-coach"
// responde en /hyper-api. Este slug es el que manda.
const ADMIN_ENDPOINT = 'hyper-action'

async function callAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sin sesión.')

  let res: Response
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${ADMIN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    // El navegador dice "Failed to fetch" tanto si la función no existe como
    // si devolvió un error antes de poner las cabeceras CORS. Lo traducimos.
    throw new Error(
      `No se pudo contactar con la Edge Function en /${ADMIN_ENDPOINT}. En Supabase → Edge Functions, ` +
      'comprueba la URL real de la función de admin (la columna URL, no el nombre) y avísame si no coincide. ' +
      'Si coincide, entra en ella y desactiva «Verify JWT with legacy secret».',
    )
  }

  if (res.status === 404) {
    throw new Error(`No hay ninguna función en /${ADMIN_ENDPOINT}. Revisa la columna URL en Supabase → Edge Functions.`)
  }

  let json: Record<string, unknown>
  try {
    json = await res.json()
  } catch {
    throw new Error(`La función respondió ${res.status} sin datos. Mira los Logs de la función en Supabase.`)
  }

  if (json.error) throw new Error(String(json.error))
  if (!res.ok) throw new Error(`Error ${res.status} en la función de admin.`)
  return json as T
}

/** ¿El usuario en sesión es admin? Lo decide la tabla app_admins, no un email en el código. */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}

export const listUsers = () => callAdmin<{ users: AdminUser[] }>('list_users').then(r => r.users)
export const getStats = () => callAdmin<AdminStats>('stats')
export const listPlayers = () => callAdmin<{ players: AdminPlayer[] }>('list_players').then(r => r.players)
export const getCoachDetail = (user_id: string) => callAdmin<CoachDetail>('coach_detail', { user_id })
export const suspendUser = (user_id: string, email: string, reason?: string) =>
  callAdmin('suspend', { user_id, email, reason })
export const activateUser = (user_id: string, email: string) =>
  callAdmin('activate', { user_id, email })
export const confirmEmail = (user_id: string, email: string) =>
  callAdmin('confirm_email', { user_id, email })
export const resetPassword = (user_id: string, email: string) =>
  callAdmin<{ link: string | null }>('reset_password', {
    user_id, email, redirect_to: window.location.origin,
  })
export const deleteUser = (user_id: string, email: string, confirm_email: string) =>
  callAdmin('delete_user', { user_id, email, confirm_email })

// ── Instrumentación ──────────────────────────────────────────

/** Registra una llamada a la IA. Nunca rompe la app si falla. */
export async function logAiUsage(row: {
  mode: string; model?: string; promptChars: number; outputChars: number
  ok: boolean; error?: string; ms: number; playerId?: string
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('ai_usage').insert({
      coach_id: user.id, player_id: row.playerId ?? null,
      mode: row.mode, model: row.model ?? 'gemini-3.6-flash',
      prompt_chars: row.promptChars, output_chars: row.outputChars,
      ok: row.ok, error: row.error ?? null, ms: row.ms,
    })
  } catch { /* la telemetría nunca debe estorbar */ }
}

/** Registra un error para que aparezca en el panel. */
export async function logAppError(context: string, message: string, detail?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('app_errors').insert({
      coach_id: user?.id ?? null, context, message,
      detail: detail?.slice(0, 2000) ?? null,
      url: typeof window !== 'undefined' ? window.location.pathname : null,
    })
  } catch { /* idem */ }
}

/** Marca al coach como visto ahora. Se llama al arrancar. */
export async function touchLastSeen() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('coach_profiles')
      .update({ last_seen_at: new Date().toISOString() }).eq('user_id', user.id)
  } catch { /* idem */ }
}
