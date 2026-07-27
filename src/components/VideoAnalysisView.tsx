import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, VideoAnalysis } from '../types/database'
import { getPlayerName, initials } from '../lib/players'
import Modal from './Modal'

interface Props { players: Player[]; coachId: string }

export default function VideoAnalysisView({ players, coachId }: Props) {
  const [items, setItems] = useState<VideoAnalysis[]>([])
  const [show, setShow] = useState(false)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'link' | 'file'>('link')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('video_analysis').select('*').eq('coach_id', coachId).order('created_at', { ascending: false })
    setItems((data as VideoAnalysis[]) ?? [])
  }
  useEffect(() => { load() }, [coachId])

  async function save() {
    if (!title.trim() || !playerId) { setError('Falta el título'); return }
    setBusy(true); setError('')
    let finalUrl = url.trim()
    try {
      if (mode === 'file') {
        if (!file) { setError('Selecciona un archivo'); setBusy(false); return }
        const path = `${playerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('video-analysis').upload(path, file, { upsert: false })
        if (upErr) throw new Error('No se pudo subir. ¿Creaste el bucket "video-analysis" y ejecutaste el SQL de permisos?')
        finalUrl = supabase.storage.from('video-analysis').getPublicUrl(path).data.publicUrl
      }
      if (!finalUrl) { setError('Falta el enlace o archivo'); setBusy(false); return }
      await supabase.from('video_analysis').insert([{
        coach_id: coachId, player_id: playerId, title: title.trim(),
        video_url: finalUrl, video_type: mode, comment: comment.trim() || null,
      }])
      setShow(false); setTitle(''); setUrl(''); setFile(null); setComment(''); load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setBusy(false) }
  }

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="flex items-end justify-between mb-7">
        <div><div className="eyebrow mb-2">Seguimiento</div><h1 className="h-page text-[40px] leading-none">Vídeo análisis</h1></div>
        <button onClick={() => setShow(true)} className="btn-ink">+ Nuevo análisis</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(v => (
          <div key={v.id} className="card overflow-hidden group">
            <div className="aspect-video bg-ink flex items-center justify-center relative">
              <span className="text-volt text-[32px]">▶</span>
              <span className="absolute top-3 right-3 chip bg-paper/90">{v.video_type === 'file' ? 'Archivo' : 'Enlace'}</span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub">{initials(getPlayerName(players, v.player_id))}</div>
                <span className="text-[12px] text-muted">{getPlayerName(players, v.player_id)}</span>
              </div>
              <div className="font-medium text-ink text-[15px] mb-1">{v.title}</div>
              {v.comment && <p className="text-[13px] text-sub mb-3">{v.comment}</p>}
              {v.video_url && <a href={v.video_url} target="_blank" className="btn-line text-[13px] px-4 py-2 inline-block">Ver vídeo</a>}
            </div>
          </div>
        ))}
        {!items.length && <div className="card p-12 text-center text-muted text-[14px] md:col-span-2 xl:col-span-3">Sin análisis. Comparte el primero.</div>}
      </div>

      {show && (
        <Modal title="Nuevo vídeo análisis" onClose={() => setShow(false)}>
          {error && <div className="bg-canvas border border-line text-ink text-[13px] rounded-xl px-4 py-2.5 mb-4">⚠ {error}</div>}
          <div className="mb-4"><label className="eyebrow block mb-2">Jugador</label>
            <select className="field" value={playerId} onChange={e => setPlayerId(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="mb-4"><label className="eyebrow block mb-2">Título</label><input className="field" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="mb-4">
            <label className="eyebrow block mb-2">Origen</label>
            <div className="flex gap-2">
              <button onClick={() => setMode('link')} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${mode === 'link' ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>Enlace</button>
              <button onClick={() => setMode('file')} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${mode === 'file' ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>Subir archivo</button>
            </div>
          </div>
          {mode === 'link'
            ? <div className="mb-4"><label className="eyebrow block mb-2">Enlace (YouTube, Drive…)</label><input className="field" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
            : <div className="mb-4"><label className="eyebrow block mb-2">Archivo de vídeo</label>
                <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="field" />
                <p className="text-[11px] text-muted mt-1.5">MP4, MOV o WebM. Máx. recomendado 100 MB.</p></div>}
          <div className="mb-5"><label className="eyebrow block mb-2">Comentario</label><textarea className="field" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Qué quieres que observe el jugador…" /></div>
          <div className="flex justify-end gap-2"><button onClick={() => setShow(false)} className="btn-line">Cancelar</button><button onClick={save} disabled={busy} className="btn-ink">{busy ? 'Subiendo…' : 'Compartir'}</button></div>
        </Modal>
      )}
    </div>
  )
}
