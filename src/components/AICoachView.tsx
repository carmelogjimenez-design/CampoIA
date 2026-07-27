import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { useAuth } from '../context/AuthContext'

interface Props { players: Player[] }
interface Msg { role: 'user' | 'assistant'; text: string }

export default function AICoachView({ players }: Props) {
  const { session } = useAuth()
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat, busy])

  function playerContext(): string {
    const p = players.find(x => x.id === playerId)
    if (!p) return 'Sin jugador seleccionado.'
    return `Jugador: ${p.name}. Posición: ${p.pos_group ?? '—'}${p.pos ? ` (${p.pos})` : ''}. `
      + `${p.age ? `Edad: ${p.age}. ` : ''}${p.club ? `Club: ${p.club}. ` : ''}`
      + `${p.foot ? `Pie: ${p.foot}. ` : ''}${p.height_cm ? `Altura: ${p.height_cm}cm. ` : ''}${p.weight_kg ? `Peso: ${p.weight_kg}kg. ` : ''}`
  }

  async function ask() {
    if (!question.trim()) return
    const q = question.trim()
    setChat(c => [...c, { role: 'user', text: q }])
    setQuestion(''); setBusy(true); setError('')
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_KEY,
        },
        body: JSON.stringify({
          mode: 'chat',
          question: q,
          playerContext: playerContext(),
          coachName: 'el coach',
          conversation: chat.map(m => ({ role: m.role, text: m.text })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
      setChat(c => [...c, { role: 'assistant', text: json.text || 'Sin respuesta.' }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con la IA')
    } finally { setBusy(false) }
  }

  const suggestions = ['¿Qué plan de trabajo semanal recomiendas?', 'Dame 3 ejercicios para mejorar su resistencia', '¿Cómo puedo motivarle esta semana?']

  return (
    <div className="animate-[fadeIn_.4s_ease] flex flex-col h-[calc(100vh-120px)]">
      <header className="mb-5 flex items-end justify-between">
        <div><div className="eyebrow mb-2">Herramientas</div><h1 className="h-page text-[40px] leading-none">IA Coach</h1></div>
        <select className="bg-paper border border-line rounded-full px-4 py-2 text-[13px] font-medium outline-none" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </header>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.length === 0 && !busy && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center mb-4"><span className="text-volt text-[22px]">✦</span></div>
              <p className="text-ink font-medium text-[16px]">Tu asistente táctico</p>
              <p className="text-muted text-[14px] mt-1 mb-5">Pregúntame sobre el desarrollo de {players.find(p => p.id === playerId)?.name.split(' ')[0] ?? 'tu jugador'}.</p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {suggestions.map(s => <button key={s} onClick={() => setQuestion(s)} className="text-[13px] text-sub border border-line rounded-xl px-4 py-2.5 hover:bg-canvas transition">{s}</button>)}
              </div>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`max-w-[75%] px-4 py-3 rounded-2xl text-[14px] whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-ink text-paper' : 'bg-canvas text-ink'}`}>{m.text}</div>
          ))}
          {busy && <div className="bg-canvas text-muted px-4 py-3 rounded-2xl text-[14px] w-fit">Pensando…</div>}
          {error && <div className="bg-canvas border border-line text-ink px-4 py-3 rounded-2xl text-[13px]">⚠ {error}</div>}
          <div ref={endRef} />
        </div>
        <div className="p-4 border-t border-line flex gap-2">
          <input className="flex-1 bg-canvas rounded-full px-4 py-3 text-[14px] outline-none" value={question}
                 onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Escribe tu pregunta…" />
          <button onClick={ask} disabled={busy} className="btn-ink px-6">Enviar</button>
        </div>
      </div>
    </div>
  )
}
