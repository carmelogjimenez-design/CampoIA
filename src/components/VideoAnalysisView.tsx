import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, VideoAnalysis } from '../types/database'
import { getPlayerName } from '../lib/players'

interface Props { players: Player[]; coachId: string }

export default function VideoAnalysisView({ players, coachId }: Props) {
  const [items, setItems] = useState<VideoAnalysis[]>([])
  const [show, setShow] = useState(false)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('video_analysis').select('*').eq('coach_id', coachId).order('created_at', { ascending: false })
    setItems((data as VideoAnalysis[]) ?? [])
  }
  useEffect(() => { load() }, [coachId])

  async function save() {
    if (!title.trim() || !url.trim() || !playerId) return
    setBusy(true)
    await supabase.from('video_analysis').insert([{
      coach_id: coachId, player_id: playerId, title: title.trim(),
      video_url: url.trim(), video_type: 'link', comment: comment.trim() || null,
    }])
    setBusy(false); setShow(false); setTitle(''); setUrl(''); setComment(''); load()
  }

  const inp = 'w-full bg-canvas border border-line rounded-xl px-3 py-2 outline-none focus:border-campo-violet text-sm'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Vídeo análisis</h1>
          <p className="text-sub mt-1">Comparte vídeos con comentarios para tus jugadores</p>
        </div>
        <button onClick={() => setShow(true)} className="bg-ink text-white font-semibold rounded-xl px-4 py-2.5">+ Nuevo análisis</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map(v => (
          <div key={v.id} className="bg-white rounded-2xl border border-line p-4">
            <div className="flex justify-between items-start mb-1">
              <div className="font-semibold text-ink">{v.title}</div>
              <span className="text-[10px] bg-canvas text-sub px-2 py-0.5 rounded-full">{getPlayerName(players, v.player_id)}</span>
            </div>
            {v.comment && <p className="text-sm text-sub mb-2">{v.comment}</p>}
            {v.video_url && <a href={v.video_url} target="_blank" className="text-sm text-campo-blue font-medium">▶ Ver vídeo</a>}
          </div>
        ))}
        {!items.length && <p className="text-muted py-8">Sin análisis aún.</p>}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div className="bg-white rounded-2xl shadow-apple-lg w-full max-w-md p-6">
            <h2 className="font-display font-extrabold text-xl text-ink mb-4">Nuevo vídeo análisis</h2>
            <label className="block text-xs font-bold text-sub mb-1">JUGADOR</label>
            <select className={inp + ' mb-3'} value={playerId} onChange={e => setPlayerId(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="block text-xs font-bold text-sub mb-1">TÍTULO</label>
            <input className={inp + ' mb-3'} value={title} onChange={e => setTitle(e.target.value)} />
            <label className="block text-xs font-bold text-sub mb-1">ENLACE DE VÍDEO (YouTube, Drive...)</label>
            <input className={inp + ' mb-3'} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            <label className="block text-xs font-bold text-sub mb-1">COMENTARIO</label>
            <textarea className={inp + ' mb-5'} rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Qué quieres que observe..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-sub font-medium">Cancelar</button>
              <button onClick={save} disabled={busy} className="px-5 py-2 bg-ink text-white font-semibold rounded-xl disabled:opacity-60">{busy ? '...' : 'Compartir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
