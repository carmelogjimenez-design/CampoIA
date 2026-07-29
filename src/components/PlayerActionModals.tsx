import { useState } from 'react'
import { Player } from '../types/database'
import { supabase } from '../lib/supabase'
import { askAI, playerContextString, structureSeason, SeasonImport } from '../lib/aiCoach'
import { attributePairs } from '../lib/attributes'
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

// ── Importar temporada: la IA estructura el histórico y SE GUARDA ──
export function ImportSeasonModal({ player, onClose, onSaved }: { player: Player; onClose: () => void; onSaved?: () => void }) {
  const [text, setText] = useState('')
  const [data, setData] = useState<SeasonImport | null>(null)
  const [existing, setExisting] = useState(0)
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)

  async function structure() {
    if (!text.trim()) return
    setBusy('ai'); setError(''); setData(null)
    try {
      const out = await structureSeason(player, text)          // ← texto entero, sin recortar
      if (!out.matches.length) {
        setError('No he encontrado partidos en ese texto. Pega la tabla completa de la temporada, con las filas de cada jornada.')
      } else {
        const { count } = await supabase.from('matches')
          .select('*', { count: 'exact', head: true }).eq('player_id', player.id)
        setExisting(count ?? 0)
        setData(out)
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setBusy('') }
  }

  async function save() {
    if (!data) return
    setBusy('save'); setError('')
    try {
      if (replace && existing > 0) {
        const { error: delErr } = await supabase.from('matches').delete().eq('player_id', player.id)
        if (delErr) throw delErr
      }
      const rows = data.matches.map(m => ({
        coach_id: player.coach_id, player_id: player.id,
        date: m.date, rival: m.rival, result: m.result, mins: m.mins,
        called: m.role ? 'yes' : null, role: m.role,
        goals: m.goals, assists: m.assists, conceded: m.conceded,
        clean_sheet: m.clean_sheet, notes: m.notes,
      }))
      const { error: insErr } = await supabase.from('matches').insert(rows)
      if (insErr) throw insErr
      setSaved(rows.length)
      onSaved?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar los partidos.') }
    finally { setBusy('') }
  }

  // ── Guardado ──
  if (saved > 0) return (
    <Modal title="Temporada importada" onClose={onClose}>
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-volt flex items-center justify-center text-ink text-[24px] mx-auto mb-4">✓</div>
        <p className="text-ink text-[16px] font-medium mb-1.5">{saved} partidos guardados</p>
        <p className="text-muted text-[14px] leading-relaxed max-w-[280px] mx-auto mb-6">
          Ya están en su ficha: minutos, goles, convocatorias y porterías a cero se recalculan solos.
        </p>
        <button onClick={onClose} className="btn-ink">Ver la ficha</button>
      </div>
    </Modal>
  )

  // ── Vista previa antes de guardar ──
  if (data) {
    const withDate = data.matches.filter(m => m.date).length
    const totMins = data.matches.reduce((a, m) => a + (m.mins ?? 0), 0)
    const totGoals = data.matches.reduce((a, m) => a + (m.goals ?? 0), 0)
    const starts = data.matches.filter(m => m.role === 'titular').length

    return (
      <Modal title="Revisa antes de guardar" onClose={onClose} wide>
        {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">⚠ {error}</div>}

        <div className="grid grid-cols-4 gap-3 mb-5">
          {([['Partidos', data.matches.length], ['Titular', starts], ['Minutos', totMins], ['Goles', totGoals]] as [string, number][])
            .map(([l, v]) => (
              <div key={l} className="bg-canvas rounded-xl p-3 text-center">
                <div className="stat-num text-[22px] leading-none">{v}</div>
                <div className="text-[11px] text-muted mt-1">{l}</div>
              </div>
            ))}
        </div>

        {withDate < data.matches.length && (
          <p className="text-[12px] text-muted mb-4">
            {data.matches.length - withDate} partidos sin fecha reconocible. Se guardan igual; puedes editarlos después.
          </p>
        )}

        <div className="border border-line rounded-xl overflow-hidden mb-5">
          <div className="max-h-[34vh] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-canvas sticky top-0">
                <tr className="text-muted">
                  {['Fecha', 'Rival', 'Res.', 'Min', 'Rol', 'G', 'A'].map(h =>
                    <th key={h} className="text-left font-semibold px-2.5 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.matches.map((m, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-2.5 py-2 tnum text-sub whitespace-nowrap">{m.date ?? '—'}</td>
                    <td className="px-2.5 py-2 text-ink truncate max-w-[150px]">{m.rival ?? '—'}</td>
                    <td className="px-2.5 py-2 tnum text-sub">{m.result ?? '—'}</td>
                    <td className="px-2.5 py-2 tnum text-sub">{m.mins ?? '—'}</td>
                    <td className="px-2.5 py-2 text-sub">{m.role ?? '—'}</td>
                    <td className="px-2.5 py-2 tnum text-sub">{m.goals ?? 0}</td>
                    <td className="px-2.5 py-2 tnum text-sub">{m.assists ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {existing > 0 && (
          <div className="card-line p-4 mb-5">
            <p className="text-[13px] text-ink mb-3">
              Este jugador ya tiene <span className="font-semibold tnum">{existing}</span> partidos guardados.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setReplace(false)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium ${!replace ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                Añadir a los que hay
              </button>
              <button onClick={() => setReplace(true)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium ${replace ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                Reemplazar todos
              </button>
            </div>
          </div>
        )}

        {data.summary && (
          <div className="bg-canvas rounded-xl p-4 text-[13px] text-sub leading-relaxed mb-5">{data.summary}</div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={() => setData(null)} className="btn-line">Volver</button>
          <button onClick={save} disabled={!!busy} className="btn-volt">
            {busy === 'save' ? 'Guardando…' : `Guardar ${data.matches.length} partidos`}
          </button>
        </div>
      </Modal>
    )
  }

  // ── Pegar el histórico ──
  return (
    <Modal title="Importar temporada" onClose={onClose} wide>
      <p className="text-sub text-[14px] leading-relaxed mb-4">
        Pega el histórico entero de la temporada: la tabla de partidos de la federación, tus notas,
        lo que tengas. La IA saca partido a partido y lo guarda en su ficha.
      </p>
      <textarea className="field mb-2 font-mono text-[12px]" rows={9} value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Pega aquí la temporada completa…" />
      <p className="text-[12px] text-muted mb-4 tnum">
        {text.length.toLocaleString('es-ES')} caracteres{text.length > 40000 ? ' · puede tardar un poco' : ''}
      </p>
      {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">⚠ {error}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-line">Cerrar</button>
        <button onClick={structure} disabled={busy === 'ai' || !text.trim()} className="btn-ink">
          {busy === 'ai' ? 'Leyendo la temporada…' : 'Estructurar con IA'}
        </button>
      </div>
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
      const attrs = attributePairs(player)   // vacío si no está valorado: no inventamos
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
