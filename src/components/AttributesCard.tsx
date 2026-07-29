import { useState } from 'react'
import { Player } from '../types/database'
import {
  ATTR_KEYS, getAttributes, blankAttributes, attributeAverage,
  saveAttributes, clearAttributes, SOURCE_LABEL,
} from '../lib/attributes'
import { estimateAttributes } from '../lib/aiCoach'

interface Props { player: Player; onSaved: () => void }

export default function AttributesCard({ player, onSaved }: Props) {
  const set = getAttributes(player)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [aiNote, setAiNote] = useState('')

  const avg = attributeAverage(set)

  function startEdit() {
    setDraft(set.rated ? { ...blankAttributes(), ...set.values } : blankAttributes())
    setAiNote(''); setError(''); setEditing(true)
  }

  async function save() {
    setBusy('save'); setError('')
    const res = await saveAttributes(player.id, draft, aiNote ? 'ia' : 'coach')
    setBusy('')
    if (res.error) { setError(res.error); return }
    setEditing(false); onSaved()
  }

  async function reset() {
    setBusy('clear'); setError('')
    const res = await clearAttributes(player.id)
    setBusy('')
    if (res.error) { setError(res.error); return }
    setEditing(false); onSaved()
  }

  async function estimate() {
    setBusy('ai'); setError(''); setAiNote('')
    try {
      const { values, note } = await estimateAttributes(player)
      setDraft(v => ({ ...v, ...values }))
      setAiNote(note || 'Estimación de la IA. Ajústala a lo que ves en el campo.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La IA no respondió.')
    } finally { setBusy('') }
  }

  // ── Sin valorar: no enseñamos números falsos ──
  if (!set.rated && !editing) {
    return (
      <div className="card p-7">
        <div className="eyebrow mb-6">Atributos</div>
        <div className="text-center py-6">
          <p className="text-ink text-[15px] font-medium mb-1.5">Sin valorar</p>
          <p className="text-muted text-[13px] max-w-[280px] mx-auto mb-6 leading-relaxed">
            Puntúa a {player.name.split(' ')[0]} del 0 al 99 en cada faceta, o deja que la IA
            haga una primera estimación con sus datos.
          </p>
          <button onClick={startEdit} className="btn-ink text-[13px] px-5 py-2">Valorar atributos</button>
        </div>
      </div>
    )
  }

  // ── Modo edición ──
  if (editing) {
    return (
      <div className="card p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="eyebrow">Valorando atributos</div>
          <button onClick={() => setEditing(false)} className="text-[13px] text-muted hover:text-ink transition">Cancelar</button>
        </div>

        {error && <div className="card-line px-4 py-2.5 mb-4 text-[13px] text-ink">⚠ {error}</div>}
        {aiNote && (
          <div className="bg-volt/20 border border-volt rounded-xl px-4 py-3 mb-5 text-[13px] text-ink leading-relaxed">
            {aiNote}
          </div>
        )}

        <div className="space-y-5 mb-6">
          {ATTR_KEYS.map(k => (
            <div key={k}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[14px] text-ink">{k}</label>
                <span className="stat-num text-[15px] w-8 text-right">{draft[k] ?? 50}</span>
              </div>
              <input
                type="range" min={0} max={99} value={draft[k] ?? 50}
                onChange={e => setDraft(v => ({ ...v, [k]: Number(e.target.value) }))}
                className="w-full accent-ink cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-5 border-t border-line">
          <button onClick={estimate} disabled={!!busy} className="btn-line text-[13px]">
            {busy === 'ai' ? 'Estimando…' : '✦ Estimar con IA'}
          </button>
          <div className="flex-1" />
          {set.rated && (
            <button onClick={reset} disabled={!!busy} className="text-[13px] text-muted hover:text-ink px-2">
              {busy === 'clear' ? '…' : 'Borrar valoración'}
            </button>
          )}
          <button onClick={save} disabled={!!busy} className="btn-ink text-[13px]">
            {busy === 'save' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Valorado: barras + procedencia ──
  const maxAttr = Math.max(...Object.values(set.values), 1)
  return (
    <div className="card p-7">
      <div className="flex items-center justify-between mb-6">
        <div className="eyebrow">Atributos</div>
        <div className="flex items-center gap-3">
          {avg !== null && <span className="chip tnum">Media {avg}</span>}
          <button onClick={startEdit} className="text-[13px] text-muted hover:text-ink transition">Ajustar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
        {ATTR_KEYS.filter(k => k in set.values).map(k => (
          <div key={k}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[14px] text-ink">{k}</span>
              <span className="stat-num text-[15px]">{set.values[k]}</span>
            </div>
            <div className="bar-track">
              <div className={set.values[k] === maxAttr ? 'bar-fill-volt' : 'bar-fill'}
                   style={{ width: `${Math.min(100, set.values[k])}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-faint mt-6">
        {SOURCE_LABEL[set.source]}
        {set.updatedAt ? ` · ${new Date(set.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
      </p>
    </div>
  )
}
