import { useEffect, useState } from 'react'
import { Player } from '../types/database'
import { initials } from '../lib/players'
import {
  Progreso, Delta, Ventana, buildProgreso, calcDelta,
  scoreCompromiso, resumenTendencia,
} from '../lib/progress'

const VENTANAS: [Ventana, string][] = [[30, '30 días'], [60, '60 días'], [90, '90 días']]

export default function ProgressView({ players }: { players: Player[] }) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [ventana, setVentana] = useState<Ventana>(30)
  const [p, setP] = useState<Progreso | null>(null)
  const [loading, setLoading] = useState(true)

  const player = players.find(x => x.id === playerId) ?? null

  useEffect(() => {
    if (!player) { setLoading(false); return }
    setLoading(true)
    buildProgreso(player, ventana).then(r => { setP(r); setLoading(false) })
  }, [playerId, ventana])

  if (!players.length) return (
    <div className="card p-14 text-center">
      <p className="text-ink text-[15px] font-medium">Sin jugadores</p>
    </div>
  )

  const score = p ? scoreCompromiso(p.compromiso) : null

  return (
    <div>
      {/* Jugador y ventana */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {players.map(pl => (
            <button key={pl.id} onClick={() => setPlayerId(pl.id)}
                    className={`shrink-0 flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                      playerId === pl.id ? 'bg-ink text-paper' : 'bg-paper text-sub border border-line hover:border-line-strong'}`}>
              <span className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] font-semibold text-sub overflow-hidden">
                {pl.photo_url ? <img src={pl.photo_url} className="w-full h-full object-cover" /> : initials(pl.name)}
              </span>
              {pl.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 shrink-0">
          {VENTANAS.map(([v, l]) => (
            <button key={v} onClick={() => setVentana(v)}
                    className={ventana === v ? 'chip bg-ink text-paper' : 'chip hover:bg-line transition'}>{l}</button>
          ))}
        </div>
      </div>

      {loading && <p className="text-muted text-[15px]">Calculando…</p>}

      {!loading && p && (
        <>
          {/* Titular: la tendencia en una frase */}
          <div className="bg-ink rounded-3xl p-7 sm:p-8 mb-6 text-paper relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-volt/10 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
              {score !== null && (
                <div className="shrink-0">
                  <div className="eyebrow text-paper/40 mb-2">Compromiso</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-bold text-volt text-[44px] leading-none tnum">{score}</span>
                    <span className="text-paper/40 text-[16px]">/100</span>
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-paper/80 text-[15px] leading-relaxed">{resumenTendencia(p)}</p>
                <p className="text-paper/30 text-[12px] mt-2 tnum">
                  Compara los últimos {p.ventana} días con los {p.ventana} anteriores
                </p>
              </div>
            </div>
          </div>

          {p.vacio ? (
            <div className="card p-14 text-center">
              <p className="text-ink text-[16px] font-medium mb-1.5">Aún no hay nada que comparar</p>
              <p className="text-muted text-[14px] max-w-[400px] mx-auto leading-relaxed">
                En cuanto {player?.name.split(' ')[0]} acumule entrenamientos, partidos o registros
                de bienestar, aquí verás cómo evoluciona.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Bloque titulo="Compromiso"
                      sub="Lo que hace con lo que le mandas"
                      deltas={p.compromiso} />
              <Bloque titulo="Competición"
                      sub="Lo que pasa el día del partido"
                      deltas={p.competicion} />
              <Bloque titulo="Bienestar"
                      sub="Lo que él mismo registra"
                      deltas={p.bienestar} />
              {p.tests.length > 0 && (
                <Bloque titulo="Tests físicos"
                        sub="Primer test contra el último, sin importar la fecha"
                        deltas={p.tests} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════

function Bloque({ titulo, sub, deltas }: { titulo: string; sub: string; deltas: Delta[] }) {
  const conDatos = deltas.filter(d => d.antes !== null || d.ahora !== null)
  if (!conDatos.length) return null

  return (
    <div className="card p-7">
      <div className="mb-6">
        <div className="eyebrow mb-1.5">{titulo}</div>
        <p className="text-[12px] text-muted">{sub}</p>
      </div>
      <div className="space-y-1">
        {conDatos.map(d => <Fila key={d.id} d={d} />)}
      </div>
    </div>
  )
}

function Fila({ d }: { d: Delta }) {
  const c = calcDelta(d)
  const fmt = (v: number | null) => v === null ? '—' : `${v}${d.unit}`

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-ink">{d.label}</div>
        {d.nota && <div className="text-[11px] text-faint mt-0.5 leading-snug">{d.nota}</div>}
      </div>

      {/* Antes → Ahora */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="stat-num text-[15px] text-muted w-14 text-right">{fmt(d.antes)}</span>
        <span className="text-faint text-[12px]">→</span>
        <span className="stat-num text-[19px] w-16 text-right">{fmt(d.ahora)}</span>
      </div>

      {/* Variación */}
      <div className="w-20 text-right shrink-0">
        {c.nuevo ? (
          <span className="chip">nuevo</span>
        ) : c.cambio === null ? (
          <span className="text-[12px] text-faint">—</span>
        ) : c.cambio === 0 ? (
          <span className="text-[12px] text-muted">igual</span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-[13px] font-semibold tnum ${
            c.mejora ? 'text-ink' : 'text-muted'}`}>
            <span className={c.mejora ? 'text-volt' : 'text-muted'}>{c.cambio > 0 ? '▲' : '▼'}</span>
            {Math.abs(Math.round(c.cambio * 10) / 10)}{d.unit === '%' ? ' p.p.' : d.unit}
          </span>
        )}
      </div>
    </div>
  )
}
