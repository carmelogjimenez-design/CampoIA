import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { NutritionLog } from '../../types/database'

const MEALS = ['Desayuno', 'Comida', 'Cena', 'Snack']
const QUALITY: [string, string, string][] = [['good', '🟢', 'Buena'], ['regular', '🟡', 'Regular'], ['bad', '🔴', 'Mejorable']]

export default function PortalNutrition({ pd }: { pd: PlayerData }) {
  const { profile } = pd
  const [meal, setMeal] = useState('Desayuno')
  const [desc, setDesc] = useState('')
  const [quality, setQuality] = useState('good')
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState<NutritionLog[]>([])

  async function load() {
    const d = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('nutrition_logs').select('*').eq('player_id', profile!.id).eq('date', d)
      .order('created_at', { ascending: true })
    setToday((data as NutritionLog[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!desc.trim()) return
    setBusy(true)
    await supabase.from('nutrition_logs').insert([{
      coach_id: profile!.coach_id, player_id: profile!.id, date: new Date().toISOString().slice(0, 10),
      meal_type: meal, description: desc.trim(), quality,
    }])
    setBusy(false); setDesc(''); load()
  }

  const goodCount = today.filter(t => t.quality === 'good').length
  const score = today.length ? Math.round(goodCount / today.length * 100) : 0

  return (
    <div>
      <h1 className="h-page text-[28px] mb-5">Mi comida de hoy</h1>

      <div className="card p-6 mb-5">
        <div className="eyebrow mb-3">¿Qué comida?</div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {MEALS.map(m => (
            <button key={m} onClick={() => setMeal(m)}
                    className={`py-2.5 rounded-xl text-[13px] font-medium transition ${meal === m ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{m}</button>
          ))}
        </div>
        <div className="eyebrow mb-3">¿Qué comiste?</div>
        <input className="field mb-5" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Pollo, arroz y verduras" />
        <div className="eyebrow mb-3">¿Cómo de saludable?</div>
        <div className="flex gap-2 mb-5">
          {QUALITY.map(([q, emoji, label]) => (
            <button key={q} onClick={() => setQuality(q)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition flex items-center justify-center gap-1.5 ${quality === q ? 'bg-canvas ring-2 ring-ink' : 'bg-canvas'}`}>
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>
        <button onClick={save} disabled={busy} className="btn-ink w-full justify-center">{busy ? '...' : 'Añadir'}</button>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="eyebrow">Hoy · {today.length} comidas</div>
          {today.length > 0 && <span className="chip bg-volt text-ink font-semibold">{score}% saludable</span>}
        </div>
        {today.length === 0 && <p className="text-muted text-[13px]">Aún no has registrado nada hoy.</p>}
        {today.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
            <span className="text-[16px]">{QUALITY.find(q => q[0] === t.quality)?.[1] ?? '⚪'}</span>
            <div className="flex-1"><div className="text-[14px] text-ink">{t.description}</div><div className="text-[11px] text-muted">{t.meal_type}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
}
