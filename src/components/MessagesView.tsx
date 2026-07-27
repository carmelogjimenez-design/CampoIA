import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Message } from '../types/database'
import { initials } from '../lib/players'

interface Props { players: Player[]; coachId: string }

export default function MessagesView({ players, coachId }: Props) {
  const [selected, setSelected] = useState<Player | null>(players[0] ?? null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')

  async function load(playerId: string) {
    const { data } = await supabase.from('messages').select('*')
      .eq('coach_id', coachId).eq('player_id', playerId).order('created_at', { ascending: true })
    setMsgs((data as Message[]) ?? [])
  }
  useEffect(() => { if (selected) load(selected.id) }, [selected, coachId])

  async function send() {
    if (!text.trim() || !selected) return
    await supabase.from('messages').insert([{
      coach_id: coachId, player_id: selected.id, sender: 'coach', from_role: 'coach', text: text.trim(), read: false,
    }])
    setText(''); load(selected.id)
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Mensajes</h1>
      <div className="grid grid-cols-[220px_1fr] gap-4 h-[70vh]">
        <div className="bg-white rounded-2xl border border-line p-2 overflow-y-auto">
          {players.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl text-left ${selected?.id === p.id ? 'bg-canvas' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-xs font-bold text-sub">{initials(p.name)}</div>
              <span className="text-sm font-medium truncate">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-line flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {msgs.map(m => (
              <div key={m.id} className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'coach' ? 'ml-auto bg-ink text-white' : 'bg-canvas text-ink'}`}>
                {m.text}
              </div>
            ))}
            {!msgs.length && <p className="text-muted text-sm text-center mt-8">Sin mensajes. Escribe el primero.</p>}
          </div>
          <div className="p-3 border-t border-line flex gap-2">
            <input className="flex-1 bg-canvas border border-line rounded-xl px-3 py-2 text-sm outline-none"
                   value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                   placeholder="Escribe un mensaje..." />
            <button onClick={send} className="bg-ink text-white rounded-xl px-4 font-semibold">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
