import { useEffect, useMemo, useState } from 'react'
import {
  AdminUser, AdminStats, AdminPlayer, CoachDetail,
  listUsers, getStats, listPlayers, getCoachDetail,
  suspendUser, activateUser, resetPassword, confirmEmail, deleteUser,
} from '../lib/admin'
import { posLabel } from '../lib/positions'
import { initials } from '../lib/players'
import Modal from './Modal'

type Tab = 'resumen' | 'coaches' | 'jugadores' | 'ia' | 'errores' | 'registro'

const TABS: [Tab, string][] = [
  ['resumen', 'Resumen'], ['coaches', 'Coaches'], ['jugadores', 'Jugadores'],
  ['ia', 'Consumo IA'], ['errores', 'Errores'], ['registro', 'Registro'],
]

const fecha = (s: string | null) => s
  ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
  : '—'
const fechaHora = (s: string) =>
  new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** "hace 3 días" — más útil que una fecha para ver quién está vivo. */
function hace(s: string | null): string {
  if (!s) return 'nunca'
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 864e5)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  if (d < 365) return `hace ${Math.floor(d / 30)} meses`
  return `hace ${Math.floor(d / 365)} años`
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const [u, s, p] = await Promise.all([listUsers(), getStats(), listPlayers()])
      setUsers(u); setStats(s); setPlayers(p)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <div className="bg-ink rounded-3xl p-7 sm:p-9 mb-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-volt/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4">
          <div>
            <div className="eyebrow text-paper/40 mb-2">Panel de control · CAMPO</div>
            <h1 className="font-display font-bold text-paper text-[26px] sm:text-[38px] leading-none tracking-tightest">
              Superadmin
            </h1>
            {stats && (
              <p className="text-paper/50 text-[13px] mt-3">
                {stats.totals.coaches} cuentas · {players.length} jugadores · {stats.totals.ai30} llamadas de IA este mes
              </p>
            )}
          </div>
          <button onClick={load} disabled={loading}
                  className="bg-paper/10 hover:bg-paper/20 text-paper rounded-full px-5 py-2.5 text-[13px] font-medium transition shrink-0">
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="card-line px-4 py-3 mb-5 text-[13px] text-ink">⚠ {error}</div>}

      <div className="flex gap-1.5 mb-7 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition ${
                    tab === id ? 'bg-ink text-paper' : 'bg-paper text-sub border border-line hover:border-line-strong'}`}>
            {label}
            {id === 'coaches' && users.length ? ` · ${users.length}` : ''}
            {id === 'jugadores' && players.length ? ` · ${players.length}` : ''}
            {id === 'errores' && stats?.totals.errors30 ? ` · ${stats.totals.errors30}` : ''}
          </button>
        ))}
      </div>

      {loading && !stats && <p className="text-muted text-[15px]">Cargando…</p>}

      {tab === 'resumen' && stats && <Resumen stats={stats} users={users} players={players} onGo={setTab} />}
      {tab === 'coaches' && <Coaches users={users} players={players} onPick={setCoachId} />}
      {tab === 'jugadores' && <Jugadores players={players} onPickCoach={setCoachId} />}
      {tab === 'ia' && stats && <ConsumoIA stats={stats} users={users} />}
      {tab === 'errores' && stats && <Errores stats={stats} users={users} />}
      {tab === 'registro' && stats && <Registro stats={stats} />}

      {coachId && <CoachModal userId={coachId} onClose={() => setCoachId(null)} onChanged={load} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════════════════════

function Resumen({ stats, users, players, onGo }: {
  stats: AdminStats; users: AdminUser[]; players: AdminPlayer[]; onGo: (t: Tab) => void
}) {
  const t = stats.totals
  const activos30 = users.filter(u =>
    u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 30 * 864e5).length
  const vinculados = players.filter(p => p.linked).length

  const semanas = useMemo(() => {
    const map = new Map<string, number>()
    for (const iso of stats.signups) {
      const d = new Date(iso)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      map.set(d.toISOString().slice(0, 10), (map.get(d.toISOString().slice(0, 10)) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-10)
  }, [stats.signups])
  const maxAltas = Math.max(...semanas.map(s => s[1]), 1)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi v={t.coaches} l="Cuentas" sub={t.suspended ? `${t.suspended} suspendidas` : 'todas activas'} onClick={() => onGo('coaches')} />
        <Kpi v={activos30} l="Activos 30 días" sub={t.coaches ? `${Math.round(activos30 / t.coaches * 100)}% del total` : ''} />
        <Kpi v={players.length} l="Jugadores" sub={`${vinculados} con acceso propio`} onClick={() => onGo('jugadores')} />
        <Kpi v={t.ai30} l="Llamadas IA · 30 días" sub={t.aiFail ? `${t.aiFail} fallidas` : 'sin fallos'} onClick={() => onGo('ia')} />
      </div>

      <Atencion stats={stats} users={users} players={players} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-7">
          <div className="eyebrow mb-5">Altas por semana</div>
          {semanas.length === 0 ? <p className="text-muted text-[14px]">Sin datos.</p> : (
            <div className="flex items-end gap-1.5 h-32">
              {semanas.map(([k, n]) => (
                <div key={k} className="flex-1 flex flex-col items-center gap-2" title={`${k}: ${n}`}>
                  <div className="w-full bg-ink rounded-t-md" style={{ height: `${(n / maxAltas) * 100}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-faint tnum">{k.slice(8, 10)}/{k.slice(5, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-7">
          <div className="eyebrow mb-5">Uso de la plataforma</div>
          <div className="space-y-4">
            {([
              ['Jugadores por cuenta', t.coaches ? (players.length / t.coaches).toFixed(1) : '0'],
              ['Partidos registrados', String(t.matches)],
              ['Sesiones creadas', String(t.sessions)],
              ['Jugadores con portal', `${vinculados} de ${players.length}`],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex items-baseline justify-between">
                <span className="text-[14px] text-sub">{l}</span>
                <span className="stat-num text-[20px]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Atencion({ stats, users, players }: { stats: AdminStats; users: AdminUser[]; players: AdminPlayer[] }) {
  const avisos: { txt: string; grave?: boolean }[] = []

  const sinConfirmar = users.filter(u => !u.email_confirmed)
  if (sinConfirmar.length) avisos.push({
    txt: `${sinConfirmar.length} ${sinConfirmar.length === 1 ? 'cuenta' : 'cuentas'} sin confirmar el correo. Es la causa más común de "no puedo entrar": desde Coaches puedes confirmarlas a mano.`,
  })
  if (stats.totals.suspended) avisos.push({
    txt: `${stats.totals.suspended} ${stats.totals.suspended === 1 ? 'cuenta suspendida' : 'cuentas suspendidas'}.`,
  })
  if (stats.totals.errors30) avisos.push({
    txt: `${stats.totals.errors30} errores registrados en los últimos 30 días.`, grave: true,
  })
  const ratioFallo = stats.usage.length ? stats.usage.filter(r => !r.ok).length / stats.usage.length : 0
  if (ratioFallo > 0.1) avisos.push({
    txt: `${Math.round(ratioFallo * 100)}% de las llamadas a la IA están fallando. Revisa la Edge Function.`, grave: true,
  })
  const dormidas = users.filter(u =>
    u.players > 0 && u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() > 30 * 864e5)
  if (dormidas.length) avisos.push({
    txt: `${dormidas.length} ${dormidas.length === 1 ? 'cuenta lleva' : 'cuentas llevan'} más de un mes sin entrar teniendo jugadores.`,
  })
  const huerfanos = players.filter(p => !p.coach_email)
  if (huerfanos.length) avisos.push({
    txt: `${huerfanos.length} jugadores sin coach asignado. Puede que se borrara la cuenta y quedaran sueltos.`, grave: true,
  })

  if (!avisos.length) return (
    <div className="card p-6 mb-6 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-volt shrink-0" />
      <span className="text-[14px] text-ink">Todo en orden. Nada que requiera tu atención.</span>
    </div>
  )

  return (
    <div className="card p-6 mb-6">
      <div className="eyebrow mb-4">Requiere tu atención</div>
      <div className="space-y-2.5">
        {avisos.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${a.grave ? 'bg-ink' : 'bg-line-strong'}`} />
            <span className="text-[14px] text-sub leading-relaxed">{a.txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kpi({ v, l, sub, onClick }: { v: number | string; l: string; sub?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`card p-6 text-left ${onClick ? 'hover:border-line-strong transition cursor-pointer' : ''}`}>
      <div className="stat-num text-[34px] leading-none">{v}</div>
      <div className="text-[12px] text-muted mt-1.5">{l}</div>
      {sub && <div className="text-[11px] text-faint mt-1">{sub}</div>}
    </Tag>
  )
}

// ════════════════════════════════════════════════════════════
// COACHES
// ════════════════════════════════════════════════════════════

function Coaches({ users, players, onPick }: {
  users: AdminUser[]; players: AdminPlayer[]; onPick: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'suspendidos' | 'sin_confirmar' | 'dormidos'>('todos')

  const vistos = users.filter(u => {
    if (filtro === 'suspendidos' && u.status !== 'suspended') return false
    if (filtro === 'activos' && u.status !== 'active') return false
    if (filtro === 'sin_confirmar' && u.email_confirmed) return false
    if (filtro === 'dormidos') {
      const dias = u.last_sign_in_at ? (Date.now() - new Date(u.last_sign_in_at).getTime()) / 864e5 : 999
      if (dias < 30) return false
    }
    if (!q.trim()) return true
    const t = q.toLowerCase()
    return (u.email ?? '').toLowerCase().includes(t) || (u.name ?? '').toLowerCase().includes(t)
  })

  const jugadoresDe = (id: string) => players.filter(p => p.coach_id === id).length

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input className="field flex-1 min-w-[220px]" value={q} onChange={e => setQ(e.target.value)}
               placeholder="Buscar por correo o nombre…" />
        {([['todos', 'Todos'], ['activos', 'Activos'], ['suspendidos', 'Suspendidos'],
           ['sin_confirmar', 'Sin confirmar'], ['dormidos', 'Inactivos +30d']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setFiltro(id)}
                  className={filtro === id ? 'chip bg-ink text-paper' : 'chip'}>{l}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_repeat(4,.75fr)] gap-4 px-6 py-3 border-b border-line bg-canvas/60">
          {['Coach', 'Estado', 'Jugadores', 'Partidos', 'IA', 'Última conexión'].map(h =>
            <div key={h} className="eyebrow">{h}</div>)}
        </div>

        {vistos.map(u => (
          <button key={u.user_id} onClick={() => onPick(u.user_id)}
                  className="w-full text-left grid grid-cols-2 md:grid-cols-[2fr_1fr_repeat(4,.75fr)] gap-4 px-5 md:px-6 py-4 border-b border-line last:border-0 hover:bg-canvas/50 transition">
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
              {!u.email_confirmed && <span className="chip" title="No ha confirmado el correo">✉</span>}
            </div>
            <Cell label="Jugadores" v={jugadoresDe(u.user_id)} />
            <Cell label="Partidos" v={u.matches} />
            <Cell label="IA" v={u.ai_calls} />
            <div className="flex flex-col justify-center">
              <span className="md:hidden text-[11px] text-muted">Última conexión</span>
              <span className="text-[13px] text-sub">{hace(u.last_sign_in_at)}</span>
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
// JUGADORES
// ════════════════════════════════════════════════════════════

function Jugadores({ players, onPickCoach }: {
  players: AdminPlayer[]; onPickCoach: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'vinculados' | 'sin_vincular' | 'inactivos'>('todos')
  const [coach, setCoach] = useState('all')

  const coaches = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of players) if (p.coach_id) m.set(p.coach_id, p.coach_email ?? p.coach_name ?? p.coach_id)
    return Array.from(m.entries())
  }, [players])

  const vistos = players.filter(p => {
    if (coach !== 'all' && p.coach_id !== coach) return false
    if (filtro === 'vinculados' && !p.linked) return false
    if (filtro === 'sin_vincular' && p.linked) return false
    if (filtro === 'inactivos' && p.matches + p.sessions > 0) return false
    if (!q.trim()) return true
    const t = q.toLowerCase()
    return p.name.toLowerCase().includes(t)
      || (p.club ?? '').toLowerCase().includes(t)
      || (p.coach_email ?? '').toLowerCase().includes(t)
  })

  return (
    <>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <input className="field flex-1 min-w-[220px]" value={q} onChange={e => setQ(e.target.value)}
               placeholder="Buscar por jugador, club o coach…" />
        {([['todos', 'Todos'], ['vinculados', 'Con portal'], ['sin_vincular', 'Sin portal'],
           ['inactivos', 'Sin actividad']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setFiltro(id)}
                  className={filtro === id ? 'chip bg-ink text-paper' : 'chip'}>{l}</button>
        ))}
      </div>

      {coaches.length > 1 && (
        <div className="flex gap-1.5 mb-4 flex-wrap items-center">
          <span className="eyebrow mr-1">Coach</span>
          <button onClick={() => setCoach('all')} className={coach === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
          {coaches.map(([id, email]) => (
            <button key={id} onClick={() => setCoach(id)}
                    className={coach === id ? 'chip bg-ink text-paper' : 'chip'}>{email.split('@')[0]}</button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.7fr_1.5fr_repeat(4,.7fr)] gap-4 px-6 py-3 border-b border-line bg-canvas/60">
          {['Jugador', 'Coach', 'Partidos', 'Sesiones', 'Portal', 'Último check-in'].map(h =>
            <div key={h} className="eyebrow">{h}</div>)}
        </div>

        {vistos.map(p => (
          <div key={p.id} className="grid grid-cols-2 md:grid-cols-[1.7fr_1.5fr_repeat(4,.7fr)] gap-4 px-5 md:px-6 py-4 border-b border-line last:border-0">
            <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0 overflow-hidden">
                {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : initials(p.name)}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">{p.name}</div>
                <div className="text-[12px] text-muted truncate">
                  {posLabel(p.pos, p.pos_group)}{p.age ? ` · ${p.age} años` : ''}{p.club ? ` · ${p.club}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center min-w-0">
              {p.coach_email ? (
                <button onClick={() => onPickCoach(p.coach_id)}
                        className="text-[13px] text-sub hover:text-ink transition truncate text-left">
                  {p.coach_email}
                </button>
              ) : <span className="chip bg-ink text-paper">Sin coach</span>}
            </div>

            <Cell label="Partidos" v={p.matches} />
            <Cell label="Sesiones" v={p.sessions} />
            <div className="flex items-center">
              {p.linked
                ? <span className="chip bg-volt text-ink">Sí</span>
                : <span className="chip">No</span>}
            </div>
            <div className="flex flex-col justify-center">
              <span className="md:hidden text-[11px] text-muted">Último check-in</span>
              <span className="text-[13px] text-sub">{hace(p.last_checkin)}</span>
            </div>
          </div>
        ))}
        {!vistos.length && <div className="p-12 text-center text-muted text-[14px]">Nada con estos filtros.</div>}
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// FICHA DEL COACH
// ════════════════════════════════════════════════════════════

function CoachModal({ userId, onClose, onChanged }: {
  userId: string; onClose: () => void; onChanged: () => void
}) {
  const [d, setD] = useState<CoachDetail | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [confirmMail, setConfirmMail] = useState('')
  const [razon, setRazon] = useState('')

  useEffect(() => {
    getCoachDetail(userId).then(setD).catch(e => setError(e.message))
  }, [userId])

  async function run(tag: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(tag); setError(''); setMsg('')
    try { await fn(); setMsg(ok); onChanged(); getCoachDetail(userId).then(setD) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy('') }
  }

  if (!d) return (
    <Modal title="Cargando…" onClose={onClose}>
      {error ? <p className="text-[13px] text-ink">⚠ {error}</p> : <p className="text-muted text-[14px]">Un momento…</p>}
    </Modal>
  )

  const p = d.profile
  const email = p?.email ?? ''
  const iaMes = d.usage.filter(u => Date.now() - new Date(u.created_at).getTime() < 30 * 864e5)
  const chars = d.usage.reduce((a, u) => a + (u.prompt_chars ?? 0) + (u.output_chars ?? 0), 0)
  const sesionesHechas = d.sessions.filter(s => s.completed).length

  return (
    <Modal title={p?.name ?? email ?? 'Coach'} onClose={onClose} wide>
      {error && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {error}</div>}
      {msg && <div className="bg-volt/20 border border-volt rounded-xl px-4 py-2.5 mb-4 text-[13px] text-ink">✓ {msg}</div>}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[13px] text-sub">{email}</span>
        {p?.status === 'suspended' && <span className="chip bg-ink text-paper">Suspendido</span>}
        {!d.auth.email_confirmed && <span className="chip">Correo sin confirmar</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([['Jugadores', d.players.length], ['Partidos', p?.matches ?? 0],
           ['Sesiones', `${sesionesHechas}/${d.sessions.length}`], ['Llamadas IA', d.usage.length]] as [string, string | number][])
          .map(([l, v]) => (
            <div key={l} className="bg-canvas rounded-xl p-3.5">
              <div className="stat-num text-[20px] leading-none">{v}</div>
              <div className="text-[11px] text-muted mt-1">{l}</div>
            </div>
          ))}
      </div>

      <div className="card-line p-4 mb-5">
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <Row l="Alta" v={fecha(d.auth.created_at)} />
          <Row l="Última conexión" v={hace(d.auth.last_sign_in_at)} />
          <Row l="IA este mes" v={String(iaMes.length)} />
          <Row l="Tokens consumidos" v={`≈ ${Math.round(chars / 3500)}k`} />
          <Row l="Último partido" v={d.lastMatch ? fecha(d.lastMatch) : '—'} />
          <Row l="Rol" v={p?.role === 'player' ? 'Jugador' : 'Coach'} />
        </div>
        {p?.suspend_reason && <p className="text-[12px] text-muted mt-3">Motivo de la suspensión: {p.suspend_reason}</p>}
      </div>

      {d.players.length > 0 && (
        <div className="mb-5">
          <div className="eyebrow mb-3">Sus jugadores</div>
          <div className="space-y-1.5">
            {d.players.map(pl => (
              <div key={pl.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                <span className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub shrink-0 overflow-hidden">
                  {pl.photo_url ? <img src={pl.photo_url} className="w-full h-full object-cover" /> : initials(pl.name)}
                </span>
                <span className="text-[14px] text-ink flex-1 truncate">{pl.name}</span>
                <span className="text-[12px] text-muted">{posLabel(pl.pos, pl.pos_group)}</span>
                {pl.auth_user_id && <span className="chip bg-volt text-ink">portal</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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
                      async () => { const r = await resetPassword(userId, email); setLink(r.link) },
                      'Enlace de recuperación generado.')}
                    disabled={!!busy} className="btn-line w-full text-[14px]">
              {busy === 'reset' ? '…' : 'Restablecer contraseña'}
            </button>

            {!d.auth.email_confirmed && (
              <button onClick={() => run('confirm', () => confirmEmail(userId, email), 'Correo confirmado.')}
                      disabled={!!busy} className="btn-line w-full text-[14px]">
                {busy === 'confirm' ? '…' : 'Confirmar su correo a mano'}
              </button>
            )}

            {p?.status === 'active' ? (
              <>
                <input className="field text-[13px]" value={razon} onChange={e => setRazon(e.target.value)}
                       placeholder="Motivo de la suspensión (opcional)" />
                <button onClick={() => run('susp', () => suspendUser(userId, email, razon), 'Cuenta suspendida.')}
                        disabled={!!busy} className="btn-ink w-full text-[14px]">
                  {busy === 'susp' ? '…' : 'Suspender cuenta'}
                </button>
              </>
            ) : (
              <button onClick={() => run('act', () => activateUser(userId, email), 'Cuenta reactivada.')}
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
            Se borran sus {d.players.length} jugadores, {p?.matches ?? 0} partidos, {d.sessions.length} sesiones
            y su cuenta. Si solo quieres bloquearle el acceso, suspende en vez de borrar.
          </p>
          <label className="eyebrow block mb-2">Escribe «{email}» para confirmar</label>
          <input className="field mb-4" value={confirmMail} onChange={e => setConfirmMail(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button onClick={() => setBorrando(false)} className="btn-line flex-1">Cancelar</button>
            <button onClick={() => run('del',
                      async () => { await deleteUser(userId, email, confirmMail); onClose() }, 'Cuenta eliminada.')}
                    disabled={busy === 'del' || confirmMail !== email} className="btn-ink flex-1">
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
  const nombre = (id: string | null) => users.find(x => x.user_id === id)?.email ?? 'desconocido'

  const chars = u.reduce((a, r) => a + (r.prompt_chars ?? 0) + (r.output_chars ?? 0), 0)
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
          <p className="text-muted text-[13px] max-w-[380px] mx-auto leading-relaxed">
            El consumo se mide desde que subiste la versión con el registro activado.
            Las llamadas anteriores no quedaron guardadas.
          </p>
        </div>
      )}

      {u.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="eyebrow mb-5">Por cuenta</div>
            {porCoach.slice(0, 10).map(([id, dd]) => (
              <div key={id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <span className="text-[13px] text-ink truncate flex-1 mr-3">{nombre(id === 'null' ? null : id)}</span>
                <span className="text-[12px] text-muted tnum mr-3">{Math.round(dd.chars / 3500)}k tok</span>
                <span className="stat-num text-[15px]">{dd.n}</span>
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
