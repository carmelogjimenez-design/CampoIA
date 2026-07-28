import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/players'

interface Props { playerId: string; name: string; photoUrl: string | null; size?: number; onUpdated: (url: string) => void }

export default function AvatarUpload({ playerId, name, photoUrl, size = 80, onUpdated }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setBusy(true); setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${playerId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw new Error('No se pudo subir. ¿Creaste el bucket "avatars" y ejecutaste el SQL?')
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      await supabase.from('players').update({ photo_url: url }).eq('id', playerId)
      onUpdated(url)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') } finally { setBusy(false) }
  }

  return (
    <div className="relative group shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full bg-canvas border border-line flex items-center justify-center font-display font-semibold text-ink overflow-hidden" style={{ fontSize: size / 3 }}>
        {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : initials(name)}
      </div>
      <label className="absolute inset-0 rounded-full bg-ink/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
        <span className="text-paper text-[11px] font-medium">{busy ? '...' : 'Cambiar'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {error && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-10">{error}</div>}
    </div>
  )
}
