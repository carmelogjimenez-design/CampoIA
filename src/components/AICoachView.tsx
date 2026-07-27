import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'

interface Props { players: Player[] }

export default function AICoachView({ players }: Props) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function ask() {
    if (!question.trim()) return
    setBusy(true); setError(''); setAnswer('')
    const player = players.find(p => p.id === playerId)
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ mode: 'chat', question, player: player?.name, playerData: player }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error de la IA')
      setAnswer(json.text || json.answer || JSON.stringify(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setBusy(false) }
  }

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-campo-violet text-sm'

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">IA Coach</h1>
      <p className="text-slate-500 mb-6">Pregunta a la IA sobre el desarrollo de tus jugadores</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-2xl">
        <label className="block text-xs font-bold text-slate-600 mb-1">JUGADOR (contexto)</label>
        <select className={inp + ' mb-3'} value={playerId} onChange={e => setPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="block text-xs font-bold text-slate-600 mb-1">TU PREGUNTA</label>
        <textarea className={inp + ' mb-3'} rows={3} value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="Ej: ¿Qué plan de trabajo recomiendas para mejorar su resistencia?" />
        <button onClick={ask} disabled={busy} className="bg-ink text-white font-semibold rounded-xl px-5 py-2.5 disabled:opacity-60">
          {busy ? 'Pensando…' : 'Preguntar a la IA'}
        </button>
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mt-4">{error}</div>}
        {answer && <div className="bg-slate-50 rounded-xl p-4 mt-4 text-sm text-slate-700 whitespace-pre-wrap">{answer}</div>}
      </div>
    </div>
  )
}
