import { useState } from 'react'
import { versionLabel } from '../lib/version'
import { supabase } from '../lib/supabase'
import { setPendingInvite, clearPendingInvite } from '../lib/invite'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [who, setWho] = useState<'coach' | 'player'>('coach')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const isPlayerSignup = mode === 'signup' && who === 'player'

  async function submit() {
    if (!email.trim() || !password) { setError('Introduce tu correo y contraseña.'); return }
    if (isPlayerSignup && code.trim().length < 4) {
      setError('Introduce el código de acceso que te ha dado tu entrenador.'); return
    }
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        // Dejamos el código guardado ANTES de registrar: en cuanto haya sesión,
        // AuthContext lo canjea y vincula la ficha automáticamente.
        if (isPlayerSignup) setPendingInvite(code)
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { role: who } },
        })
        if (error) { if (isPlayerSignup) clearPendingInvite(); throw error }
        if (!data.session) {
          setInfo(isPlayerSignup
            ? 'Cuenta creada. Confirma tu correo y entra: vincularemos tu ficha automáticamente.'
            : 'Cuenta creada. Confirma tu correo para poder entrar.')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo continuar. Revisa el correo y la contraseña.')
    } finally { setBusy(false) }
  }

  const features = [
    ['Planificación individual', 'Entrenamientos y tareas para cada jugador.'],
    ['IA especialista por posición', 'Planes y nutrición adaptados a su demarcación.'],
    ['Informes profesionales', 'Dossiers en PDF con gráficas y análisis.'],
  ]

  return (
    <div className="min-h-screen lg:flex bg-canvas">
      {/* ── Panel branding ── */}
      <div className="lg:w-[52%] bg-ink text-paper relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16 min-h-[260px] lg:min-h-screen">
        {/* resplandores */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-volt/15 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-80 h-80 rounded-full bg-volt/8 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-[13px] bg-paper/10 backdrop-blur flex items-center justify-center relative">
            <span className="text-volt font-display font-bold text-[19px] tracking-tightest">C</span>
            <span className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-volt animate-pulse" />
          </div>
          <span className="font-display font-bold text-[20px] tracking-tightest">CAMPO</span>
        </div>

        <div className="relative my-10 lg:my-0">
          <h1 className="font-display font-bold text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.05] tracking-tightest max-w-lg">
            El desarrollo de tus futbolistas, <span className="text-volt">medido con precisión.</span>
          </h1>
          <p className="text-paper/50 text-[15px] sm:text-[17px] mt-5 max-w-md leading-relaxed">
            La plataforma para coaches personales que quieren llevar a cada jugador al siguiente nivel.
          </p>

          <div className="mt-10 space-y-4 hidden lg:block">
            {features.map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3.5">
                <span className="w-5 h-5 rounded-full bg-volt flex items-center justify-center text-ink text-[11px] font-bold mt-0.5 shrink-0">✓</span>
                <div>
                  <div className="text-[15px] font-medium">{title}</div>
                  <div className="text-[13px] text-paper/40">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] text-paper/30 hidden lg:block">©2026 CIMA CIRCUS. Todos los derechos reservados. <span className="tnum">{versionLabel}</span></div>
      </div>

      {/* ── Panel formulario ── */}
      <div className="lg:w-[48%] flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="font-display font-bold text-[28px] text-ink tracking-tighter2">{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
            <p className="text-muted text-[15px] mt-1.5">
              {mode === 'login' ? 'Entra en tu cuenta.'
                : isPlayerSignup ? 'Únete con el código de tu entrenador.'
                : 'Empieza a desarrollar a tus futbolistas.'}
            </p>
          </div>

          {error && (
            <div className="bg-canvas text-ink text-[13px] rounded-xl px-4 py-3 mb-5 border border-line flex items-start gap-2">
              <span className="text-[14px]">⚠</span><span>{error}</span>
            </div>
          )}

          {info && (
            <div className="bg-volt/20 text-ink text-[13px] rounded-xl px-4 py-3 mb-5 border border-volt flex items-start gap-2">
              <span className="text-[14px]">✓</span><span>{info}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div className="mb-6">
              <label className="eyebrow block mb-2">¿Quién eres?</label>
              <div className="grid grid-cols-2 gap-1.5 bg-canvas rounded-xl p-1.5">
                {([['coach', 'Soy coach'], ['player', 'Soy jugador']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => { setWho(id); setError(''); setInfo('') }}
                          className={`py-2 rounded-[9px] text-[14px] font-medium transition ${
                            who === id ? 'bg-paper text-ink shadow-apple' : 'text-muted hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="eyebrow block mb-2">Correo</label>
          <input className="field mb-4" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
          <label className="eyebrow block mb-2">Contraseña</label>
          <input className="field mb-6" type="password" value={password} onChange={e => setPassword(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

          {isPlayerSignup && (
            <>
              <label className="eyebrow block mb-2">Código de acceso</label>
              <input className="field mb-2 text-center tnum text-[19px] tracking-[0.32em] uppercase font-semibold"
                     value={code} maxLength={6} placeholder="ABC123" autoCapitalize="characters" autoComplete="off"
                     onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                     onKeyDown={e => e.key === 'Enter' && submit()} />
              <p className="text-[12px] text-muted mb-6">Son los 6 caracteres que te ha dado tu entrenador.</p>
            </>
          )}

          <button onClick={submit} disabled={busy} className="btn-ink w-full py-3.5 text-[15px] flex items-center justify-center gap-2">
            {busy ? <><span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />Un momento…</> : mode === 'login' ? 'Entrar' : isPlayerSignup ? 'Crear cuenta y vincular' : 'Crear cuenta'}
          </button>

          <p className="text-center text-[14px] text-muted mt-6">
            {mode === 'login' ? '¿Todavía no tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }} className="text-ink font-semibold hover:underline">
              {mode === 'login' ? 'Crear una' : 'Entrar'}
            </button>
          </p>

          <div className="text-[10px] text-faint text-center mt-10 lg:hidden">©2026 CIMA CIRCUS. Todos los derechos reservados.</div>
        </div>
      </div>
    </div>
  )
}
