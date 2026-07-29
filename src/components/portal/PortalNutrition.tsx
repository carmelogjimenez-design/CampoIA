import { useEffect, useState } from 'react'
import { PlayerData } from '../../hooks/usePlayerData'
import { supabase } from '../../lib/supabase'
import { NutritionLog, MealPlanItem } from '../../types/database'
import { DAYS } from '../../lib/mealPlan'

const QUALITIES = [{ v: 'good', l: '🟢 Bien', c: 'bg-volt text-ink' }, { v: 'regular', l: '🟡 Regular', c: 'bg-canvas' }, { v: 'bad', l: '🔴 Mejorable', c: 'bg-canvas' }]

export default function PortalNutrition({ pd }: { pd: PlayerData }) {
  const { profile } = pd
  const [items, setItems] = useState<MealPlanItem[]>([])
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7) // 0=Lunes
  const [freeMeal, setFreeMeal] = useState('')
  const [freeType, setFreeType] = useState('Comida')
  const [freeQuality, setFreeQuality] = useState('good')
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  async function load() {
    if (!profile) return
    const { data: plan } = await supabase.from('meal_plans').select('id').eq('player_id', profile.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (plan) {
      const { data } = await supabase.from('meal_plan_items').select('*').eq('plan_id', plan.id).order('ord')
      setItems((data as MealPlanItem[]) ?? [])
    }
    const { data: l } = await supabase.from('nutrition_logs').select('*').eq('player_id', profile.id).eq('date', today).order('created_at', { ascending: false })
    setLogs((l as NutritionLog[]) ?? [])
  }
  useEffect(() => { load() }, [profile])

  if (!profile) return null
  const dayItems = items.filter(i => i.day_index === day)
  const isToday = day === (new Date().getDay() + 6) % 7

  // ¿marcada hoy? Se casa por tipo de comida, no por descripción exacta:
  // si el jugador anota lo que comió de verdad, la comida sigue contando.
  function loggedToday(meal: MealPlanItem) {
    return logs.find(l => (l.meal_type ?? '').toLowerCase() === meal.meal_type.toLowerCase())
  }

  async function toggleMeal(meal: MealPlanItem) {
    if (!isToday || !profile) return
    setBusy(true)
    const existing = loggedToday(meal)
    if (existing) {
      await supabase.from('nutrition_logs').delete().eq('id', existing.id)
    } else {
      await supabase.from('nutrition_logs').insert([{
        coach_id: profile.coach_id, player_id: profile.id, meal_type: meal.meal_type,
        description: meal.description, quality: 'good', date: today,
      }])
    }
    await load(); setBusy(false)
  }

  async function addFree() {
    if (!freeMeal.trim() || !profile) return
    setBusy(true)
    await supabase.from('nutrition_logs').insert([{
      coach_id: profile.coach_id, player_id: profile.id, meal_type: freeType,
      description: freeMeal.trim(), quality: freeQuality, date: today,
    }])
    setFreeMeal(''); await load(); setBusy(false)
  }

  const doneCount = dayItems.filter(loggedToday).length

  return (
    <div>
      <h1 className="font-display font-bold text-[26px] tracking-tightest mb-1">Mi comida</h1>
      <p className="text-muted text-[14px] mb-5">{items.length ? 'Sigue tu plan y marca lo que comes.' : 'Registra lo que comes hoy.'}</p>

      {items.length > 0 && (
        <>
          {/* selector de día */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => setDay(i)} className={`shrink-0 px-3 py-2 rounded-xl text-[12px] font-medium transition ${day === i ? 'bg-ink text-paper' : 'bg-canvas text-sub'} ${i === (new Date().getDay() + 6) % 7 ? 'ring-1 ring-volt' : ''}`}>{d.slice(0, 3)}</button>
            ))}
          </div>

          {isToday && dayItems.length > 0 && (
            <div className="card p-4 mb-4 flex items-center justify-between">
              <span className="text-[13px] text-sub">Hoy llevas</span>
              <span className="stat-num text-[15px]">{doneCount}/{dayItems.length} comidas</span>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {dayItems.map(meal => {
              const done = !!loggedToday(meal)
              return (
                <button key={meal.id} onClick={() => toggleMeal(meal)} disabled={!isToday || busy}
                        className={`w-full text-left card p-4 flex items-start gap-3 transition ${done ? 'bg-canvas' : ''} ${!isToday ? 'opacity-60' : ''}`}>
                  <span className={`w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 ${done ? 'bg-volt border-volt text-ink' : 'border-line-strong'}`}>{done && '✓'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-ink uppercase tracking-wide">{meal.meal_type}</div>
                    <div className={`text-[14px] ${done ? 'text-muted line-through' : 'text-ink'}`}>{meal.description}</div>
                  </div>
                </button>
              )
            })}
            {dayItems.length === 0 && <div className="card p-6 text-center text-muted text-[13px]">Sin comidas para este día.</div>}
          </div>
          {!isToday && <p className="text-[12px] text-muted text-center mb-6">Solo puedes marcar las comidas del día de hoy.</p>}
        </>
      )}

      {/* Registro libre */}
      <div className="card p-5">
        <div className="text-[13px] font-semibold text-ink mb-3">{items.length ? '¿Comiste algo más?' : 'Registrar comida'}</div>
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'].map(t => (
            <button key={t} onClick={() => setFreeType(t)} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] ${freeType === t ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{t}</button>
          ))}
        </div>
        <input className="w-full bg-canvas rounded-xl px-3.5 py-2.5 text-[14px] outline-none mb-2" value={freeMeal} onChange={e => setFreeMeal(e.target.value)} placeholder="¿Qué comiste?" />
        <div className="flex gap-2 mb-3">
          {QUALITIES.map(q => <button key={q.v} onClick={() => setFreeQuality(q.v)} className={`flex-1 py-2 rounded-xl text-[12px] font-medium ${freeQuality === q.v ? q.c : 'bg-canvas text-sub'}`}>{q.l}</button>)}
        </div>
        <button onClick={addFree} disabled={busy || !freeMeal.trim()} className="btn-ink w-full">Registrar</button>
      </div>

      {/* Historial de hoy */}
      {logs.length > 0 && (
        <div className="mt-5">
          <div className="text-[12px] text-muted mb-2">Hoy has registrado</div>
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="card p-3.5">
                <div className="flex items-center gap-2"><span className="text-[13px]">{l.quality === 'good' ? '🟢' : l.quality === 'regular' ? '🟡' : '🔴'}</span><span className="text-[13px] text-ink flex-1">{l.description}</span><span className="text-[11px] text-muted">{l.meal_type}</span></div>
                {l.coach_feedback && <div className="mt-2 bg-volt/20 rounded-lg px-2.5 py-1.5 text-[12px] text-ink"><b>Coach:</b> {l.coach_feedback}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
