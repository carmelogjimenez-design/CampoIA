import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerData } from '../../hooks/usePlayerData'
import { Message } from '../../types/database'

export default function PortalChat({ pd, onRead }: { pd: PlayerData; onRead?: () => void }) {
  const { profile } = pd
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data } = await supabase.from('messages').select('*').eq('player_id', profile!.id)
      .order('created_at', { ascending: true })
    setMsgs((data as Message[]) ?? [])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    // Marcar como leídos los mensajes del coach
    const { error } = await supabase.from('messages').update({ read: true })
      .eq('player_id', profile!.id).eq('from_role', 'coach').eq('read', false)
    if (!error) onRead?.()
  }
  useEffect(() => { load() }, [])

  async function send() {
    if (!text.trim()) return
    await supabase.from('messages').insert([{
      coach_id: profile!.coach_id, player_id: profile!.id, sender: 'player', from_role: 'player', text: text.trim(), read: false,
    }])
    setText(''); load()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <h1 className="h-page text-[28px] mb-5">Tu coach</h1>
      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {msgs.length === 0 && <p className="text-muted text-[13px] text-center mt-8">Escribe a tu coach.</p>}
          {msgs.map(m => (
            <div key={m.id} className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[14px] ${
              m.from_role === 'player' ? 'ml-auto bg-ink text-paper' : 'bg-canvas text-ink'}`}>{m.text}</div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-line flex gap-2">
          <input className="flex-1 bg-canvas rounded-full px-4 py-2.5 text-[14px] outline-none"
                 value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mensaje…" />
          <button onClick={send} className="btn-ink px-5">Enviar</button>
        </div>
      </div>
    </div>
  )
}
