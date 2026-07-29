// ════════════════════════════════════════════════════════════
// CAMPO — Vinculación coach ↔ jugador
// El coach genera un código de 6 caracteres desde la ficha.
// El jugador se registra con ese código y ambos paneles se unen.
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase'

// Sin I, O, 0 ni 1: se dictan por teléfono sin confusiones.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PENDING_KEY = 'campo_pending_invite'

export function generateInviteCode(len = 6): string {
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length]
  return out
}

// ─── Lado coach ──────────────────────────────────────────────

/** Genera y guarda un código nuevo en la ficha. Reintenta si hay colisión. */
export async function assignInviteCode(playerId: string): Promise<{ code?: string; error?: string }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateInviteCode()
    const { data, error } = await supabase
      .from('players')
      .update({ invite_code: code })
      .eq('id', playerId)
      .is('auth_user_id', null)
      .select('invite_code')
      .maybeSingle()

    if (!error) {
      if (!data) return { error: 'Este jugador ya tiene una cuenta vinculada.' }
      return { code: data.invite_code as string }
    }
    if (error.code === '23505') continue // código repetido, probamos otro
    return { error: error.message }
  }
  return { error: 'No se pudo generar un código único. Inténtalo de nuevo.' }
}

/** Anula el código sin tocar la vinculación. */
export async function revokeInviteCode(playerId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('players').update({ invite_code: null }).eq('id', playerId)
  return error ? { error: error.message } : {}
}

/** Rompe la vinculación: el jugador pierde el acceso a su portal. */
export async function unlinkPlayer(playerId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('players')
    .update({ auth_user_id: null, invite_code: null })
    .eq('id', playerId)
  return error ? { error: error.message } : {}
}

// ─── Lado jugador ────────────────────────────────────────────

export type ClaimResult =
  | { ok: true; playerId: string; name?: string; already?: boolean }
  | { ok: false; error: string; code?: string }

const CLAIM_ERRORS: Record<string, string> = {
  NO_SESSION: 'Necesitas iniciar sesión antes de canjear el código.',
  CODE_NOT_FOUND: 'Ese código no existe. Revisa que esté bien escrito.',
  CODE_USED: 'Ese código ya se ha usado. Pídele uno nuevo a tu entrenador.',
}

/** Canjea el código: vincula la ficha del jugador con la cuenta que hay en sesión. */
export async function claimInviteCode(rawCode: string): Promise<ClaimResult> {
  const code = rawCode.trim().toUpperCase()
  if (code.length < 4) return { ok: false, error: 'Introduce el código que te ha dado tu entrenador.' }

  const { data, error } = await supabase.rpc('claim_invite_code', { p_code: code })
  if (error) return { ok: false, error: error.message }

  const res = data as { ok: boolean; error?: string; player_id?: string; name?: string; already?: boolean } | null
  if (!res?.ok) {
    const key = res?.error ?? ''
    return { ok: false, error: CLAIM_ERRORS[key] ?? 'No se pudo vincular el código.', code: key }
  }
  return { ok: true, playerId: res.player_id!, name: res.name, already: res.already }
}

// ─── Código pendiente ────────────────────────────────────────
// Si el registro exige confirmar el correo, no hay sesión todavía y no se
// puede canjear. Lo guardamos y lo canjeamos solo en cuanto haya sesión.

export function setPendingInvite(code: string) {
  try { localStorage.setItem(PENDING_KEY, code.trim().toUpperCase()) } catch { /* modo privado */ }
}
export function getPendingInvite(): string | null {
  try { return localStorage.getItem(PENDING_KEY) } catch { return null }
}
export function clearPendingInvite() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* modo privado */ }
}

/** Canjea el código pendiente si lo hay. Se llama al arrancar con sesión activa. */
export async function consumePendingInvite(): Promise<ClaimResult | null> {
  const code = getPendingInvite()
  if (!code) return null
  const res = await claimInviteCode(code)
  // Si funcionó, o si el código es inválido/usado, no tiene sentido reintentarlo
  // en cada arranque. Solo lo conservamos si falló por no haber sesión aún.
  if (res.ok || res.code !== 'NO_SESSION') clearPendingInvite()
  return res
}
