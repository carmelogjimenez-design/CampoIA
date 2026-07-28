// Estados reutilizables: carga, error y vacío — consistentes en toda la app

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-ink flex items-center justify-center animate-pulse">
        <span className="text-volt font-display font-bold text-[20px]">C</span>
      </div>
      <div className="flex items-center gap-2 text-muted text-[14px]">
        <span className="w-3 h-3 border-2 border-line border-t-ink rounded-full animate-spin" />
        {label}
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-full bg-canvas border border-line flex items-center justify-center mb-4 text-[24px]">⚠</div>
      <p className="text-ink font-medium text-[16px] mb-1">No se pudieron cargar los datos</p>
      <p className="text-muted text-[14px] max-w-sm mb-5">{message || 'Puede ser un problema de conexión. Comprueba tu red e inténtalo de nuevo.'}</p>
      {onRetry && <button onClick={onRetry} className="btn-ink">Reintentar</button>}
    </div>
  )
}

interface EmptyProps { icon?: string; title: string; description?: string; actionLabel?: string; onAction?: () => void }
export function EmptyState({ icon = '○', title, description, actionLabel, onAction }: EmptyProps) {
  return (
    <div className="card p-12 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-canvas flex items-center justify-center mb-4 text-muted text-[22px]">{icon}</div>
      <p className="text-ink font-medium text-[16px]">{title}</p>
      {description && <p className="text-muted text-[14px] mt-1.5 max-w-sm">{description}</p>}
      {actionLabel && onAction && <button onClick={onAction} className="btn-volt mt-5">{actionLabel}</button>}
    </div>
  )
}

// Onboarding cuando el coach no tiene jugadores todavía
export function FirstRun({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 animate-[fadeIn_.4s_ease]">
      <div className="w-16 h-16 rounded-3xl bg-ink flex items-center justify-center mb-5 relative">
        <span className="text-volt font-display font-bold text-[26px]">C</span>
        <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-volt animate-pulse" />
      </div>
      <h2 className="font-display font-bold text-[26px] text-ink tracking-tightest mb-2">Bienvenido a CAMPO</h2>
      <p className="text-sub text-[15px] max-w-md mb-6">Empieza añadiendo a tu primer jugador. Desde su ficha podrás planificar entrenamientos, registrar partidos, generar informes y usar la IA.</p>
      <button onClick={onAdd} className="btn-volt">+ Añadir mi primer jugador</button>
    </div>
  )
}
