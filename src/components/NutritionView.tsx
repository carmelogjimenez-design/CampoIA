import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, NutritionLog } from '../types/database'
import { initials } from '../lib/players'
import { askAI, playerContextString } from '../lib/aiCoach'
import {
  parseDietPlan, saveMealPlan, getActivePlan, loadNutritionBundle, NutritionBundle,
  dayCompliance, rangeAdherence, todayIndex, isoDate, DAYS, MealState,
} from '../lib/mealPlan'
import Modal from './Modal'
import PlanEditor, { PlanState } from './MealPlanEditor'

interface Props { players: Player[]; coachId: string }

const STATE_STYLE: Record<string, { chip: string; label: string }> = {
  seguido:    { chip: 'bg-volt text-ink',                       label: 'Según el plan' },
  sustituido: { chip: 'bg-canvas text-sub border border-line',  label: 'Cambió el menú' },
  pendiente:  { chip: 'bg-canvas text-faint',                   label: 'Pendiente' },
  libre:      { chip: 'bg-ink text-paper',                      label: 'Fuera del plan' },
}

/** Fecha ISO de cada día de la semana actual (lunes = 0). */
function weekDates(): string[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIndex())
  return DAYS.map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return isoDate(d)
  })
}

export default function NutritionView({ players, coachId }: Props) {
  const [bundle, setBundle] = useState<NutritionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string>('all')
  const [genFor, setGenFor] = useState<Player | null>(null)
  const [editing, setEditing] = useState<PlanState | null>(null)

  async function load() {
    setLoading(true)
    setBundle(await loadNutritionBundle(coachId))
    setLoading(false)
  }
  useEffect(() => { load() }, [coachId])

  const selected = players.find(p => p.id === sel) ?? null

  async function openEditor(playerId: string) {
    const active = await getActivePlan(playerId)
    if (active) setEditing({ playerId, plan: active.plan, items: active.items })
  }

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-2">Seguimiento</div>
          <h1 className="h-page text-[26px] sm:text-[40px] leading-none">Alimentación</h1>
        </div>
        <button onClick={() => setGenFor(selected ?? players[0] ?? null)}
                disabled={!players.length} className="btn-volt">
          ✦ {selected ? `Plan para ${selected.name.split(' ')[0]}` : 'Generar plan con IA'}
        </button>
      </header>

      {/* Selector de jugador */}
      <div className="flex gap-1.5 mb-7 overflow-x-auto pb-1">
        <button onClick={() => setSel('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition ${sel === 'all' ? 'bg-ink text-paper' : 'bg-paper text-sub border border-line hover:border-line-strong'}`}>
          Comparar todos
        </button>
        {players.map(p => (
          <button key={p.id} onClick={() => setSel(p.id)}
                  className={`shrink-0 flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full text-[13px] font-medium transition ${sel === p.id ? 'bg-ink text-paper' : 'bg-paper text-sub border border-line hover:border-line-strong'}`}>
            <span className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub overflow-hidden">
              {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : initials(p.name)}
            </span>
            {p.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted text-[15px]">Cargando…</p>}

      {!loading && bundle && (
        sel === 'all'
          ? <CompareView players={players} bundle={bundle} onPick={setSel} onGenerate={setGenFor} />
          : selected && <PlayerPlan player={selected} bundle={bundle}
              onEdit={() => openEditor(selected.id)}
              onGenerate={() => setGenFor(selected)}
              onReload={load} />
      )}

      {genFor && (
        <GeneratePlanModal player={genFor} players={players} coachId={coachId}
          onClose={() => setGenFor(null)}
          onDone={() => { setGenFor(null); load() }} />
      )}

      {editing && (
        <PlanEditor ps={editing} coachId={coachId}
          onClose={() => setEditing(null)}
          onChanged={load}
          onReplace={() => {
            const p = players.find(x => x.id === editing.playerId) ?? null
            setEditing(null); setGenFor(p)
          }} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// COMPARATIVA — las diferencias entre jugadores de un vistazo
// ════════════════════════════════════════════════════════════

function CompareView({ players, bundle, onPick, onGenerate }: {
  players: Player[]; bundle: NutritionBundle
  onPick: (id: string) => void; onGenerate: (p: Player) => void
}) {
  const rows = players.map(p => {
    const items = bundle.itemsByPlayer[p.id] ?? []
    const logs = bundle.logsByPlayer[p.id] ?? []
    const good = logs.filter(l => l.quality === 'good').length
    return {
      p, items, logs,
      today: dayCompliance(items, logs, isoDate()),
      week: rangeAdherence(items, logs, 7),
      hasPlan: !!bundle.planByPlayer[p.id],
      quality: logs.length ? Math.round(good / logs.length * 100) : null,
    }
  }).sort((a, b) => b.week.pct - a.week.pct)

  const withPlan = rows.filter(r => r.hasPlan)
  const without = rows.filter(r => !r.hasPlan)

  return (
    <>
      {withPlan.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="hidden md:grid grid-cols-[1.6fr_repeat(4,1fr)] gap-4 px-6 py-3 border-b border-line bg-canvas/60">
            {['Jugador', 'Hoy', 'Adherencia 7 días', 'Fidelidad al plan', 'Calidad'].map(h =>
              <div key={h} className="eyebrow">{h}</div>)}
          </div>

          {withPlan.map(r => (
            <button key={r.p.id} onClick={() => onPick(r.p.id)}
                    className="w-full text-left grid grid-cols-2 md:grid-cols-[1.6fr_repeat(4,1fr)] gap-4 px-5 md:px-6 py-4 border-b border-line last:border-0 hover:bg-canvas/50 transition">
              <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub overflow-hidden shrink-0">
                  {r.p.photo_url ? <img src={r.p.photo_url} className="w-full h-full object-cover" /> : initials(r.p.name)}
                </span>
                <span className="text-[14px] font-medium text-ink truncate">{r.p.name}</span>
              </div>

              <Metric label="Hoy">
                <span className="stat-num text-[17px] tnum">{r.today.done}<span className="text-muted text-[12px]">/{r.today.total}</span></span>
              </Metric>

              <Metric label="Adherencia 7 días">
                <div className="w-full">
                  <div className="stat-num text-[17px] mb-1.5">{r.week.pct}%</div>
                  <div className="bar-track"><div className={r.week.pct >= 70 ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${r.week.pct}%` }} /></div>
                </div>
              </Metric>

              <Metric label="Fidelidad al plan">
                <span className="stat-num text-[17px]">{r.week.done ? `${r.week.fidelity}%` : '—'}</span>
              </Metric>

              <Metric label="Calidad">
                {r.quality === null
                  ? <span className="text-muted text-[13px]">—</span>
                  : <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.quality >= 70 ? 'bg-volt' : r.quality >= 40 ? 'bg-[#E8C447]' : 'bg-[#D96B6B]'}`} />
                      <span className="stat-num text-[17px]">{r.quality}%</span>
                    </span>}
              </Metric>
            </button>
          ))}
        </div>
      )}

      {without.length > 0 && (
        <>
          <div className="eyebrow mb-3">Sin plan asignado</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {without.map(r => (
              <div key={r.p.id} className="card-line p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub overflow-hidden shrink-0">
                  {r.p.photo_url ? <img src={r.p.photo_url} className="w-full h-full object-cover" /> : initials(r.p.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-ink truncate">{r.p.name}</div>
                  <div className="text-[12px] text-muted tnum">{r.logs.length} registros sueltos</div>
                </div>
                <button onClick={() => onGenerate(r.p)} className="btn-line text-[12px] px-3 py-1.5 shrink-0">Crear plan</button>
              </div>
            ))}
          </div>
        </>
      )}

      {!players.length && (
        <div className="card p-16 text-center">
          <p className="text-ink text-[16px] font-medium">Aún no tienes jugadores</p>
        </div>
      )}
    </>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="md:hidden text-[11px] text-muted mb-1">{label}</span>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PANTALLA DEL PLAN — un jugador, su semana, sus registros
// ════════════════════════════════════════════════════════════

function PlayerPlan({ player, bundle, onEdit, onGenerate, onReload }: {
  player: Player; bundle: NutritionBundle
  onEdit: () => void; onGenerate: () => void; onReload: () => void
}) {
  const items = bundle.itemsByPlayer[player.id] ?? []
  const logs = bundle.logsByPlayer[player.id] ?? []
  const hasPlan = !!bundle.planByPlayer[player.id]
  const dates = useMemo(weekDates, [])
  const [day, setDay] = useState(todayIndex())
  const [logFilter, setLogFilter] = useState<'all' | 'plan' | 'libre'>('all')

  const today = dayCompliance(items, logs, isoDate())
  const week = rangeAdherence(items, logs, 7)
  const dayC = dayCompliance(items, logs, dates[day])

  // Estado de cada registro: ¿siguió el plan, lo cambió, o comió por libre?
  const logState = useMemo(() => {
    const map: Record<string, MealState | 'libre'> = {}
    for (const d of Array.from(new Set(logs.map(l => l.date)))) {
      const c = dayCompliance(items, logs, d)
      for (const m of c.meals) if (m.log) map[m.log.id] = m.state
      for (const e of c.extras) map[e.id] = 'libre'
    }
    return map
  }, [items, logs])

  const visibleLogs = logs.filter(l => {
    if (logFilter === 'all') return true
    const st = logState[l.id] ?? 'libre'
    return logFilter === 'libre' ? st === 'libre' : st !== 'libre'
  })

  if (!hasPlan) return (
    <>
      <div className="card p-14 text-center mb-6">
        <p className="text-ink text-[17px] font-medium mb-1.5">{player.name.split(' ')[0]} no tiene plan activo</p>
        <p className="text-muted text-[14px] max-w-[330px] mx-auto mb-6 leading-relaxed">
          Genera un plan semanal y lo verá en su portal para ir marcando cada comida.
          Aquí podrás ver qué cumple y qué se salta.
        </p>
        <button onClick={onGenerate} className="btn-volt">✦ Generar plan con IA</button>
      </div>
      {logs.length > 0 && (
        <>
          <div className="eyebrow mb-3">Registros sueltos · {logs.length}</div>
          <div className="space-y-2.5">
            {logs.map(l => <MealCard key={l.id} l={l} state="libre" onSaved={onReload} />)}
          </div>
        </>
      )}
    </>
  )

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* HOY */}
        <div className="bg-ink rounded-3xl p-7 text-paper relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-volt/10 blur-3xl" />
          <div className="relative">
            <div className="eyebrow text-paper/50 mb-5">Hoy · {DAYS[todayIndex()]}</div>
            <div className="flex items-center gap-6">
              <Ring done={today.done} total={today.total} />
              <div className="flex-1 min-w-0 space-y-1.5">
                {today.meals.slice(0, 5).map(m => (
                  <div key={m.item.id} className="flex items-center gap-2 text-[12px]">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.state === 'seguido' ? 'bg-volt' : m.state === 'sustituido' ? 'bg-[#E8C447]' : 'bg-paper/20'}`} />
                    <span className="text-paper/70 truncate">{m.item.meal_type}</span>
                  </div>
                ))}
                {today.total === 0 && <p className="text-paper/40 text-[13px]">Sin comidas planificadas hoy.</p>}
                {today.meals.length > 5 && <div className="text-[11px] text-paper/30 pt-0.5">+{today.meals.length - 5} más</div>}
              </div>
            </div>
          </div>
        </div>

        {/* SEMANA */}
        <div className="lg:col-span-2 card p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="eyebrow">Últimos 7 días</div>
            <button onClick={onEdit} className="text-[13px] text-muted hover:text-ink transition">Editar plan</button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="stat-num text-[30px] leading-none">{week.pct}%</div>
              <div className="text-[12px] text-muted mt-1.5">Adherencia</div>
              <div className="bar-track mt-3"><div className={week.pct >= 70 ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${week.pct}%` }} /></div>
            </div>
            <div>
              <div className="stat-num text-[30px] leading-none">{week.done ? `${week.fidelity}%` : '—'}</div>
              <div className="text-[12px] text-muted mt-1.5">Fidelidad</div>
              <p className="text-[11px] text-faint mt-3 leading-snug">De lo que registró, cuánto era lo que le pusiste.</p>
            </div>
            <div>
              <div className="stat-num text-[30px] leading-none tnum">{week.done}<span className="text-muted text-[16px]">/{week.total}</span></div>
              <div className="text-[12px] text-muted mt-1.5">Comidas</div>
              <p className="text-[11px] text-faint mt-3 leading-snug">Registradas sobre planificadas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PLAN DE LA SEMANA */}
      <div className="card p-7 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="eyebrow">Plan de la semana</div>
          <span className="chip tnum">{items.length} comidas</span>
        </div>

        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => setDay(i)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-medium transition ${
                      day === i ? 'bg-ink text-paper' : i === todayIndex() ? 'bg-volt/25 text-ink' : 'bg-canvas text-sub hover:bg-line'}`}>
              {d.slice(0, 3)}{i === todayIndex() && <span className="ml-1.5 text-[10px] opacity-60">hoy</span>}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          {dayC.meals.map(m => (
            <div key={m.item.id} className="flex items-start gap-4 py-3 border-b border-line last:border-0">
              <span className="text-[11px] font-semibold text-ink uppercase tracking-wide w-28 shrink-0 pt-0.5">{m.item.meal_type}</span>
              <span className="flex-1 text-[14px] text-sub leading-relaxed">{m.item.description}</span>
              <span className={`chip shrink-0 ${STATE_STYLE[m.state].chip}`}>{STATE_STYLE[m.state].label}</span>
            </div>
          ))}
          {!dayC.meals.length && <p className="text-muted text-[14px] py-6 text-center">Sin comidas para {DAYS[day]}.</p>}
        </div>

        {dayC.extras.length > 0 && (
          <div className="mt-5 pt-5 border-t border-line">
            <div className="eyebrow mb-3">Además comió</div>
            {dayC.extras.map(e => (
              <div key={e.id} className="flex items-center gap-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
                <span className="text-[13px] text-sub">{e.description}</span>
                <span className="text-[11px] text-faint">· {e.meal_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REGISTROS — separados del plan, nunca mezclados */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="eyebrow">Lo que registró · {logs.length}</div>
        <div className="flex gap-1.5">
          {([['all', 'Todo'], ['plan', 'Del plan'], ['libre', 'Fuera del plan']] as const).map(([id, l]) => (
            <button key={id} onClick={() => setLogFilter(id)}
                    className={logFilter === id ? 'chip bg-ink text-paper' : 'chip'}>{l}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {visibleLogs.map(l => <MealCard key={l.id} l={l} state={logState[l.id] ?? 'libre'} onSaved={onReload} />)}
        {!visibleLogs.length && (
          <div className="card p-12 text-center text-muted text-[14px]">
            {logs.length ? 'Nada en este filtro.' : `${player.name.split(' ')[0]} aún no ha registrado ninguna comida desde su portal.`}
          </div>
        )}
      </div>
    </>
  )
}

function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round(done / total * 100) : 0
  const R = 44, C = 2 * Math.PI * R
  return (
    <div className="relative shrink-0">
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
        <circle cx="52" cy="52" r={R} fill="none" stroke="#C9F31D" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="stat-num text-paper text-[24px] leading-none tnum">{done}<span className="text-paper/40 text-[15px]">/{total}</span></span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Generar plan con IA
// ════════════════════════════════════════════════════════════

function GeneratePlanModal({ player, players, coachId, onClose, onDone }: {
  player: Player; players: Player[]; coachId: string; onClose: () => void; onDone: () => void
}) {
  const [target, setTarget] = useState(player.id)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    const p = players.find(x => x.id === target)
    if (!p) return
    setBusy(true); setMsg('Generando plan con la IA…')
    try {
      const { data: sessions } = await supabase.from('training_sessions').select('type').eq('player_id', p.id)
      const load = sessions?.length ? `Carga: ${sessions.length} sesiones.` : 'Carga moderada.'
      const q = `Crea un PLAN NUTRICIONAL SEMANAL para este jugador con los 7 días (Lunes a Domingo), `
        + `cada día con sus comidas (Desayuno, Media mañana, Comida, Merienda, Pre-entreno, Post-entreno, Cena) `
        + `y platos variados. Deportista joven en crecimiento: saludable, para crecer y rendir, nunca restrictivo.`
      const text = await askAI({ question: q, playerContext: playerContextString(p) + load })
      const parsed = parseDietPlan(text)
      if (!parsed.length) { setMsg('No pude leer el calendario que devolvió la IA. Prueba otra vez.'); setBusy(false); return }
      const ok = await saveMealPlan(p.id, coachId, parsed)
      if (!ok) { setMsg('Error al guardar el plan.'); setBusy(false); return }
      setMsg(`✓ Plan asignado a ${p.name.split(' ')[0]} · ${parsed.length} comidas.`)
      setTimeout(onDone, 900)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }

  return (
    <Modal title="Generar plan de alimentación" onClose={onClose}>
      <p className="text-sub text-[14px] leading-relaxed mb-5">
        La IA crea un plan semanal adaptado a su edad, demarcación y carga de entrenamiento.
        Reemplaza el plan activo que tuviera.
      </p>
      <label className="eyebrow block mb-2">Jugador</label>
      <select className="field mb-5" value={target} onChange={e => setTarget(e.target.value)}>
        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {msg && <div className="bg-canvas rounded-xl px-4 py-3 text-[13px] text-ink mb-5">{msg}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-line">Cerrar</button>
        <button onClick={run} disabled={busy} className="btn-volt">{busy ? 'Generando…' : 'Generar y asignar'}</button>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════

const QDOT: Record<string, string> = { good: 'bg-volt', regular: 'bg-[#E8C447]', bad: 'bg-[#D96B6B]' }

function MealCard({ l, state, onSaved }: { l: NutritionLog; state: MealState | 'libre'; onSaved: () => void }) {
  const [fb, setFb] = useState(l.coach_feedback ?? '')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    await supabase.from('nutrition_logs').update({ coach_feedback: fb.trim() || null }).eq('id', l.id)
    setBusy(false); setEditing(false); onSaved()
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${QDOT[l.quality ?? ''] ?? 'bg-line-strong'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-ink">{l.description}</div>
          <div className="text-[11px] text-muted tnum">{l.meal_type} · {l.date}</div>
        </div>
        <span className={`chip shrink-0 ${STATE_STYLE[state].chip}`}>{STATE_STYLE[state].label}</span>
        {!editing && !l.coach_feedback && (
          <button onClick={() => setEditing(true)} className="text-[12px] text-muted hover:text-ink shrink-0">+ feedback</button>
        )}
      </div>
      {l.coach_feedback && !editing && (
        <div className="mt-3 bg-canvas rounded-xl px-3.5 py-2.5 flex items-start gap-2">
          <span className="text-[11px] font-semibold text-ink shrink-0">Tú:</span>
          <span className="text-[13px] text-sub flex-1">{l.coach_feedback}</span>
          <button onClick={() => setEditing(true)} className="text-[11px] text-muted hover:text-ink">editar</button>
        </div>
      )}
      {editing && (
        <div className="mt-3 flex gap-2">
          <input autoFocus className="flex-1 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] outline-none" value={fb}
                 onChange={e => setFb(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
                 placeholder="Feedback sobre esta comida…" />
          <button onClick={save} disabled={busy} className="btn-ink text-[12px] px-4 py-2">{busy ? '...' : 'Enviar'}</button>
        </div>
      )}
    </div>
  )
}
