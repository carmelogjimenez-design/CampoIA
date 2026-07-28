import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Player, PhysicalTest } from '../types/database'
import { TEST_METRICS, improvement } from '../lib/physicalTests'
import Modal from './Modal'

interface Props { player: Player; coachId: string; onClose: () => void }

export default function PhysicalTestModal({ player, coachId, onClose }: Props) {
  const [tests, setTests] = useState<PhysicalTest[]>([])
  const [phase, setPhase] = useState<'inicial' | 'final'>('inicial')
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'compare' | 'edit'>('compare')

  async function load() {
    const { data } = await supabase.from('physical_tests').select('*').eq('player_id', player.id).order('date', { ascending: true })
    setTests((data as PhysicalTest[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const inicial = tests.find(t => t.phase === 'inicial')
  const final = tests.find(t => t.phase === 'final')

  function startEdit(p: 'inicial' | 'final') {
    setPhase(p)
    const existing = tests.find(t => t.phase === p)
    const v: Record<string, string> = {}
    TEST_METRICS.forEach(m => { const val = existing?.[m.key as keyof PhysicalTest]; v[m.key] = val != null ? String(val) : '' })
    setVals(v); setView('edit')
  }

  async function save() {
    setBusy(true)
    const existing = tests.find(t => t.phase === phase)
    const payload: any = { coach_id: coachId, player_id: player.id, phase, date: new Date().toISOString().slice(0, 10) }
    TEST_METRICS.forEach(m => { payload[m.key] = vals[m.key] ? parseFloat(vals[m.key]) : null })
    if (existing) await supabase.from('physical_tests').update(payload).eq('id', existing.id)
    else await supabase.from('physical_tests').insert([payload])
    setBusy(false); await load(); setView('compare')
  }

  return (
    <Modal title="Prueba diagnóstica física" onClose={onClose} wide>
      {view === 'compare' ? (
        <>
          <div className="flex gap-2 mb-5">
            <button onClick={() => startEdit('inicial')} className={`flex-1 py-3 rounded-xl text-[13px] font-medium border transition ${inicial ? 'border-ink bg-canvas' : 'border-dashed border-line-strong text-sub'}`}>
              {inicial ? '✓ ' : '+ '}Test Inicial{inicial ? ` · ${inicial.date}` : ''}
            </button>
            <button onClick={() => startEdit('final')} className={`flex-1 py-3 rounded-xl text-[13px] font-medium border transition ${final ? 'border-ink bg-canvas' : 'border-dashed border-line-strong text-sub'}`}>
              {final ? '✓ ' : '+ '}Test Final{final ? ` · ${final.date}` : ''}
            </button>
          </div>

          {!inicial && !final && <p className="text-muted text-[14px] text-center py-6">Registra el test inicial en pretemporada y el final al acabar la temporada para ver la evolución real.</p>}

          {(inicial || final) && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted px-1">
                <span>Prueba</span><span className="w-14 text-right">Inicial</span><span className="w-14 text-right">Final</span><span className="w-16 text-right">Mejora</span>
              </div>
              {TEST_METRICS.map(m => {
                const ini = inicial?.[m.key as keyof PhysicalTest] as number | null ?? null
                const fin = final?.[m.key as keyof PhysicalTest] as number | null ?? null
                const imp = improvement(m, ini, fin)
                return (
                  <div key={m.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center py-2 border-b border-line last:border-0">
                    <div><div className="text-[14px] text-ink">{m.label}</div><div className="text-[10px] text-muted">{m.unit} · {m.better === 'up' ? 'más = mejor' : 'menos = mejor'}</div></div>
                    <span className="stat-num text-[15px] w-14 text-right">{ini ?? '—'}</span>
                    <span className="stat-num text-[15px] w-14 text-right">{fin ?? '—'}</span>
                    <span className="w-16 text-right">
                      {imp != null ? <span className={`chip ${imp >= 0 ? 'bg-volt text-ink' : 'bg-canvas'}`}>{imp >= 0 ? '+' : ''}{imp.toFixed(1)}%</span> : <span className="text-faint text-[12px]">—</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end mt-6"><button onClick={onClose} className="btn-ink">Cerrar</button></div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setView('compare')} className="text-[13px] text-muted hover:text-ink">← Volver</button>
            <span className="text-[15px] font-semibold text-ink ml-2">Test {phase === 'inicial' ? 'Inicial' : 'Final'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TEST_METRICS.map(m => (
              <div key={m.key}>
                <label className="eyebrow block mb-1.5">{m.label} <span className="text-faint normal-case">({m.unit})</span></label>
                <input type="number" step="0.1" className="field" value={vals[m.key] ?? ''} onChange={e => setVals(v => ({ ...v, [m.key]: e.target.value }))} placeholder="—" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6"><button onClick={() => setView('compare')} className="btn-line">Cancelar</button><button onClick={save} disabled={busy} className="btn-ink">{busy ? '...' : 'Guardar test'}</button></div>
        </>
      )}
    </Modal>
  )
}
