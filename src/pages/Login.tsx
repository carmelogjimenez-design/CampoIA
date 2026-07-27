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
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { role: 'coach' } },
        })
        if (error) throw error
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center">
            <span className="text-white font-display font-extrabold text-2xl">C</span>
          </div>
        </div>
        <h1 className="text-center font-display font-extrabold text-3xl text-ink">CAMPO</h1>
        <p className="text-center text-slate-500 text-sm mt-1 mb-6">
          La plataforma para coaches que desarrollan futbolistas.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1">EMAIL</label>
        <input
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-ink outline-none focus:border-campo-violet"
          type="email" value={email} onChange={e => setEmail(e.target.value)}
        />
        <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1">CONTRASEÑA</label>
        <input
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5 text-ink outline-none focus:border-campo-violet"
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit} disabled={busy}
          className="w-full bg-ink text-white font-semibold rounded-xl py-3 disabled:opacity-60"
        >
          {busy ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm text-slate-500 mt-4">
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-campo-blue font-semibold"
          >
            {mode === 'login' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
