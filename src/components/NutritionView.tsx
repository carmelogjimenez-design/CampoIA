import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, NutritionLog } from '../types/database'
import { getPlayerName, initials } from '../lib/players'
import { askAI, playerContextString } from '../lib/aiCoach'
import { parseDietPlan, saveMealPlan } from '../lib/mealPlan'
import Modal from './Modal'
import MealPlanManager from './MealPlanManager'

interface Props { players: Player[]; coachId: string }
const QEMOJI: Record<string, string> = { good: '🟢', regular: '🟡', bad: '🔴' }

export default function NutritionView({ players, coachId }: Props) {
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [filter, setFilter] = useState('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importPlayer, setImportPlayer] = useState(players[0]?.id ?? '')
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [planKey, setPlanKey] = useState(0)

  function openImportFor(playerId: string) { setImportPlayer(playerId); setImportMsg(''); setImportOpen(true) }

  async function importPlan() {
    const p = players.find(x => x.id === importPlayer)
    if (!p) return
    setImportBusy(true); setImportMsg('Generando plan con la IA…')
    try {
      const { data: sessions } = await supabase.from('training_sessions').select('type').eq('player_id', p.id)
      const load = sessions?.length ? `Carga: ${sessions.length} sesiones.` : 'Carga moderada.'
      const q = `Crea un PLAN NUTRICIONAL SEMANAL para este jugador con los 7 días (Lunes a Domingo), cada día con sus comidas (Desayuno, Media mañana, Comida, Merienda, Pre-entreno, Post-entreno, Cena) y platos variados. Deportista joven en crecimiento: saludable, para crecer y rendir, nunca restrictivo.`
      const text = await askAI({ question: q, playerContext: playerContextString(p) + load })
      const items = parseDietPlan(text)
      if (!items.length) { setImportMsg('No pude detectar el calendario. Prueba otra vez.'); setImportBusy(false); return }
      const ok = await saveMealPlan(p.id, coachId, items)
      setImportMsg(ok ? `✓ Plan asignado a ${p.name.split(' ')[0]} (${items.length} comidas).` : 'Error al guardar. ¿Ejecutaste el SQL?')
      if (ok) setPlanKey(k => k + 1)
    } catch (e) { setImportMsg(e instanceof Error ? e.message : 'Error') } finally { setImportBusy(false) }
  }

  async function load() {
    const { data } = await supabase.from('nutrition_logs').select('*').eq('coach_id', coachId).order('date', { ascending: false }).limit(100)
    setLogs((data as NutritionLog[]) ?? [])
  }
  useEffect(() => { load() }, [coachId])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.player_id === filter)
  const good = filtered.filter(l => l.quality === 'good').length
  const score = filtered.length ? Math.round(good / filtered.length * 100) : 0
  const byPlayer = players.map(p => {
    const pl = logs.filter(l => l.player_id === p.id)
    const g = pl.filter(l => l.quality === 'good').length
    return { p, count: pl.length, score: pl.length ? Math.round(g / pl.length * 100) : 0 }
  }).filter(x => x.count > 0).sort((a, b) => b.score - a.score)

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7 flex items-end justify-between">
        <div><div className="eyebrow mb-2">Seguimiento</div><h1 className="h-page text-[40px] leading-none">Alimentación</h1></div>
        <button onClick={() => setImportOpen(true)} className="btn-volt">📋 Importar plan IA</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 bg-ink rounded-2xl p-7 text-paper flex flex-col justify-between">
          <div className="text-[13px] text-paper/60 uppercase tracking-eyebrow font-semibold">Calidad global</div>
          <div><div className="stat-num text-volt text-[54px] leading-none">{score}<span className="text-[28px]">%</span></div><div className="text-[13px] text-paper/50 mt-1">comidas saludables · {filtered.length} registros</div></div>
        </div>
        <div className="lg:col-span-2 card p-7">
          <div className="eyebrow mb-5">Adherencia por jugador</div>
          {byPlayer.length === 0 && <p className="text-muted text-[14px]">Sin registros aún.</p>}
          <div className="space-y-4">
            {byPlayer.map(x => (
              <div key={x.p.id}>
                <div className="flex items-baseline justify-between mb-2"><span className="text-[14px] text-ink">{x.p.name}</span><span className="stat-num text-[14px]">{x.score}%</span></div>
                <div className="bar-track"><div className={x.score >= 70 ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${x.score}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MealPlanManager key={planKey} players={players} coachId={coachId} onImport={openImportFor} />

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'chip bg-ink text-paper' : 'chip'}>Todos</button>
        {players.map(p => <button key={p.id} onClick={() => setFilter(p.id)} className={filter === p.id ? 'chip bg-ink text-paper' : 'chip'}>{p.name.split(' ')[0]}</button>)}
      </div>

      <div className="space-y-2.5">
        {filtered.map(l => <MealCard key={l.id} l={l} players={players} onSaved={load} />)}
        {!filtered.length && <div className="card p-12 text-center text-muted text-[14px]">Sin registros. Los jugadores apuntan su comida desde el portal.</div>}
      </div>

      {importOpen && (
        <Modal title="Importar plan de alimentación" onClose={() => { setImportOpen(false); setImportMsg('') }}>
          <p className="text-sub text-[14px] mb-4">La IA genera un plan semanal para el jugador y se lo asigna. Lo verá en su portal para ir marcando cada comida.</p>
          <label className="eyebrow block mb-2">Jugador</label>
          <select className="field mb-4" value={importPlayer} onChange={e => setImportPlayer(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {importMsg && <div className="bg-canvas rounded-xl px-4 py-3 text-[13px] text-ink mb-4">{importMsg}</div>}
          <div className="flex justify-end gap-2"><button onClick={() => { setImportOpen(false); setImportMsg('') }} className="btn-line">Cerrar</button><button onClick={importPlan} disabled={importBusy} className="btn-volt">{importBusy ? 'Generando…' : 'Generar y asignar'}</button></div>
        </Modal>
      )}
    </div>
  )
}

function MealCard({ l, players, onSaved }: { l: NutritionLog; players: Player[]; onSaved: () => void }) {
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
        <span className="text-[18px]">{QEMOJI[l.quality ?? ''] ?? '⚪'}</span>
        <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-[10px] font-semibold text-sub shrink-0">{initials(getPlayerName(players, l.player_id))}</div>
        <div className="flex-1 min-w-0"><div className="text-[14px] text-ink">{l.description}</div><div className="text-[11px] text-muted tnum">{getPlayerName(players, l.player_id).split(' ')[0]} · {l.meal_type} · {l.date}</div></div>
        {!editing && !l.coach_feedback && <button onClick={() => setEditing(true)} className="text-[12px] text-muted hover:text-ink shrink-0">+ feedback</button>}
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
          <input autoFocus className="flex-1 bg-canvas rounded-xl px-3.5 py-2.5 text-[13px] outline-none" value={fb} onChange={e => setFb(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && save()} placeholder="Feedback sobre esta comida…" />
          <button onClick={save} disabled={busy} className="btn-ink text-[12px] px-4 py-2">{busy ? '...' : 'Enviar'}</button>
        </div>
      )}
    </div>
  )
}
