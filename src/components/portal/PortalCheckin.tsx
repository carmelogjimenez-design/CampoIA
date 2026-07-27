import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { CheckIn } from '../../types/database'

const MOODS = ['😄', '🙂', '😐', '😕', '😣']
const ENERGY = ['Alta', 'Media', 'Baja']

export default function PortalCheckin({ pd }: { pd: PlayerData }) {
  const { profile } = pd
  const [mood, setMood] = useState('')
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [history, setHistory] = useState<CheckIn[]>([])

  async function load() {
    const { data } = await supabase.from('check_ins').select('*').eq('player_id', profile!.id)
      .order('date', { ascending: false }).limit(7)
    setHistory((data as CheckIn[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!mood && !energy && !sleep) return
    setBusy(true)
    await supabase.from('check_ins').insert([{
      coach_id: profile!.coach_id, player_id: profile!.id, date: new Date().toISOString().slice(0, 10),
      mood, energy, sleep_hours: sleep ? parseFloat(sleep) : null, notes: notes.trim() || null,
    }])
    setBusy(false); setOk(true); setMood(''); setEnergy(''); setSleep(''); setNotes('')
    load(); setTimeout(() => setOk(false), 2500)
  }

  return (
    <div>
      <h1 className="h-page text-[28px] mb-5">¿Cómo estás hoy?</h1>

      <div className="card p-6 mb-5">
        <div className="eyebrow mb-3">Ánimo</div>
        <div className="flex justify-between mb-6">
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setMood(m)}
                    className={`w-12 h-12 rounded-full text-[22px] transition ${mood === m ? 'bg-volt scale-110' : 'bg-canvas'}`}>{m}</button>
          ))}
        </div>

        <div className="eyebrow mb-3">Energía</div>
        <div className="flex gap-2 mb-6">
          {ENERGY.map(e => (
            <button key={e} onClick={() => setEnergy(e)}
                    className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${energy === e ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{e}</button>
          ))}
        </div>

        <div className="eyebrow mb-3">Horas de sueño</div>
        <input type="number" step="0.5" className="field mb-5" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="Ej: 8" />

        <div className="eyebrow mb-3">¿Algo que contar? (opcional)</div>
        <textarea className="field mb-5" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Molestias, cómo te sientes…" />

        <button onClick={save} disabled={busy} className="btn-ink w-full justify-center">{busy ? '...' : 'Enviar a mi coach'}</button>
        {ok && <div className="text-center text-[13px] text-ink mt-3">✓ Registrado. ¡Gracias!</div>}
      </div>

      {history.length > 0 && (
        <div className="card p-6">
          <div className="eyebrow mb-4">Tus últimos días</div>
          {history.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
              <span className="text-[20px]">{c.mood || '—'}</span>
              <div className="flex-1"><div className="text-[13px] text-ink">{c.energy || '—'} energía</div><div className="text-[11px] text-muted tnum">{c.date}{c.sleep_hours ? ` · ${c.sleep_hours}h sueño` : ''}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
