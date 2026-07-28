import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(''); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { role: 'coach' } } })
        if (error) throw error
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo continuar. Revisa el correo y la contraseña.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-[16px] bg-ink flex items-center justify-center mb-5 shadow-apple">
            <span className="text-paper font-display font-bold text-xl tracking-tightest">C</span>
          </div>
          <h1 className="font-display font-bold text-[34px] text-ink tracking-tightest leading-none">CAMPO</h1>
          <p className="text-muted text-[15px] mt-2.5 text-center leading-snug">
            El desarrollo de tus futbolistas,<br />medido con precisión.
          </p>
        </div>

        <div className="card p-7">
          {error && (
            <div className="bg-canvas text-ink text-[13px] rounded-xl px-4 py-3 mb-5 border border-line">{error}</div>
          )}
          <label className="eyebrow block mb-2">Correo</label>
          <input className="field mb-4" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
          <label className="eyebrow block mb-2">Contraseña</label>
          <input className="field mb-6" type="password" value={password} onChange={e => setPassword(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" />
          <button onClick={submit} disabled={busy} className="btn-ink w-full py-3 text-[15px]">
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>

        <p className="text-center text-[14px] text-muted mt-6">
          {mode === 'login' ? '¿Todavía no tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-ink font-medium">
            {mode === 'login' ? 'Crear una' : 'Entrar'}
          </button>
        </p>
        <div className="text-[10px] text-faint text-center mt-8">©2026 CIMA CIRCUS. Todos los derechos reservados.</div>
      </div>
    </div>
  )
}
