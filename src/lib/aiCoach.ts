import { supabase } from './supabase'
import { Player } from '../types/database'
import { posLabel } from './positions'

export function playerContextString(p?: Player): string {
  if (!p) return 'Sin jugador seleccionado.'
  return `Jugador: ${p.name}. Demarcación: ${posLabel(p.pos, p.pos_group)}. `
    + `${p.age ? `Edad: ${p.age}. ` : ''}${p.club ? `Club: ${p.club}. ` : ''}`
    + `${p.foot ? `Pie: ${p.foot}. ` : ''}${p.height_cm ? `Altura: ${p.height_cm}cm. ` : ''}${p.weight_kg ? `Peso: ${p.weight_kg}kg. ` : ''}`
}

export async function askAI(opts: {
  question: string; playerContext: string
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-api`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_KEY,
    },
    body: JSON.stringify({
      mode: 'chat', question: opts.question, playerContext: opts.playerContext,
      coachName: 'el coach', conversation: opts.conversation ?? [],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  if (!json.text) throw new Error('La IA respondió vacío' + (json.finishReason ? ` (${json.finishReason})` : ''))
  return json.text as string
}
