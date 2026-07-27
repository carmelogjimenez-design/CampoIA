import { useState } from 'react'
import { Player } from '../types/database'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/players'
import { generateReport, ReportType, Frequency } from '../lib/reportGenerator'

interface Props { players: Player[] }

const TYPES: [ReportType, string, string, string][] = [
  ['familia', 'Familia', 'Cálido y motivador', '❤'],
  ['club', 'Club', 'Técnico y táctico', '◆'],
  ['agente', 'Agente', 'Proyección y valor', '★'],
]
const FREQS: [Frequency, string][] = [['semanal', 'Semanal'], ['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['anual', 'Anual']]

export default function ReportsView({ players }: Props) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [type, setType] = useState<ReportType>('club')
  const [freq, setFreq] = useState<Frequency>('mensual')
  const [busy, setBusy] = useState(false)

  async function generate() {
    const player = players.find(p => p.id === playerId)
    if (!player) return
    setBusy(true)
    try {
      const [mt, tr, ck, nu] = await Promise.all([
        supabase.from('matches').select('*').eq('player_id', playerId),
        supabase.from('training_sessions').select('*').eq('player_id', playerId),
        supabase.from('check_ins').select('*').eq('player_id', playerId),
        supabase.from('nutrition_logs').select('*').eq('player_id', playerId),
      ])
      generateReport(type, freq, {
        player,
        matches: mt.data ?? [], sessions: tr.data ?? [],
        checkins: ck.data ?? [], nutrition: nu.data ?? [],
      })
    } finally { setBusy(false) }
  }

  const selected = players.find(p => p.id === playerId)

  return (
    <div className="animate-[fadeIn_.4s_ease]">
      <header className="mb-7"><div className="eyebrow mb-2">Herramientas</div><h1 className="h-page text-[40px] leading-none">Informes</h1></header>
      <p className="text-sub text-[15px] mb-7">Genera un dossier profesional en PDF con gráficas de evolución, atributos y adherencia.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Configurador */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="eyebrow mb-3">1 · Jugador</div>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <button key={p.id} onClick={() => setPlayerId(p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium transition ${playerId === p.id ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${playerId === p.id ? 'bg-paper/20' : 'bg-paper'}`}>{initials(p.name)}</span>
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="eyebrow mb-3">2 · Tipo de informe</div>
            <div className="grid grid-cols-3 gap-3">
              {TYPES.map(([id, name, desc, icon]) => (
                <button key={id} onClick={() => setType(id)}
                        className={`p-4 rounded-2xl text-left transition border ${type === id ? 'border-ink bg-canvas' : 'border-line hover:border-line-strong'}`}>
                  <div className={`text-[18px] mb-2 ${type === id ? '' : 'opacity-40'}`}>{icon}</div>
                  <div className="font-semibold text-ink text-[14px]">{name}</div>
                  <div className="text-[11px] text-muted mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="eyebrow mb-3">3 · Frecuencia</div>
            <div className="flex gap-2">
              {FREQS.map(([id, label]) => (
                <button key={id} onClick={() => setFreq(id)}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${freq === id ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview / acción */}
        <div className="lg:sticky lg:top-8 self-start">
          <div className="bg-ink rounded-3xl p-7 text-paper relative overflow-hidden">
            {type === 'agente' && <div className="absolute top-0 left-0 right-0 h-1 bg-volt" />}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-volt/10 blur-2xl" />
            <div className="relative">
              <div className="text-[11px] text-paper/50 uppercase tracking-eyebrow font-semibold mb-4">Vista previa</div>
              <div className="w-14 h-14 rounded-2xl bg-paper/10 flex items-center justify-center text-[24px] mb-4">
                {TYPES.find(t => t[0] === type)?.[3]}
              </div>
              <div className="font-display font-bold text-[22px] tracking-tightest leading-tight">
                {type === 'familia' ? 'Informe Familiar' : type === 'club' ? 'Informe para el Club' : 'Dossier de Representación'}
              </div>
              <div className="text-[13px] text-paper/60 mt-1">
                {selected?.name ?? '—'} · {FREQS.find(f => f[0] === freq)?.[1]}
              </div>
              <div className="mt-5 space-y-1.5 text-[12px] text-paper/50">
                <div>✓ Gráfica de evolución temporal</div>
                <div>✓ Barras de atributos</div>
                <div>✓ Donut de adherencia</div>
                <div>✓ Análisis con enfoque {type}</div>
              </div>
              <button onClick={generate} disabled={busy || !selected} className="btn-volt w-full justify-center mt-6">
                {busy ? 'Generando…' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
