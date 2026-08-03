import { ReactNode } from 'react'
import { versionLabel } from '../../lib/version'

export type AdminSection =
  | 'resumen' | 'coaches' | 'jugadores' | 'ia' | 'errores' | 'salud' | 'admins' | 'registro'

interface NavItem { id: AdminSection; label: string; badge?: number }
interface NavGroup { section: string; items: NavItem[] }

export function buildNav(n: {
  coaches: number; jugadores: number; errores: number; avisos: number
}): NavGroup[] {
  return [
    { section: 'General', items: [
      { id: 'resumen', label: 'Resumen', badge: n.avisos || undefined },
    ] },
    { section: 'Cuentas', items: [
      { id: 'coaches', label: 'Coaches', badge: n.coaches || undefined },
      { id: 'jugadores', label: 'Jugadores', badge: n.jugadores || undefined },
    ] },
    { section: 'Plataforma', items: [
      { id: 'ia', label: 'Consumo de IA' },
      { id: 'salud', label: 'Estado del sistema' },
      { id: 'errores', label: 'Errores', badge: n.errores || undefined },
    ] },
    { section: 'Configuración', items: [
      { id: 'admins', label: 'Administradores' },
      { id: 'registro', label: 'Registro de acciones' },
    ] },
  ]
}

export default function AdminLayout({
  section, onSection, nav, email, onExit, onSignOut, menuOpen, setMenuOpen, children,
}: {
  section: AdminSection
  onSection: (s: AdminSection) => void
  nav: NavGroup[]
  email: string
  onExit?: () => void
  onSignOut: () => void
  menuOpen: boolean
  setMenuOpen: (b: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Barra superior en móvil */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-canvas/90 backdrop-blur-xl border-b border-line/60"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[9px] bg-ink flex items-center justify-center">
              <span className="text-paper font-display font-bold text-[13px] tracking-tightest">C</span>
            </div>
            <span className="font-display font-bold text-[15px] text-ink tracking-tightest">CAMPO</span>
            <span className="chip">admin</span>
          </div>
          <button onClick={() => setMenuOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-line/50 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && <div className="lg:hidden fixed inset-0 bg-ink/40 z-40 animate-[fadeIn_.2s_ease]" onClick={() => setMenuOpen(false)} />}

      {/* Barra lateral */}
      <aside style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
             className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-[260px] lg:w-[228px] shrink-0 flex flex-col px-4 pb-6 bg-canvas border-r border-line/60 transition-transform duration-300 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center justify-between px-3 pb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-ink flex items-center justify-center">
              <span className="text-paper font-display font-bold text-[15px] tracking-tightest">C</span>
            </div>
            <div>
              <div className="font-display font-bold text-[17px] text-ink tracking-tightest leading-none">CAMPO</div>
              <div className="eyebrow mt-1">Admin</div>
            </div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-muted hover:text-ink text-[20px] leading-none">✕</button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {nav.map(group => (
            <div key={group.section} className="mb-6">
              <div className="eyebrow px-3 mb-2">{group.section}</div>
              {group.items.map(it => {
                const active = section === it.id
                return (
                  <button key={it.id} onClick={() => { onSection(it.id); setMenuOpen(false) }}
                          className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-[10px] text-[14px] mb-0.5 transition ${
                            active ? 'bg-paper text-ink font-semibold shadow-apple' : 'text-sub hover:text-ink'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition ${active ? 'bg-volt' : 'bg-transparent'}`} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge !== undefined && (
                      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums shrink-0 ${
                        active ? 'bg-volt text-ink' : 'bg-line text-sub'}`}>
                        {it.badge > 99 ? '99+' : it.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="mt-2 space-y-2">
          <div className="px-3 pb-1">
            <div className="text-[11px] text-faint truncate" title={email}>{email}</div>
          </div>

          {onExit && (
            <button onClick={onExit}
                    className="w-full flex items-center justify-center gap-2 bg-ink text-paper rounded-xl py-2.5 text-[13px] font-medium hover:opacity-85 transition">
              Ir a mi panel de coach
            </button>
          )}

          <button onClick={onSignOut}
                  className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-2.5 text-[13px] font-medium text-sub hover:bg-paper hover:text-ink transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>

          <div className="text-[10px] text-faint text-center leading-relaxed pt-2">
            ©2026 CIMA CIRCUS.<br />Todos los derechos reservados.<br /><span className="tnum">{versionLabel}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 sm:px-8 xl:px-12 py-6 lg:py-9 pt-[72px] lg:pt-9">
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
