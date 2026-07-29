import { useState } from 'react'
import { Player } from '../types/database'
import { assignInviteCode, revokeInviteCode, unlinkPlayer } from '../lib/invite'
import Modal from './Modal'

interface Props {
  player: Player
  onClose: () => void
  onChanged: () => void   // recarga la ficha en PlayerDetail
}

export default function PlayerAccessModal({ player, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const linked = !!player.auth_user_id
  const code = player.invite_code
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const invitation =
    `Hola ${player.name.split(' ')[0]}, ya tienes tu acceso a CAMPO.\n\n` +
    `1. Entra en ${appUrl}\n` +
    `2. Pulsa "Crear una" y elige "Soy jugador"\n` +
    `3. Introduce este código: ${code}\n\n` +
    `Ahí verás tus entrenamientos, tus tareas y tu plan de alimentación.`

  async function copy(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(tag)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      setError('Tu navegador no ha dejado copiar. Selecciona el texto a mano.')
    }
  }

  async function run(tag: string, fn: () => Promise<{ error?: string }>) {
    setBusy(tag); setError('')
    const res = await fn()
    setBusy('')
    if (res.error) { setError(res.error); return }
    onChanged()
  }

  return (
    <Modal title="Acceso del jugador" onClose={onClose}>
      {error && (
        <div className="bg-canvas border border-line text-ink text-[13px] rounded-xl px-4 py-2.5 mb-5">⚠ {error}</div>
      )}

      {/* ── Estado: vinculado ── */}
      {linked && (
        <>
          <div className="card-line p-5 mb-5">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-volt shrink-0" />
              <span className="text-[15px] font-medium text-ink">Cuenta vinculada</span>
            </div>
            <p className="text-sub text-[14px] leading-relaxed">
              {player.name} ya entra en su portal con su propio correo. Ve sus entrenamientos,
              marca ejercicios como hechos, registra su bienestar y os escribís por el chat.
            </p>
          </div>

          {!confirmUnlink ? (
            <button onClick={() => setConfirmUnlink(true)} className="btn-line w-full text-[14px]">
              Desvincular cuenta
            </button>
          ) : (
            <div className="card-line p-5">
              <p className="text-[14px] text-ink mb-1.5 font-medium">¿Seguro que quieres desvincular?</p>
              <p className="text-sub text-[13px] leading-relaxed mb-4">
                El jugador perderá el acceso al portal. Sus datos, entrenamientos e historial
                no se borran: siguen en su ficha. Podrás generarle un código nuevo cuando quieras.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmUnlink(false)} className="btn-line flex-1 text-[14px]">Cancelar</button>
                <button
                  onClick={() => run('unlink', () => unlinkPlayer(player.id))}
                  disabled={busy === 'unlink'}
                  className="btn-ink flex-1 text-[14px]"
                >
                  {busy === 'unlink' ? '…' : 'Desvincular'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Estado: código activo, esperando al jugador ── */}
      {!linked && code && (
        <>
          <p className="text-sub text-[14px] leading-relaxed mb-5">
            Pásale este código a {player.name.split(' ')[0]}. Lo usará al crear su cuenta y su ficha
            quedará unida a la tuya al instante.
          </p>

          <div className="bg-ink rounded-2xl px-5 py-7 text-center mb-4">
            <div className="eyebrow text-paper/40 mb-3">Código de acceso</div>
            <div className="font-display font-bold text-volt text-[40px] tracking-[0.22em] tnum leading-none pl-[0.22em]">
              {code}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button onClick={() => copy(code, 'code')} className="btn-line text-[13px] py-2.5">
              {copied === 'code' ? '✓ Copiado' : 'Copiar código'}
            </button>
            <button onClick={() => copy(invitation, 'msg')} className="btn-ink text-[13px] py-2.5">
              {copied === 'msg' ? '✓ Copiado' : 'Copiar mensaje'}
            </button>
          </div>

          <div className="card-line p-5 mb-5">
            <div className="eyebrow mb-3">Lo que tiene que hacer</div>
            <ol className="text-[13px] text-sub space-y-2 leading-relaxed">
              <li><span className="text-ink font-medium">1.</span> Abrir la app y pulsar «Crear una».</li>
              <li><span className="text-ink font-medium">2.</span> Elegir «Soy jugador».</li>
              <li><span className="text-ink font-medium">3.</span> Poner su correo, una contraseña y este código.</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => run('revoke', () => revokeInviteCode(player.id))}
              disabled={!!busy}
              className="btn-line flex-1 text-[13px]"
            >
              {busy === 'revoke' ? '…' : 'Anular'}
            </button>
            <button
              onClick={() => run('regen', () => assignInviteCode(player.id))}
              disabled={!!busy}
              className="btn-line flex-1 text-[13px]"
            >
              {busy === 'regen' ? '…' : 'Generar otro'}
            </button>
          </div>
          <p className="text-[12px] text-faint mt-4 text-center">
            El código es de un solo uso y caduca al canjearse.
          </p>
        </>
      )}

      {/* ── Estado: sin código todavía ── */}
      {!linked && !code && (
        <>
          <p className="text-sub text-[14px] leading-relaxed mb-5">
            Todavía no has dado acceso a {player.name.split(' ')[0]}. Genérale un código y podrá crear su
            cuenta: verá sus entrenamientos y tareas, marcará lo que va completando, registrará su
            bienestar y su alimentación, y os comunicaréis por el chat.
          </p>
          <button
            onClick={() => run('gen', () => assignInviteCode(player.id))}
            disabled={!!busy}
            className="btn-ink w-full py-3 text-[15px]"
          >
            {busy === 'gen' ? 'Generando…' : 'Generar código de acceso'}
          </button>
        </>
      )}
    </Modal>
  )
}
