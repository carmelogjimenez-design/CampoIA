import { useEffect, useMemo, useState } from 'react'
import {
  AdminUser, AdminStats, listUsers, getStats,
  suspendUser, activateUser, resetPassword, confirmEmail, deleteUser,
} from '../lib/admin'
import Modal from './Modal'
import { initials } from '../lib/players'

type Tab = 'resumen' | 'usuarios' | 'ia' | 'errores' | 'registro'

const TABS: [Tab, string][] = [
  ['resumen', 'Resumen'], ['usuarios', 'Usuarios'], ['ia', 'Consumo IA'],
  ['errores', 'Errores'], ['registro', 'Registro'],
]

const fecha = (s: string | null) => s
  ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
  : '—'
const fechaHora = (s: string) =>
  new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<AdminUser | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const [u, s] = await Promise.all([listUsers(), getStats()])
      setUsers(u); setStats(s)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-2">Administración</div>
          <h1 className="h-page text-[26px] sm:text-[40px] leading-none">Superadmin</h1>
        </div>
        <button onClick={load} disabled={loading} className="btn-line">
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      {error && <div className="card-line px-4 py-3 mb-5 text-[13px] text-ink">⚠ {error}</div>}

      <div className="flex gap-1.5 mb-7 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition ${
                    tab === id ? 'bg-ink text-paper' : 'bg-paper text-sub border border-line hover:border-line-strong'}`}>
            {label}
            {id === 'errores' && stats?.totals.errors30 ? ` · ${stats.totals.errors30}` : ''}
          </button>
        ))}
      </div>

      {loading && !stats && <p className="text-muted text-[15px]">Cargando…</p>}

      {tab === 'resumen' && stats && <Resumen stats={stats} users={users} />}
      {tab === 'usuarios' && <Usuarios users={users} onPick={setSel} />}
      {tab === 'ia' && stats && <ConsumoIA stats={stats} users={users} />}
      {tab === 'errores' && stats && <Errores stats={stats} users={users} />}
      {tab === 'registro' && stats && <Registro stats={stats} />}

      {sel && <UserModal u={sel} onClose={() => setSel(null)} onChanged={load} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════════════════════

function Resumen({ stats, users }: { stats: AdminStats; users: AdminUser[] }) {
  const t = stats.totals
  const activos30 = users.filter(u =>
    u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 30 * 864e5).length

  // Altas por semana, últimas 10
  const semanas = useMemo(() => {
    const map = new Map<string, number>()
    for (const iso of stats.signups) {
      const d = new Date(iso)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const k = d.toISOString().slice(0, 10)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-10)
  }, [stats.signups])

  const maxAltas = Math.max(...semanas.map(s => s[1]), 1)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi v={t.coaches} l="Cuentas" sub={t.suspended ? `${t.suspended} suspendidas` : 'todas activas'} />
        <Kpi v={activos30} l="Activos 30 días" sub={t.coaches ? `${Math.round(activos30 / t.coaches * 100)}% del total` : ''} />
        <Kpi v={t.players} l="Jugadores" />
        <Kpi v={t.ai30} l="Llamadas IA · 30 días" sub={t.aiFail ? `${t.aiFail} fallidas en total` : 'sin fallos'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-7">
          <div className="eyebrow mb-5">Altas por semana</div>
          {semanas.length === 0 ? <p className="text-muted text-[14px]">Sin datos.</p> : (
            <div className="flex items-end gap-1.5 h-32">
              {semanas.map(([k, n]) => (
                <div key={k} className="flex-1 flex flex-col items-center gap-2" title={`${k}: ${n}`}>
                  <div className="w-full bg-ink rounded-t-md transition-all"
                       style={{ height: `${(n / maxAltas) * 100}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-faint tnum">{k.slice(8, 10)}/{k.slice(5, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-7">
          <div className="eyebrow mb-5">Contenido creado</div>
          <div className="space-y-4">
            {([['Partidos', t.matches], ['Sesiones', t.sessions], ['Jugadores', t.players]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="flex items-baseline justify-between">
                <span className="text-[14px] text-sub">{l}</span>
                <span className="stat-num text-[22px]">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-faint mt-5 leading-relaxed">
            Media de {t.coaches ? (t.players / t.coaches).toFixed(1) : 0} jugadores por cuenta.
          </p>
        </div>
      </div>
    </>
  )
}

function Kpi({ v, l, sub }: { v: number; l: string; sub?: string }) {
  return (
    <div className="card p-6">
      <div className="stat-num text-[34px] leading-none">{v}</div>
      <div className="text-[12px] text-muted mt-1.5">{l}</div>
      {sub && <div className="text-[11px] text-faint mt-1">{sub}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════

function Usuarios({ users, onPick }: { users: AdminUser[]; onPick: (u: AdminUser) => void }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'coach' | 'player' | 'suspended'>('todos')

  const vistos = users.filter(u => {
    if (filtro === 'suspended' && u.status !== 'suspended') return false
    if ((filtro === 'coach' || filtro === 'player') && u.role !== filtro) return false
    if (!q.trim()) return true
    const t = q.toLowerCase()
    return (u.email ?? '').toLowerCase().includes(t) || (u.name ?? '').toLowerCase().includes(t)
  })

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input className="field flex-1 min-w-[220px]" value={q} onChange={e => setQ(e.target.value)}
               placeholder="Buscar por correo o nombre…" />
        {([['todos', 'Todos'], ['coach', 'Coaches'], ['player', 'Jugadores'], ['suspended', 'Suspendidos']] as const)
          .map(([id, l]) => (
            <button key={id} onClick={() => setFiltro(id)}
                    className={filtro === id ? 'chip bg-ink text-paper' : 'chip'}>{l}</button>
          ))}
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_repeat(4,.7fr)] gap-4 px-6 py-3 border-b border-line bg-canvas/60">
          {['Usuario', 'Estado', 'Jugadores', 'Partidos', 'Llamadas IA', 'Último acceso'].map(h =>
            <div key={h} className="eyebrow">{h}</div>)}
        </div>

        {vistos.map(u => (
          <button key={u.user_id} onClick={() => onPick(u)}
                  className="w-full text-left grid grid-cols-2 md:grid-cols-[2fr_1fr_repeat(4,.7fr)] gap-4 px-5 md:px-6 py-4 border-b border-line last:border-0 hover:bg-canvas/50 transition">
            <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0">
                {initials(u.name ?? u.email ?? '?')}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">{u.name ?? '—'}</div>
                <div className="text-[12px] text-muted truncate">{u.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {u.status === 'suspended'
                ? <span className="chip bg-ink text-paper">Suspendido</span>
                : <span className="chip">{u.role === 'player' ? 'Jugador' : 'Coach'}</span>}
              {!u.email_confirmed && <span className="chip" title="No ha confirmado el correo">✉ sin confirmar</span>}
            </div>
            <Cell label="Jugadores" v={u.players} />
            <Cell label="Partidos" v={u.matches} />
            <Cell label="IA" v={u.ai_calls} />
            <div className="flex flex-col justify-center">
              <span className="md:hidden text-[11px] text-muted">Último acceso</span>
              <span className="text-[13px] text-sub tnum">{fecha(u.last_sign_in_at)}</span>
            </div>
          </button>
        ))}

        {!vistos.length && <div className="p-12 text-center text-muted text-[14px]">Nada con estos filtros.</div>}
      </div>
    </>
  )
}

function Cell({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="md:hidden text-[11px] text-muted">{label}</span>
      <span className="stat-num text-[16px]">{v}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// FICHA DE USUARIO
// ════════════════════════════════════════════════════════════

function UserModal({ u, onClose, onChanged }: { u: AdminUser; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [confirmMail, setConfirmMail] = useState('')
  const [razon, setRazon] = useState('')

  async function run(tag: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(tag); setError(''); setMsg('')
    try { await fn(); setMsg(ok); onChanged() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy('') }
  }

  return (
    <Modal title={u.name ?? u.email ?? 'Usuario'} onClose={onClose}>
      {error && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {error}</div>}
      {msg && <div className="bg-volt/20 border border-volt rounded-xl px-4 py-2.5 mb-4 text-[13px] text-ink">✓ {msg}</div>}

      <div className="card-line p-4 mb-5">
        <div className="text-[13px] text-sub mb-3">{u.email}</div>
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <Row l="Rol" v={u.role === 'player' ? 'Jugador' : 'Coach'} />
          <Row l="Estado" v={u.status === 'suspended' ? 'Suspendido' : 'Activo'} />
          <Row l="Alta" v={fecha(u.created_at)} />
          <Row l="Último acceso" v={fecha(u.last_sign_in_at)} />
          <Row l="Jugadores" v={String(u.players)} />
          <Row l="Llamadas IA" v={String(u.ai_calls)} />
        </div>
        {u.suspend_reason && <p className="text-[12px] text-muted mt-3">Motivo: {u.suspend_reason}</p>}
      </div>

      {link && (
        <div className="card-line p-4 mb-5">
          <p className="text-[12px] text-sub mb-2">Enlace de recuperación (pásaselo si no le llega el correo):</p>
          <p className="text-[11px] text-ink break-all font-mono bg-canvas rounded-lg p-2.5">{link}</p>
          <button onClick={() => navigator.clipboard.writeText(link)} className="btn-line text-[12px] mt-2">Copiar</button>
        </div>
      )}

      {!borrando ? (
        <>
          <div className="space-y-2 mb-5">
            <button onClick={() => run('reset',
                      async () => { const r = await resetPassword(u.user_id, u.email ?? ''); setLink(r.link) },
                      'Enlace de recuperación generado.')}
                    disabled={!!busy} className="btn-line w-full text-[14px]">
              {busy === 'reset' ? '…' : 'Restablecer contraseña'}
            </button>

            {!u.email_confirmed && (
              <button onClick={() => run('confirm', () => confirmEmail(u.user_id, u.email ?? ''), 'Correo confirmado.')}
                      disabled={!!busy} className="btn-line w-full text-[14px]">
                {busy === 'confirm' ? '…' : 'Confirmar su correo a mano'}
              </button>
            )}

            {u.status === 'active' ? (
              <>
                <input className="field text-[13px]" value={razon} onChange={e => setRazon(e.target.value)}
                       placeholder="Motivo de la suspensión (opcional)" />
                <button onClick={() => run('susp', () => suspendUser(u.user_id, u.email ?? '', razon), 'Cuenta suspendida.')}
                        disabled={!!busy} className="btn-ink w-full text-[14px]">
                  {busy === 'susp' ? '…' : 'Suspender cuenta'}
                </button>
              </>
            ) : (
              <button onClick={() => run('act', () => activateUser(u.user_id, u.email ?? ''), 'Cuenta reactivada.')}
                      disabled={!!busy} className="btn-volt w-full text-[14px]">
                {busy === 'act' ? '…' : 'Reactivar cuenta'}
              </button>
            )}
          </div>

          <button onClick={() => setBorrando(true)}
                  className="text-[13px] text-muted hover:text-ink transition">Eliminar cuenta y todos sus datos</button>
        </>
      ) : (
        <div className="card-line p-5">
          <p className="text-[14px] text-ink font-medium mb-1.5">Esto no se puede deshacer</p>
          <p className="text-[13px] text-sub leading-relaxed mb-4">
            Se borran sus {u.players} jugadores, {u.matches} partidos, {u.sessions} sesiones
            y su cuenta. Si solo quieres bloquearle el acceso, suspende en vez de borrar.
          </p>
          <label className="eyebrow block mb-2">Escribe «{u.email}» para confirmar</label>
          <input className="field mb-4" value={confirmMail} onChange={e => setConfirmMail(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button onClick={() => setBorrando(false)} className="btn-line flex-1">Cancelar</button>
            <button onClick={() => run('del',
                      async () => { await deleteUser(u.user_id, u.email ?? '', confirmMail); onClose() },
                      'Cuenta eliminada.')}
                    disabled={busy === 'del' || confirmMail !== u.email}
                    className="btn-ink flex-1">
              {busy === 'del' ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Row({ l, v }: { l: string; v: string }) {
  return <><span className="text-muted">{l}</span><span className="text-ink text-right">{v}</span></>
}

// ════════════════════════════════════════════════════════════
// CONSUMO DE IA
// ════════════════════════════════════════════════════════════

function ConsumoIA({ stats, users }: { stats: AdminStats; users: AdminUser[] }) {
  const u = stats.usage
  const nombre = (id: string | null) =>
    users.find(x => x.user_id === id)?.email ?? 'desconocido'

  const chars = u.reduce((a, r) => a + (r.prompt_chars ?? 0) + (r.output_chars ?? 0), 0)
  // ~3,5 caracteres por token. Gemini Flash ronda 0,30 $/M tokens de salida.
  const tokens = Math.round(chars / 3.5)
  const coste = (tokens / 1_000_000) * 0.30
  const msMedio = u.length ? Math.round(u.reduce((a, r) => a + (r.ms ?? 0), 0) / u.length) : 0
  const fallos = u.filter(r => !r.ok).length

  const porCoach = useMemo(() => {
    const m = new Map<string, { n: number; chars: number; fail: number }>()
    for (const r of u) {
      const k = r.coach_id ?? 'null'
      const p = m.get(k) ?? { n: 0, chars: 0, fail: 0 }
      p.n++; p.chars += (r.prompt_chars ?? 0) + (r.output_chars ?? 0); if (!r.ok) p.fail++
      m.set(k, p)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].n - a[1].n)
  }, [u])

  const porModo = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of u) m.set(r.mode ?? '—', (m.get(r.mode ?? '—') ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [u])

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi v={u.length} l="Llamadas · 30 días" />
        <Kpi v={Math.round(tokens / 1000)} l="Miles de tokens" sub={`≈ ${coste.toFixed(2)} $`} />
        <Kpi v={msMedio} l="Milisegundos de media" />
        <Kpi v={fallos} l="Fallidas" sub={u.length ? `${Math.round(fallos / u.length * 100)}%` : ''} />
      </div>

      {!u.length && (
        <div className="card p-12 text-center">
          <p className="text-ink text-[15px] font-medium mb-1.5">Todavía sin registros</p>
          <p className="text-muted text-[13px] max-w-[360px] mx-auto leading-relaxed">
            El consumo se empieza a medir desde que subes esta versión. Las llamadas anteriores no quedaron registradas.
          </p>
        </div>
      )}

      {u.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="eyebrow mb-5">Por cuenta</div>
            {porCoach.slice(0, 10).map(([id, d]) => (
              <div key={id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <span className="text-[13px] text-ink truncate flex-1 mr-3">{nombre(id === 'null' ? null : id)}</span>
                <span className="text-[12px] text-muted tnum mr-3">{Math.round(d.chars / 3500)}k tok</span>
                <span className="stat-num text-[15px]">{d.n}</span>
              </div>
            ))}
          </div>

          <div className="card p-7">
            <div className="eyebrow mb-5">Por función</div>
            {porModo.map(([modo, n]) => (
              <div key={modo} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <span className="text-[13px] text-ink w-32 shrink-0">{modo}</span>
                <div className="bar-track flex-1">
                  <div className="bar-fill" style={{ width: `${(n / porModo[0][1]) * 100}%` }} />
                </div>
                <span className="stat-num text-[15px] w-10 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-faint mt-5 leading-relaxed">
        El coste es una estimación a partir de los caracteres (≈3,5 por token) y de la tarifa
        pública de Gemini Flash. Para la cifra real, mira la facturación de Google Cloud.
      </p>
    </>
  )
}

// ════════════════════════════════════════════════════════════

function Errores({ stats, users }: { stats: AdminStats; users: AdminUser[] }) {
  const nombre = (id: string | null) => users.find(x => x.user_id === id)?.email ?? '—'
  if (!stats.recentErrors.length) return (
    <div className="card p-12 text-center">
      <p className="text-ink text-[15px] font-medium">Sin errores registrados</p>
      <p className="text-muted text-[13px] mt-1.5">Buena señal.</p>
    </div>
  )
  return (
    <div className="space-y-2.5">
      {stats.recentErrors.map(e => (
        <div key={e.id} className="card p-5">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <span className="chip">{e.context ?? 'sin contexto'}</span>
            <span className="text-[11px] text-faint tnum shrink-0">{fechaHora(e.created_at)}</span>
          </div>
          <p className="text-[14px] text-ink">{e.message}</p>
          {e.detail && <p className="text-[12px] text-muted mt-1.5 font-mono break-all line-clamp-3">{e.detail}</p>}
          <p className="text-[11px] text-faint mt-2">{nombre(e.coach_id)}</p>
        </div>
      ))}
    </div>
  )
}

function Registro({ stats }: { stats: AdminStats }) {
  const ACCION: Record<string, string> = {
    suspend: 'Suspendió', activate: 'Reactivó', reset_password: 'Restableció contraseña',
    confirm_email: 'Confirmó correo', delete_user: 'Eliminó cuenta',
  }
  if (!stats.auditLog.length) return (
    <div className="card p-12 text-center text-muted text-[14px]">Sin acciones registradas todavía.</div>
  )
  return (
    <div className="card overflow-hidden">
      {stats.auditLog.map(a => (
        <div key={a.id} className="flex items-center gap-4 px-6 py-3.5 border-b border-line last:border-0">
          <span className="text-[13px] text-ink w-44 shrink-0">{ACCION[a.action] ?? a.action}</span>
          <span className="text-[13px] text-sub flex-1 truncate">{a.target_email ?? '—'}</span>
          {a.detail && <span className="text-[12px] text-muted truncate max-w-[200px]">{a.detail}</span>}
          <span className="text-[11px] text-faint tnum shrink-0">{fechaHora(a.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
