import { useState } from 'react'
import { Player } from '../types/database'
import { supabase } from '../lib/supabase'
import { askAI, playerContextString } from '../lib/aiCoach'
import { generateReport, ReportType, Frequency } from '../lib/reportGenerator'
import { parsePlan, ParsedPlan } from './ExportPlanModal'
import Modal from './Modal'

// ── Análisis IA rápido desde la ficha ──
export function PlayerAIModal({ player, onClose, onExport }: { player: Player; onClose: () => void; onExport: (p: ParsedPlan) => void }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [plan, setPlan] = useState<ParsedPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const quick = ['Analiza su perfil y dame 3 focos de mejora', 'Plan de trabajo para esta semana', 'Puntos fuertes y débiles']

  async function run(question: string) {
    setBusy(true); setError(''); setAnswer(''); setPlan(null)
    try {
      const text = await askAI({ question, playerContext: playerContextString(player) })
      const { visible, plan } = parsePlan(text)
      setAnswer(visible); setPlan(plan)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setBusy(false) }
  }

  return (
    <Modal title={`Análisis IA · ${player.name.split(' ')[0]}`} onClose={onClose} wide>
      {!answer && !busy && (
        <div className="space-y-2 mb-4">
          {quick.map(s => <button key={s} onClick={() => run(s)} className="w-full text-left text-[14px] text-sub border border-line rounded-xl px-4 py-3 hover:bg-canvas transition">{s}</button>)}
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-canvas rounded-xl px-3.5 py-2.5 text-[14px] outline-none" value={q} onChange={e => setQ(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && q.trim() && run(q)} placeholder="Pregunta algo sobre el jugador…" />
        <button onClick={() => q.trim() && run(q)} disabled={busy} className="btn-ink">{busy ? '...' : 'Preguntar'}</button>
      </div>
      {busy && <p className="text-muted text-[14px]">Pensando…</p>}
      {error && <div className="bg-canvas border border-line text-ink text-[13px] rounded-xl px-4 py-3">⚠ {error}</div>}
      {answer && (
        <div className="bg-canvas rounded-xl p-4 text-[14px] text-ink whitespace-pre-wrap max-h-[45vh] overflow-y-auto">{answer}
          {plan && <button onClick={() => onExport(plan)} className="mt-3 flex items-center gap-2 bg-volt text-ink font-semibold rounded-full px-4 py-2 text-[13px]">⚡ Convertir en plan ({plan.sessions.length}+{plan.tasks.length})</button>}
        </div>
      )}
    </Modal>
  )
}

// ── Importar temporada: pega texto, la IA lo estructura ──
export function ImportSeasonModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!text.trim()) return
    setBusy(true); setError(''); setResult('')
    try {
      const out = await askAI({
        playerContext: playerContextString(player),
        question: `Estructura este histórico de temporada del jugador en un resumen claro por bloques (partidos, rendimiento, evolución). Texto:\n${text.slice(0, 3000)}`,
      })
      setResult(out)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setBusy(false) }
  }

  return (
    <Modal title="Importar temporada" onClose={onClose} wide>
      <p className="text-sub text-[14px] mb-3">Pega el histórico de la temporada (partidos, notas, datos) y la IA lo estructurará.</p>
      <textarea className="field mb-3" rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Pega aquí el texto de la temporada…" />
      <div className="flex justify-end gap-2 mb-4"><button onClick={onClose} className="btn-line">Cerrar</button><button onClick={run} disabled={busy || !text.trim()} className="btn-ink">{busy ? 'Procesando…' : 'Estructurar con IA'}</button></div>
      {error && <div className="bg-canvas border border-line text-ink text-[13px] rounded-xl px-4 py-3">⚠ {error}</div>}
      {result && <div className="bg-canvas rounded-xl p-4 text-[14px] text-ink whitespace-pre-wrap max-h-[40vh] overflow-y-auto">{result}</div>}
    </Modal>
  )
}

// ── Informe rápido desde la ficha ──
export function QuickReportModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [type, setType] = useState<ReportType>('club')
  const [freq, setFreq] = useState<Frequency>('mensual')
  const [busy, setBusy] = useState(false)
  const TYPES: [ReportType, string][] = [['familia', 'Familia'], ['club', 'Club'], ['agente', 'Agente']]
  const FREQS: [Frequency, string][] = [['semanal', 'Semanal'], ['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['anual', 'Anual']]

  async function gen() {
    setBusy(true)
    try {
      const [mt, tr, ck, nu, pt] = await Promise.all([
        supabase.from('matches').select('*').eq('player_id', player.id),
        supabase.from('training_sessions').select('*').eq('player_id', player.id),
        supabase.from('check_ins').select('*').eq('player_id', player.id),
        supabase.from('nutrition_logs').select('*').eq('player_id', player.id),
        supabase.from('physical_tests').select('*').eq('player_id', player.id),
      ])
      const base = player.score ?? 70
      const attrs: [string, number][] = player.ai_attributes && Object.keys(player.ai_attributes).length
        ? Object.entries(player.ai_attributes).map(([k, v]) => [k, Math.round(Number(v))])
        : [['Técnica', base - 4], ['Táctica', base - 7], ['Físico', base - 10], ['Mental', base - 2], ['Velocidad', base - 8]]
      generateReport(type, freq, { player, matches: mt.data ?? [], sessions: tr.data ?? [], checkins: ck.data ?? [], nutrition: nu.data ?? [], tests: pt.data ?? [] }, attrs)
    } finally { setBusy(false); onClose() }
  }

  return (
    <Modal title="Descargar informe" onClose={onClose}>
      <div className="eyebrow mb-2">Tipo</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TYPES.map(([id, l]) => <button key={id} onClick={() => setType(id)} className={`py-2.5 rounded-xl text-[13px] font-medium ${type === id ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{l}</button>)}
      </div>
      <div className="eyebrow mb-2">Frecuencia</div>
      <div className="flex gap-2 mb-5">
        {FREQS.map(([id, l]) => <button key={id} onClick={() => setFreq(id)} className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium ${freq === id ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{l}</button>)}
      </div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-line">Cancelar</button><button onClick={gen} disabled={busy} className="btn-volt">{busy ? 'Generando…' : 'Descargar PDF'}</button></div>
    </Modal>
  )
}
