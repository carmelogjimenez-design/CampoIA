import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { useAuth } from '../context/AuthContext'
import { posLabel } from '../lib/positions'
import ExportPlanModal, { parsePlan, ParsedPlan } from './ExportPlanModal'
import { generateDietPDF } from '../lib/dietPdf'
import { parseDietPlan, saveMealPlan } from '../lib/mealPlan'

interface Props { players: Player[] }
interface Msg { role: 'user' | 'assistant'; text: string; plan?: ParsedPlan | null; diet?: boolean }

export default function AICoachView({ players }: Props) {
  const { session } = useAuth()
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [exportPlan, setExportPlan] = useState<ParsedPlan | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignedMsg, setAssignedMsg] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const coachId = session?.user.id ?? ''
  const player = players.find(p => p.id === playerId)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat, busy])

  function baseContext(p?: Player): string {
    if (!p) return 'Sin jugador seleccionado.'
    return `Jugador: ${p.name}. Demarcación: ${posLabel(p.pos, p.pos_group)}. `
      + `${p.age ? `Edad: ${p.age}. ` : ''}${p.club ? `Club: ${p.club}. ` : ''}`
      + `${p.foot ? `Pie: ${p.foot}. ` : ''}${p.height_cm ? `Altura: ${p.height_cm}cm. ` : ''}${p.weight_kg ? `Peso: ${p.weight_kg}kg. ` : ''}`
  }

  async function callAI(q: string, ctx: string, conv: Msg[]): Promise<string> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-api`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_KEY,
      },
      body: JSON.stringify({ mode: 'chat', question: q, playerContext: ctx, coachName: 'el coach', conversation: conv.map(m => ({ role: m.role, content: m.text })) }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    if (!json.text) throw new Error('La IA respondió vacío' + (json.finishReason ? ` (${json.finishReason})` : ''))
    return json.text
  }

  async function ask() {
    if (!question.trim()) return
    const q = question.trim()
    const prev = chat
    setChat(c => [...c, { role: 'user', text: q }])
    setQuestion(''); setBusy(true); setError('')
    try {
      const text = await callAI(q, baseContext(player), prev)
      const { visible, plan } = parsePlan(text)
      setChat(c => [...c, { role: 'assistant', text: visible, plan }])
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al conectar con la IA') } finally { setBusy(false) }
  }

  async function askDiet() {
    if (!player) return
    setBusy(true); setError('')
    setChat(c => [...c, { role: 'user', text: '🥗 Genera un plan nutricional mensual' }])
    try {
      // Enriquecer contexto con la carga de entrenamientos
      const { data: sessions } = await supabase.from('training_sessions').select('type, date').eq('player_id', player.id)
      const total = sessions?.length ?? 0
      const byType: Record<string, number> = {}
      sessions?.forEach(s => { byType[s.type ?? 'General'] = (byType[s.type ?? 'General'] ?? 0) + 1 })
      const load = total ? `Carga de entrenamiento: ${total} sesiones registradas (${Object.entries(byType).map(([t, n]) => `${n} ${t}`).join(', ')}).` : 'Carga de entrenamiento: aún sin sesiones registradas, asume carga moderada de un futbolista joven.'
      const ctx = baseContext(player) + load

      const q = `Crea un PLAN NUTRICIONAL MENSUAL COMPLETO para este jugador, teniendo en cuenta su edad, altura, peso y carga de entrenamientos. Desarrolla el CALENDARIO SEMANAL con los 7 días (Lunes a Domingo) uno por uno, cada día con TODAS sus comidas (desayuno, media mañana, comida, merienda, pre-entreno, post-entreno y cena) y platos variados sin repetir entre días. Añade el diagnóstico, las pautas de hidratación, y la rotación para las 4 semanas del mes. Sé extenso y completo, no te quedes corto. Recuerda que es un deportista joven en crecimiento: enfoque saludable, para crecer y rendir, nunca restrictivo.`
      const text = await callAI(q, ctx, [])
      const { visible } = parsePlan(text)
      setChat(c => [...c, { role: 'assistant', text: visible, diet: true }])
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setBusy(false) }
  }

  async function assignMealPlan(dietText: string) {
    if (!player) return
    setAssigning(true); setAssignedMsg('')
    const items = parseDietPlan(dietText)
    if (!items.length) { setAssignedMsg('No pude detectar el calendario. Pídele que incluya los días (Lunes, Martes…).'); setAssigning(false); return }
    const ok = await saveMealPlan(player.id, coachId, items)
    setAssignedMsg(ok ? `✓ Plan asignado a ${player.name.split(' ')[0]} (${items.length} comidas). Ya lo ve en su portal.` : 'Error al guardar. ¿Ejecutaste el SQL de meal plans?')
    setAssigning(false)
  }

  const suggestions = ['¿Qué plan de trabajo semanal recomiendas?', 'Dame 3 ejercicios específicos para su posición', '¿Cómo puedo motivarle esta semana?']

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
              <p className="text-muted text-[14px] mt-1 mb-5">Pregúntame sobre el desarrollo de {player?.name.split(' ')[0] ?? 'tu jugador'}.</p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {suggestions.map(s => <button key={s} onClick={() => setQuestion(s)} className="text-[13px] text-sub border border-line rounded-xl px-4 py-2.5 hover:bg-canvas transition">{s}</button>)}
                <button onClick={askDiet} className="text-[13px] font-semibold text-ink bg-volt rounded-xl px-4 py-2.5 hover:brightness-95 transition">🥗 Plan nutricional mensual</button>
              </div>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[14px] whitespace-pre-wrap ${m.role === 'user' ? 'bg-ink text-paper' : 'bg-canvas text-ink'}`}>
                {m.text}
                {m.plan && <button onClick={() => setExportPlan(m.plan!)} className="mt-3 flex items-center gap-2 bg-volt text-ink font-semibold rounded-full px-4 py-2 text-[13px] hover:brightness-95 transition">⚡ Convertir en plan <span className="opacity-70 font-normal">({m.plan.sessions.length} ses · {m.plan.tasks.length} tareas)</span></button>}
                {m.diet && player && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => generateDietPDF(player, m.text)} className="flex items-center gap-2 bg-ink text-paper font-semibold rounded-full px-4 py-2 text-[13px] hover:brightness-110 transition">↓ Descargar PDF</button>
                      <button onClick={() => assignMealPlan(m.text)} disabled={assigning} className="flex items-center gap-2 bg-volt text-ink font-semibold rounded-full px-4 py-2 text-[13px] hover:brightness-95 transition">{assigning ? 'Asignando…' : '📋 Asignar al jugador'}</button>
                    </div>
                    {assignedMsg && <div className="text-[12px] text-sub">{assignedMsg}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="bg-canvas text-muted px-4 py-3 rounded-2xl text-[14px] w-fit">Pensando…</div>}
          {error && <div className="bg-canvas border border-line text-ink px-4 py-3 rounded-2xl text-[13px]">⚠ {error}</div>}
          <div ref={endRef} />
        </div>
        <div className="p-4 border-t border-line flex gap-2">
          <button onClick={askDiet} disabled={busy} title="Plan nutricional mensual" className="shrink-0 w-11 h-11 rounded-full bg-canvas hover:bg-volt transition flex items-center justify-center text-[18px]">🥗</button>
          <input className="flex-1 bg-canvas rounded-full px-4 py-3 text-[14px] outline-none" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Escribe tu pregunta…" />
          <button onClick={ask} disabled={busy} className="btn-ink px-6">Enviar</button>
        </div>
      </div>

      {exportPlan && <ExportPlanModal plan={exportPlan} playerId={playerId} coachId={coachId} onClose={() => setExportPlan(null)} onDone={() => {}} />}
    </div>
  )
}
