import { useEffect, useMemo, useState } from 'react'
import {
  AdminUser, AdminStats, AdminPlayer, CoachDetail, HealthCheck, AdminRow,
  listUsers, getStats, listPlayers, getCoachDetail, getHealth,
  listAdmins, addAdmin, removeAdmin,
  suspendUser, activateUser, resetPassword, confirmEmail, deleteUser,
} from '../lib/admin'
import { posLabel } from '../lib/positions'
import AdminLayout, { AdminSection, buildNav } from './admin/AdminLayout'
import Modal from './Modal'
import {
  Panel, Eyebrow, PageTitle, Metric, Chip, Bar, SearchInput, Filters, Empty, Btn,
  Thead, TableShell, Row, Cell, Num, Avatar, Field, Alert,
  fecha, fechaHora, hace,
} from './admin/ui'

interface Props {
  email: string
  hasCoachData: boolean
  onExit: () => void
  onSignOut: () => void
}

export default function AdminPanel({ email, hasCoachData, onExit, onSignOut }: Props) {
  const [section, setSection] = useState<AdminSection>('resumen')
  const [menuOpen, setMenuOpen] = useState(false)

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

  const avisos = useMemo(() => stats ? contarAvisos(stats, users, players).length : 0, [stats, users, players])

  const nav = buildNav({
    coaches: users.length,
    jugadores: players.length,
    errores: stats?.totals.errors30 ?? 0,
    avisos,
  })

  return (
    <AdminLayout section={section} onSection={setSection} nav={nav} email={email}
                 onExit={hasCoachData ? onExit : undefined} onSignOut={onSignOut}
                 menuOpen={menuOpen} setMenuOpen={setMenuOpen}>

      {error && <div className="mb-6"><Alert tone="danger">⚠ {error}</Alert></div>}
      {loading && !stats && <p className="text-muted text-[15px]">Cargando…</p>}

      {section === 'resumen' && stats && (
        <Resumen stats={stats} users={users} players={players} onGo={setSection} onReload={load} loading={loading} />
      )}
      {section === 'coaches' && <Coaches users={users} players={players} onPick={setCoachId} />}
      {section === 'jugadores' && <Jugadores players={players} onPickCoach={setCoachId} />}
      {section === 'ia' && stats && <ConsumoIA stats={stats} users={users} />}
      {section === 'salud' && <Salud />}
      {section === 'errores' && stats && <Errores stats={stats} users={users} />}
      {section === 'admins' && <Administradores meEmail={email} />}
      {section === 'registro' && stats && <Registro stats={stats} />}

      {coachId && <CoachModal userId={coachId} onClose={() => setCoachId(null)} onChanged={load} />}
    </AdminLayout>
  )
}

// ════════════════════════════════════════════════════════════
// AVISOS — la lógica compartida entre el resumen y el contador
// ════════════════════════════════════════════════════════════

interface Aviso { txt: string; grave?: boolean; ir?: AdminSection }

function contarAvisos(stats: AdminStats, users: AdminUser[], players: AdminPlayer[]): Aviso[] {
  const a: Aviso[] = []

  const sinConfirmar = users.filter(u => !u.email_confirmed)
  if (sinConfirmar.length) a.push({
    txt: `${sinConfirmar.length} ${sinConfirmar.length === 1 ? 'cuenta' : 'cuentas'} sin confirmar el correo. Es la causa más común de "no puedo entrar": puedes confirmarlas a mano.`,
    ir: 'coaches',
  })
  if (stats.totals.suspended) a.push({
    txt: `${stats.totals.suspended} ${stats.totals.suspended === 1 ? 'cuenta suspendida' : 'cuentas suspendidas'}.`,
    ir: 'coaches',
  })
  if (stats.totals.errors30) a.push({
    txt: `${stats.totals.errors30} errores registrados en los últimos 30 días.`, grave: true, ir: 'errores',
  })
  const ratio = stats.usage.length ? stats.usage.filter(r => !r.ok).length / stats.usage.length : 0
  if (ratio > 0.1) a.push({
    txt: `${Math.round(ratio * 100)}% de las llamadas a la IA están fallando. Revisa la Edge Function.`,
    grave: true, ir: 'ia',
  })
  const dormidas = users.filter(u =>
    u.players > 0 && u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() > 30 * 864e5)
  if (dormidas.length) a.push({
    txt: `${dormidas.length} ${dormidas.length === 1 ? 'cuenta lleva' : 'cuentas llevan'} más de un mes sin entrar teniendo jugadores.`,
    ir: 'coaches',
  })
  const huerfanos = players.filter(p => !p.coach_email)
  if (huerfanos.length) a.push({
    txt: `${huerfanos.length} jugadores sin coach asignado. Puede que se borrara una cuenta y quedaran sueltos.`,
    grave: true, ir: 'jugadores',
  })
  const vacios = players.filter(p => p.matches + p.sessions === 0)
  if (vacios.length > players.length * 0.4 && players.length > 3) a.push({
    txt: `${vacios.length} de ${players.length} jugadores no tienen ni un partido ni una sesión. Puede indicar que la gente se atasca al empezar.`,
    ir: 'jugadores',
  })
  return a
}

// ════════════════════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════════════════════

function Resumen({ stats, users, players, onGo, onReload, loading }: {
  stats: AdminStats; users: AdminUser[]; players: AdminPlayer[]
  onGo: (s: AdminSection) => void; onReload: () => void; loading: boolean
}) {
  const t = stats.totals
  const avisos = contarAvisos(stats, users, players)
  const activos30 = users.filter(u =>
    u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 30 * 864e5).length
  const vinculados = players.filter(p => p.linked).length

  const semanas = useMemo(() => {
    const map = new Map<string, number>()
    for (const iso of stats.signups) {
      const d = new Date(iso)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const k = d.toISOString().slice(0, 10)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
  }, [stats.signups])
  const maxAltas = Math.max(...semanas.map(s => s[1]), 1)

  // Actividad de IA por día, últimos 14
  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      map.set(d.toISOString().slice(0, 10), 0)
    }
    for (const u of stats.usage) {
      const k = u.created_at.slice(0, 10)
      if (map.has(k)) map.set(k, map.get(k)! + 1)
    }
    return Array.from(map.entries())
  }, [stats.usage])
  const maxDia = Math.max(...porDia.map(d => d[1]), 1)

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow mb-2">Administración</div>
          <h1 className="h-page text-[26px] sm:text-[38px] leading-none">Resumen</h1>
        </div>
        <Btn onClick={onReload} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Btn>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric v={t.coaches} l="Cuentas" sub={t.suspended ? `${t.suspended} suspendidas` : 'todas activas'} onClick={() => onGo('coaches')} />
        <Metric v={activos30} l="Activos · 30 días" sub={t.coaches ? `${Math.round(activos30 / t.coaches * 100)}% del total` : ''}
                tone={t.coaches && activos30 / t.coaches > 0.6 ? 'volt' : undefined} />
        <Metric v={players.length} l="Jugadores" sub={`${vinculados} con portal propio`} onClick={() => onGo('jugadores')} />
        <Metric v={t.ai30} l="Llamadas de IA · 30 días" sub={t.aiFail ? `${t.aiFail} fallidas` : 'sin fallos'}
                tone={t.aiFail ? 'warn' : undefined} onClick={() => onGo('ia')} />
      </div>

      <Panel className="mb-6">
        <Eyebrow>{avisos.length ? 'Requiere tu atención' : 'Estado'}</Eyebrow>
        {!avisos.length ? (
          <div className="flex items-center gap-3 mt-4">
            <span className="w-2 h-2 rounded-full bg-volt shrink-0" />
            <span className="text-[14px] text-sub">Todo en orden. Nada que requiera tu atención.</span>
          </div>
        ) : (
          <div className="space-y-2.5 mt-4">
            {avisos.map((a, i) => (
              <button key={i} onClick={() => a.ir && onGo(a.ir)}
                      className="flex items-start gap-3 text-left w-full group">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${a.grave ? 'bg-ink' : 'bg-line-strong'}`} />
                <span className="text-[14px] text-sub leading-relaxed group-hover:text-ink transition">{a.txt}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel>
          <Eyebrow>Altas por semana</Eyebrow>
          {semanas.length === 0 ? <p className="text-muted text-[14px] mt-4">Sin datos.</p> : (
            <div className="flex items-end gap-1.5 h-32 mt-6">
              {semanas.map(([k, n]) => (
                <div key={k} className="flex-1 flex flex-col items-center gap-2" title={`${k}: ${n}`}>
                  <div className="w-full bg-ink/25 hover:bg-volt rounded-t transition-colors"
                       style={{ height: `${(n / maxAltas) * 100}%`, minHeight: 3 }} />
                  <span className="text-[9px] text-faint tabular-nums">{k.slice(8, 10)}/{k.slice(5, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <Eyebrow>Actividad de IA · 14 días</Eyebrow>
          <div className="flex items-end gap-1 h-32 mt-6">
            {porDia.map(([k, n]) => (
              <div key={k} className="flex-1 flex flex-col items-center gap-2" title={`${k}: ${n} llamadas`}>
                <div className={`w-full rounded-t transition-colors ${n ? 'bg-volt' : 'bg-line'}`}
                     style={{ height: `${Math.max(3, (n / maxDia) * 100)}%` }} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-faint mt-3">
            {stats.usage.length ? `${stats.usage.length} llamadas en 30 días` : 'Sin llamadas registradas todavía'}
          </p>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>Uso de la plataforma</Eyebrow>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-5">
          {([
            ['Jugadores por cuenta', t.coaches ? (players.length / t.coaches).toFixed(1) : '0'],
            ['Partidos registrados', String(t.matches)],
            ['Sesiones creadas', String(t.sessions)],
            ['Adopción del portal', players.length ? `${Math.round(vinculados / players.length * 100)}%` : '—'],
          ] as [string, string][]).map(([l, v]) => (
            <div key={l}>
              <div className="font-display font-bold text-[24px] text-ink tabular-nums leading-none">{v}</div>
              <div className="text-[12px] text-muted mt-2">{l}</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// COACHES
// ════════════════════════════════════════════════════════════

const COLS_COACH = '2fr 1fr .7fr .7fr .7fr 1fr'

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
      <PageTitle title="Coaches" sub={`${users.length} cuentas registradas`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Buscar por correo o nombre…" /></div>
        <Filters value={filtro} onChange={setFiltro} options={[
          ['todos', 'Todos'], ['activos', 'Activos'], ['suspendidos', 'Suspendidos'],
          ['sin_confirmar', 'Sin confirmar'], ['dormidos', 'Inactivos +30d'],
        ]} />
      </div>

      <TableShell>
        <Thead cols={COLS_COACH} labels={['Coach', 'Estado', 'Jugadores', 'Partidos', 'IA', 'Última conexión']} />
        {vistos.map(u => (
          <Row key={u.user_id} cols={COLS_COACH} onClick={() => onPick(u.user_id)}>
            <Cell span>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name ?? u.email ?? '?'} />
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-ink truncate">{u.name ?? '—'}</div>
                  <div className="text-[12px] text-muted truncate">{u.email}</div>
                </div>
              </div>
            </Cell>
            <Cell label="Estado">
              <div className="flex items-center gap-1.5 flex-wrap">
                {u.status === 'suspended'
                  ? <Chip tone="danger">Suspendido</Chip>
                  : <Chip>{u.role === 'player' ? 'Jugador' : 'Coach'}</Chip>}
                {!u.email_confirmed && <Chip tone="ghost" title="Correo sin confirmar">✉</Chip>}
              </div>
            </Cell>
            <Cell label="Jugadores"><Num>{jugadoresDe(u.user_id)}</Num></Cell>
            <Cell label="Partidos"><Num>{u.matches}</Num></Cell>
            <Cell label="IA"><Num>{u.ai_calls}</Num></Cell>
            <Cell label="Última conexión">
              <span className="text-[13px] text-sub">{hace(u.last_sign_in_at)}</span>
            </Cell>
          </Row>
        ))}
        {!vistos.length && <div className="p-12 text-center text-muted text-[14px]">Nada con estos filtros.</div>}
      </TableShell>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// JUGADORES
// ════════════════════════════════════════════════════════════

const COLS_PLAYER = '1.7fr 1.4fr .6fr .6fr .6fr .9fr'

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
    return p.name.toLowerCase().includes(t) || (p.club ?? '').toLowerCase().includes(t)
      || (p.coach_email ?? '').toLowerCase().includes(t)
  })

  return (
    <>
      <PageTitle title="Jugadores" sub={`${players.length} en toda la plataforma · ${players.filter(p => p.linked).length} con portal propio`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Buscar por jugador, club o coach…" /></div>
        <Filters value={filtro} onChange={setFiltro} options={[
          ['todos', 'Todos'], ['vinculados', 'Con portal'], ['sin_vincular', 'Sin portal'], ['inactivos', 'Sin actividad'],
        ]} />
      </div>

      {coaches.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center mb-5">
          <span className="text-[10px] font-semibold text-faint tracking-[0.14em] uppercase mr-1">Coach</span>
          <Filters value={coach} onChange={setCoach}
                   options={[['all', 'Todos'], ...coaches.map(([id, em]) => [id, em.split('@')[0]] as [string, string])]} />
        </div>
      )}

      <TableShell>
        <Thead cols={COLS_PLAYER} labels={['Jugador', 'Coach', 'Partidos', 'Sesiones', 'Portal', 'Último check-in']} />
        {vistos.map(p => (
          <Row key={p.id} cols={COLS_PLAYER}>
            <Cell span>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar url={p.photo_url} name={p.name} size={36} />
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-ink truncate">{p.name}</div>
                  <div className="text-[12px] text-muted truncate">
                    {posLabel(p.pos, p.pos_group)}{p.age ? ` · ${p.age} años` : ''}{p.club ? ` · ${p.club}` : ''}
                  </div>
                </div>
              </div>
            </Cell>
            <Cell label="Coach">
              {p.coach_email ? (
                <button onClick={() => onPickCoach(p.coach_id)}
                        className="text-[13px] text-sub hover:text-ink transition truncate text-left">
                  {p.coach_email}
                </button>
              ) : <Chip tone="danger">Sin coach</Chip>}
            </Cell>
            <Cell label="Partidos"><Num>{p.matches}</Num></Cell>
            <Cell label="Sesiones"><Num>{p.sessions}</Num></Cell>
            <Cell label="Portal">{p.linked ? <Chip tone="volt">Sí</Chip> : <Chip tone="ghost">No</Chip>}</Cell>
            <Cell label="Último check-in">
              <span className="text-[13px] text-sub">{hace(p.last_checkin)}</span>
            </Cell>
          </Row>
        ))}
        {!vistos.length && <div className="p-12 text-center text-muted text-[14px]">Nada con estos filtros.</div>}
      </TableShell>
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

  useEffect(() => { getCoachDetail(userId).then(setD).catch(e => setError(e.message)) }, [userId])

  async function run(tag: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(tag); setError(''); setMsg('')
    try { await fn(); setMsg(ok); onChanged(); getCoachDetail(userId).then(setD) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy('') }
  }

  if (!d) return (
    <Modal title="Cargando…" onClose={onClose}>
      {error ? <Alert tone="danger">⚠ {error}</Alert> : <p className="text-muted text-[14px]">Un momento…</p>}
    </Modal>
  )

  const p = d.profile
  const email = p?.email ?? ''
  const iaMes = d.usage.filter(u => Date.now() - new Date(u.created_at).getTime() < 30 * 864e5)
  const chars = d.usage.reduce((a, u) => a + (u.prompt_chars ?? 0) + (u.output_chars ?? 0), 0)
  const hechas = d.sessions.filter(s => s.completed).length

  return (
    <Modal title={p?.name ?? email ?? 'Coach'} onClose={onClose} wide>
      {error && <div className="mb-4"><Alert tone="danger">⚠ {error}</Alert></div>}
      {msg && <div className="mb-4"><Alert tone="ok">✓ {msg}</Alert></div>}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[13px] text-sub">{email}</span>
        {p?.status === 'suspended' && <Chip tone="danger">Suspendido</Chip>}
        {!d.auth.email_confirmed && <Chip tone="ghost">Correo sin confirmar</Chip>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([['Jugadores', d.players.length], ['Partidos', p?.matches ?? 0],
           ['Sesiones', `${hechas}/${d.sessions.length}`], ['Llamadas IA', d.usage.length]] as [string, string | number][])
          .map(([l, v]) => (
            <div key={l} className="bg-canvas rounded-xl p-3.5">
              <div className="font-display font-bold text-[20px] text-ink tabular-nums leading-none">{v}</div>
              <div className="text-[11px] text-muted mt-1.5">{l}</div>
            </div>
          ))}
      </div>

      <div className="bg-canvas border border-line rounded-xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <Field l="Alta" v={fecha(d.auth.created_at)} />
          <Field l="Última conexión" v={hace(d.auth.last_sign_in_at)} />
          <Field l="IA este mes" v={String(iaMes.length)} />
          <Field l="Tokens consumidos" v={`≈ ${Math.round(chars / 3500)}k`} />
          <Field l="Último partido" v={d.lastMatch ? fecha(d.lastMatch) : '—'} />
          <Field l="Rol" v={p?.role === 'player' ? 'Jugador' : 'Coach'} />
        </div>
        {p?.suspend_reason && <p className="text-[12px] text-muted mt-3">Motivo: {p.suspend_reason}</p>}
      </div>

      {d.players.length > 0 && (
        <div className="mb-5">
          <Eyebrow>Sus jugadores</Eyebrow>
          <div className="mt-3 space-y-1">
            {d.players.map(pl => (
              <div key={pl.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                <Avatar url={pl.photo_url} name={pl.name} size={28} />
                <span className="text-[14px] text-ink flex-1 truncate">{pl.name}</span>
                <span className="text-[12px] text-muted">{posLabel(pl.pos, pl.pos_group)}</span>
                {pl.auth_user_id && <Chip tone="volt">portal</Chip>}
              </div>
            ))}
          </div>
        </div>
      )}

      {link && (
        <div className="mb-5">
          <Alert>
            <p className="mb-2">Enlace de recuperación (pásaselo si no le llega el correo):</p>
            <p className="text-[11px] break-all font-mono bg-canvas rounded-lg p-2.5 text-sub">{link}</p>
            <button onClick={() => navigator.clipboard.writeText(link)}
                    className="text-[12px] underline mt-2 text-sub hover:text-ink">Copiar</button>
          </Alert>
        </div>
      )}

      {!borrando ? (
        <>
          <div className="space-y-2 mb-5">
            <Btn full onClick={() => run('reset',
                   async () => { const r = await resetPassword(userId, email); setLink(r.link) },
                   'Enlace de recuperación generado.')} disabled={!!busy}>
              {busy === 'reset' ? '…' : 'Restablecer contraseña'}
            </Btn>

            {!d.auth.email_confirmed && (
              <Btn full onClick={() => run('confirm', () => confirmEmail(userId, email), 'Correo confirmado.')} disabled={!!busy}>
                {busy === 'confirm' ? '…' : 'Confirmar su correo a mano'}
              </Btn>
            )}

            {p?.status === 'active' ? (
              <>
                <input className="field text-[13px]"
                       value={razon} onChange={e => setRazon(e.target.value)}
                       placeholder="Motivo de la suspensión (opcional)" />
                <Btn full tone="ink" onClick={() => run('susp', () => suspendUser(userId, email, razon), 'Cuenta suspendida.')} disabled={!!busy}>
                  {busy === 'susp' ? '…' : 'Suspender cuenta'}
                </Btn>
              </>
            ) : (
              <Btn full tone="volt" onClick={() => run('act', () => activateUser(userId, email), 'Cuenta reactivada.')} disabled={!!busy}>
                {busy === 'act' ? '…' : 'Reactivar cuenta'}
              </Btn>
            )}
          </div>

          <button onClick={() => setBorrando(true)}
                  className="text-[13px] text-faint hover:text-ink transition">
            Eliminar cuenta y todos sus datos
          </button>
        </>
      ) : (
        <div className="border border-line-strong bg-ink/[0.07] rounded-xl p-5">
          <p className="text-[14px] text-ink font-medium mb-1.5">Esto no se puede deshacer</p>
          <p className="text-[13px] text-sub leading-relaxed mb-4">
            Se borran sus {d.players.length} jugadores, {p?.matches ?? 0} partidos, {d.sessions.length} sesiones
            y su cuenta. Si solo quieres bloquearle el acceso, suspende en vez de borrar.
          </p>
          <label className="block text-[11px] text-muted mb-2">Escribe «{email}» para confirmar</label>
          <input className="field mb-4"
                 value={confirmMail} onChange={e => setConfirmMail(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <Btn full onClick={() => setBorrando(false)}>Cancelar</Btn>
            <Btn full tone="danger" disabled={busy === 'del' || confirmMail !== email}
                 onClick={() => run('del', async () => { await deleteUser(userId, email, confirmMail); onClose() }, 'Cuenta eliminada.')}>
              {busy === 'del' ? 'Eliminando…' : 'Eliminar'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
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
      <PageTitle title="Consumo de IA" sub="Últimos 30 días" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric v={u.length} l="Llamadas" />
        <Metric v={Math.round(tokens / 1000)} l="Miles de tokens" sub={`≈ ${coste.toFixed(2)} $`} />
        <Metric v={msMedio} l="Milisegundos de media" tone={msMedio > 8000 ? 'warn' : undefined} />
        <Metric v={fallos} l="Fallidas" sub={u.length ? `${Math.round(fallos / u.length * 100)}%` : ''}
                tone={fallos ? 'warn' : undefined} />
      </div>

      {!u.length ? (
        <Empty title="Todavía sin registros"
               sub="El consumo se mide desde que subiste la versión con el registro activado. Las llamadas anteriores no quedaron guardadas." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <Eyebrow>Por cuenta</Eyebrow>
            <div className="mt-4">
              {porCoach.slice(0, 12).map(([id, d]) => (
                <div key={id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                  <span className="text-[13px] text-ink truncate flex-1 mr-3">{nombre(id === 'null' ? null : id)}</span>
                  {d.fail > 0 && <Chip tone="danger">{d.fail} fallos</Chip>}
                  <span className="text-[12px] text-muted tabular-nums mx-3">{Math.round(d.chars / 3500)}k tok</span>
                  <Num>{d.n}</Num>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <Eyebrow>Por función</Eyebrow>
            <div className="mt-4 space-y-3">
              {porModo.map(([modo, n]) => (
                <div key={modo}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[13px] text-ink">{modo}</span>
                    <Num>{n}</Num>
                  </div>
                  <Bar pct={(n / porModo[0][1]) * 100} tone="volt" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      <p className="text-[11px] text-faint mt-5 leading-relaxed max-w-[640px]">
        El coste es una estimación a partir de los caracteres (≈3,5 por token) y de la tarifa pública
        de Gemini Flash. Para la cifra real, mira la facturación de Google Cloud.
      </p>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// ESTADO DEL SISTEMA
// ════════════════════════════════════════════════════════════

function Salud() {
  const [checks, setChecks] = useState<HealthCheck[] | null>(null)
  const [at, setAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true); setError('')
    try {
      const r = await getHealth()
      setChecks(r.checks); setAt(r.at)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }
  useEffect(() => { run() }, [])

  const fallan = checks?.filter(c => !c.ok).length ?? 0

  return (
    <>
      <PageTitle title="Estado del sistema"
                 sub={at ? `Última comprobación: ${fechaHora(at)}` : 'Comprobando…'}
                 action={<Btn onClick={run} disabled={loading}>{loading ? 'Comprobando…' : 'Comprobar ahora'}</Btn>} />

      {error && <div className="mb-5"><Alert tone="danger">⚠ {error}</Alert></div>}

      {checks && (
        <>
          <div className="mb-6">
            <Alert tone={fallan ? 'danger' : 'ok'}>
              {fallan
                ? `${fallan} ${fallan === 1 ? 'comprobación falla' : 'comprobaciones fallan'}. Revísalas abajo.`
                : 'Todos los sistemas funcionan correctamente.'}
            </Alert>
          </div>

          <div className="space-y-2.5">
            {checks.map(c => (
              <Panel key={c.id} className="flex items-center gap-4">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.ok ? 'bg-volt' : 'bg-ink animate-pulse'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-ink font-medium">{c.label}</div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">{c.detail}</div>
                </div>
                <Chip tone={c.ok ? 'volt' : 'danger'}>{c.ok ? 'OK' : 'Fallo'}</Chip>
              </Panel>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════
// ADMINISTRADORES
// ════════════════════════════════════════════════════════════

function Administradores({ meEmail }: { meEmail: string }) {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    try { setAdmins(await listAdmins()) } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!email.trim()) return
    setBusy('add'); setError(''); setMsg('')
    try { await addAdmin(email.trim()); setEmail(''); setMsg('Administrador añadido.'); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy('') }
  }

  async function quitar(a: AdminRow) {
    setBusy(a.user_id); setError(''); setMsg('')
    try { await removeAdmin(a.user_id, a.email); setMsg('Acceso retirado.'); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy('') }
  }

  return (
    <>
      <PageTitle title="Administradores" sub="Quién puede entrar en esta consola" />

      {error && <div className="mb-4"><Alert tone="danger">⚠ {error}</Alert></div>}
      {msg && <div className="mb-4"><Alert tone="ok">✓ {msg}</Alert></div>}

      <Panel className="mb-6">
        <Eyebrow>Dar acceso a alguien</Eyebrow>
        <p className="text-[13px] text-muted mt-3 mb-4 leading-relaxed max-w-[560px]">
          La persona tiene que estar registrada en CAMPO antes de poder hacerla administradora.
          Tendrá los mismos permisos que tú: ver todas las cuentas, suspender, restablecer contraseñas y borrar.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1"><SearchInput value={email} onChange={setEmail} placeholder="correo@ejemplo.com" /></div>
          <Btn tone="volt" onClick={add} disabled={busy === 'add' || !email.trim()}>
            {busy === 'add' ? 'Añadiendo…' : 'Añadir'}
          </Btn>
        </div>
      </Panel>

      <TableShell>
        <Thead cols="2fr 1fr .6fr" labels={['Administrador', 'Desde', '']} />
        {admins.map(a => (
          <Row key={a.user_id} cols="2fr 1fr .6fr">
            <Cell span>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={a.email} />
                <div className="min-w-0">
                  <div className="text-[14px] text-ink truncate">{a.email}</div>
                  {a.note && <div className="text-[12px] text-muted truncate">{a.note}</div>}
                </div>
              </div>
            </Cell>
            <Cell label="Desde"><span className="text-[13px] text-sub">{fecha(a.created_at)}</span></Cell>
            <Cell>
              {a.email.toLowerCase() === meEmail.toLowerCase()
                ? <Chip tone="ghost">tú</Chip>
                : <button onClick={() => quitar(a)} disabled={busy === a.user_id}
                          className="text-[12px] text-faint hover:text-ink transition text-left">
                    {busy === a.user_id ? '…' : 'Quitar acceso'}
                  </button>}
            </Cell>
          </Row>
        ))}
        {!admins.length && <div className="p-10 text-center text-muted text-[14px]">Cargando…</div>}
      </TableShell>
    </>
  )
}

// ════════════════════════════════════════════════════════════

function Errores({ stats, users }: { stats: AdminStats; users: AdminUser[] }) {
  const nombre = (id: string | null) => users.find(x => x.user_id === id)?.email ?? '—'
  return (
    <>
      <PageTitle title="Errores" sub={`${stats.totals.errors30} en los últimos 30 días`} />
      {!stats.recentErrors.length ? (
        <Empty title="Sin errores registrados" sub="Buena señal." />
      ) : (
        <div className="space-y-2.5">
          {stats.recentErrors.map(e => (
            <Panel key={e.id}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <Chip tone="ghost">{e.context ?? 'sin contexto'}</Chip>
                <span className="text-[11px] text-faint tabular-nums shrink-0">{fechaHora(e.created_at)}</span>
              </div>
              <p className="text-[14px] text-ink">{e.message}</p>
              {e.detail && <p className="text-[12px] text-muted mt-2 font-mono break-all line-clamp-3">{e.detail}</p>}
              <p className="text-[11px] text-faint mt-2">{nombre(e.coach_id)}</p>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}

function Registro({ stats }: { stats: AdminStats }) {
  const ACCION: Record<string, string> = {
    suspend: 'Suspendió', activate: 'Reactivó', reset_password: 'Restableció contraseña',
    confirm_email: 'Confirmó correo', delete_user: 'Eliminó cuenta',
    add_admin: 'Dio acceso de admin', remove_admin: 'Retiró acceso de admin',
  }
  return (
    <>
      <PageTitle title="Registro de acciones" sub="Todo lo que se hace desde esta consola queda anotado" />
      {!stats.auditLog.length ? (
        <Empty title="Sin acciones registradas todavía" />
      ) : (
        <TableShell>
          {stats.auditLog.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-6 py-3.5 border-b border-line last:border-0">
              <span className="text-[13px] text-ink w-48 shrink-0">{ACCION[a.action] ?? a.action}</span>
              <span className="text-[13px] text-sub flex-1 truncate">{a.target_email ?? '—'}</span>
              {a.detail && <span className="text-[12px] text-faint truncate max-w-[200px] hidden sm:block">{a.detail}</span>}
              <span className="text-[11px] text-faint tabular-nums shrink-0">{fechaHora(a.created_at)}</span>
            </div>
          ))}
        </TableShell>
      )}
    </>
  )
}
