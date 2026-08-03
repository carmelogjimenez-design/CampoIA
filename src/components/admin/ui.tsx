import { ReactNode } from 'react'

// ════════════════════════════════════════════════════════════
// Piezas de la consola de admin.
// Usan las MISMAS clases que el resto de CAMPO (.card, .chip,
// .btn-ink, .eyebrow, .bar-track…) para que no haya dos estéticas
// distintas dentro del mismo producto.
// ════════════════════════════════════════════════════════════

export function Panel({ children, className = '', pad = true }: {
  children: ReactNode; className?: string; pad?: boolean
}) {
  return <div className={`card ${pad ? 'p-7' : ''} ${className}`}>{children}</div>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div>
        <h1 className="h-page text-[26px] sm:text-[38px] leading-none">{title}</h1>
        {sub && <p className="text-muted text-[13px] mt-2">{sub}</p>}
      </div>
      {action}
    </header>
  )
}

export function Metric({ v, l, sub, tone, onClick }: {
  v: number | string; l: string; sub?: string
  tone?: 'volt' | 'warn'; onClick?: () => void
}) {
  const inner = (
    <>
      <div className="stat-num text-[34px] leading-none">{v}</div>
      <div className="text-[12px] text-muted mt-1.5">{l}</div>
      {sub && <div className="text-[11px] text-faint mt-1">{sub}</div>}
      {/* Un punto volt marca lo que va bien; un aro oscuro lo que hay que mirar. */}
      {tone && <div className="bar-track mt-3"><div className={tone === 'volt' ? 'bar-fill-volt' : 'bar-fill'} style={{ width: '100%' }} /></div>}
    </>
  )
  return onClick
    ? <button onClick={onClick} className="card p-6 text-left w-full hover:shadow-lg transition">{inner}</button>
    : <div className="card p-6">{inner}</div>
}

export function Chip({ children, tone = 'neutral', title }: {
  children: ReactNode; tone?: 'neutral' | 'volt' | 'danger' | 'ghost'; title?: string
}) {
  const styles = {
    neutral: 'chip',
    volt: 'chip bg-volt text-ink font-semibold',
    danger: 'chip bg-ink text-paper',
    ghost: 'text-[12px] font-medium px-2.5 py-1 rounded-full border border-line text-muted',
  }
  return <span title={title} className={`${styles[tone]} whitespace-nowrap`}>{children}</span>
}

export function Bar({ pct, tone }: { pct: number; tone?: 'volt' }) {
  return (
    <div className="bar-track">
      <div className={tone === 'volt' ? 'bar-fill-volt' : 'bar-fill'}
           style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return <input className="field" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

export function Filters<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][]
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)}
                className={value === id ? 'chip bg-ink text-paper' : 'chip hover:bg-line transition'}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="card p-14 text-center">
      <p className="text-ink text-[15px] font-medium">{title}</p>
      {sub && <p className="text-muted text-[13px] mt-2 max-w-[380px] mx-auto leading-relaxed">{sub}</p>}
    </div>
  )
}

export function Btn({ children, onClick, tone = 'line', disabled, full }: {
  children: ReactNode; onClick?: () => void
  tone?: 'line' | 'ink' | 'volt' | 'danger'; disabled?: boolean; full?: boolean
}) {
  const styles = {
    line: 'btn-line',
    ink: 'btn-ink',
    volt: 'btn-volt',
    danger: 'border border-line-strong text-ink font-medium rounded-full px-5 py-2.5 text-sm hover:bg-canvas transition',
  }
  return (
    <button onClick={onClick} disabled={disabled}
            className={`${styles[tone]} ${full ? 'w-full' : ''} disabled:opacity-40`}>
      {children}
    </button>
  )
}

// ── Tablas ───────────────────────────────────────────────────

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden">{children}</div>
}

/** Cabecera: se oculta en móvil, donde las filas se apilan con sus etiquetas. */
export function Thead({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className="hidden md:grid gap-4 px-6 py-3 border-b border-line bg-canvas/60"
         style={{ gridTemplateColumns: cols }}>
      {labels.map((l, i) => <div key={i} className="eyebrow">{l}</div>)}
    </div>
  )
}

export function Row({ children, onClick, cols }: {
  children: ReactNode; onClick?: () => void; cols: string
}) {
  const cls = `w-full text-left grid grid-cols-2 gap-4 px-5 md:px-6 py-4 border-b border-line last:border-0 md:[grid-template-columns:var(--row-cols)] ${
    onClick ? 'hover:bg-canvas/50 transition cursor-pointer' : ''}`
  const style = { ['--row-cols' as string]: cols } as React.CSSProperties
  return onClick
    ? <button onClick={onClick} className={cls} style={style}>{children}</button>
    : <div className={cls} style={style}>{children}</div>
}

export function Cell({ label, children, span }: { label?: string; children: ReactNode; span?: boolean }) {
  return (
    <div className={`flex flex-col justify-center min-w-0 ${span ? 'col-span-2 md:col-span-1' : ''}`}>
      {label && <span className="md:hidden text-[11px] text-muted mb-1">{label}</span>}
      {children}
    </div>
  )
}

export function Num({ children }: { children: ReactNode }) {
  return <span className="stat-num text-[16px]">{children}</span>
}

export function Avatar({ url, name, size = 32 }: { url?: string | null; name: string; size?: number }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <span className="rounded-full bg-canvas flex items-center justify-center font-semibold text-sub shrink-0 overflow-hidden"
          style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : ini}
    </span>
  )
}

export function Field({ l, v }: { l: string; v: ReactNode }) {
  return <><span className="text-muted">{l}</span><span className="text-ink text-right">{v}</span></>
}

export function Alert({ children, tone = 'neutral' }: {
  children: ReactNode; tone?: 'neutral' | 'danger' | 'ok'
}) {
  const styles = {
    neutral: 'card-line',
    danger: 'card-line border-line-strong',
    ok: 'bg-volt/20 border border-volt rounded-2xl',
  }
  return <div className={`${styles[tone]} px-4 py-3 text-[13px] text-ink leading-relaxed`}>{children}</div>
}

// ── Formateadores ────────────────────────────────────────────

export const fecha = (s: string | null) => s
  ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
  : '—'

export const fechaHora = (s: string) =>
  new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** "hace 3 días" — más legible que una fecha para ver quién sigue activo. */
export function hace(s: string | null): string {
  if (!s) return 'nunca'
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 864e5)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  if (d < 365) return `hace ${Math.floor(d / 30)} meses`
  return `hace ${Math.floor(d / 365)} años`
}
