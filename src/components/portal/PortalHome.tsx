import { useEffect, useState } from 'react'
import { PlayerData } from '../../hooks/usePlayerData'
import { supabase } from '../../lib/supabase'
import { Match } from '../../types/database'
import AvatarUpload from '../AvatarUpload'

export default function PortalHome({ pd, onGo }: { pd: PlayerData; onGo: (t: string) => void }) {
  const { profile, training, tasks } = pd
  const [photo, setPhoto] = useState(profile?.photo_url ?? null)
  const [matches, setMatches] = useState<Match[]>([])
  const [teamAvg, setTeamAvg] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('matches').select('*').eq('player_id', profile.id).then(({ data }) => setMatches((data as Match[]) ?? []))
    // media de adherencia del equipo (para comparativa)
    supabase.from('training_sessions').select('completed, player_id').eq('coach_id', profile.coach_id).then(({ data }) => {
      if (!data?.length) return
      const byP: Record<string, { d: number; t: number }> = {}
      data.forEach((s: any) => { (byP[s.player_id] ??= { d: 0, t: 0 }); byP[s.player_id].t++; if (s.completed) byP[s.player_id].d++ })
      const rates = Object.values(byP).map(x => x.t ? x.d / x.t * 100 : 0)
      setTeamAvg(Math.round(rates.reduce((a, b) => a + b, 0) / rates.length))
    })
  }, [profile])

  if (!profile) return null
  const totalDone = training.filter(s => s.completed).length
  const pending = training.filter(s => !s.completed).length
  const pendingTasks = tasks.filter(t => !t.done).length
  const adherence = training.length ? Math.round(totalDone / training.length * 100) : 0
  const totMins = matches.reduce((a, m) => a + (m.mins ?? 0), 0)
  const totGoals = matches.reduce((a, m) => a + (m.goals ?? 0), 0)
  const totAssists = matches.reduce((a, m) => a + (m.assists ?? 0), 0)
  const cleanSheets = matches.filter(m => m.clean_sheet === true).length

  // racha: días consecutivos con sesión completada
  const doneDates = new Set(training.filter(s => s.completed).map(s => (s.completed_at ?? s.date ?? '').slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    if (doneDates.has(d)) streak++
    else if (i > 0) break
  }

  const R = 40, C = 2 * Math.PI * R
  const vsTeam = teamAvg != null ? adherence - teamAvg : null

  return (
    <div>
      {/* HERO con foto + anillo */}
      <div className="rounded-3xl p-6 mb-4 bg-ink text-paper relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />
        <div className="relative flex items-center gap-5">
          <AvatarUpload playerId={profile.id} name={profile.name} photoUrl={photo} size={72} onUpdated={setPhoto} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-paper/50">{profile.pos_group ?? '—'}{profile.club ? ` · ${profile.club}` : ''}</div>
            <div className="font-display font-bold text-[24px] tracking-tightest leading-tight truncate">{profile.name}</div>
            <div className="text-[12px] text-paper/40 mt-0.5">Toca tu foto para cambiarla</div>
          </div>
          <div className="relative shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
              <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
              <circle cx="48" cy="48" r={R} fill="none" stroke="#C9F31D" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C - (adherence / 100) * C} style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="stat-num text-paper text-[22px] leading-none">{adherence}%</span>
              <span className="text-[9px] text-paper/50">adherencia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Racha + comparativa */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1"><span className="text-[18px]">🔥</span><span className="stat-num text-[28px] leading-none">{streak}</span></div>
          <div className="text-[12px] text-muted">días de racha</div>
        </div>
        <div className="card p-5">
          <div className="stat-num text-[28px] leading-none mb-1">{totalDone}<span className="text-[14px] text-muted font-normal">/{training.length}</span></div>
          <div className="text-[12px] text-muted">sesiones hechas</div>
        </div>
      </div>

      {/* Comparativa con el equipo */}
      {vsTeam != null && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-ink">Tú vs. media del equipo</span>
            <span className={`chip ${vsTeam >= 0 ? 'bg-volt text-ink' : ''}`}>{vsTeam >= 0 ? '+' : ''}{vsTeam}%</span>
          </div>
          <div className="space-y-2">
            <Compare label="Tú" val={adherence} max={100} accent />
            <Compare label="Equipo" val={teamAvg!} max={100} />
          </div>
        </div>
      )}

      {/* Stats de competición */}
      <div className="card p-5 mb-4">
        <div className="eyebrow mb-4">Tu competición</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <PStat v={matches.length} l="Partidos" /><PStat v={totMins} l="Minutos" />
          <PStat v={totGoals} l="Goles" />
          <PStat v={cleanSheets} l="P. 0" accent={cleanSheets > 0} />
        </div>
        {totAssists > 0 && <div className="text-center mt-3 text-[12px] text-muted">{totAssists} asistencias</div>}
      </div>

      {/* Accesos */}
      <div className="grid grid-cols-2 gap-3">
        <Access label="Mis entrenos" sub={`${pending} pendientes`} onClick={() => onGo('training')} />
        <Access label="¿Cómo estás hoy?" sub="Registra tu día" onClick={() => onGo('checkin')} accent />
        <Access label="Mi comida" sub="Apunta lo que comes" onClick={() => onGo('nutrition')} />
        <Access label="Tu coach" sub={pendingTasks ? `${pendingTasks} tareas` : 'Mensajes'} onClick={() => onGo('chat')} />
      </div>
    </div>
  )
}

function Compare({ label, val, max, accent }: { label: string; val: number; max: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-sub w-14">{label}</span>
      <div className="flex-1 bar-track"><div className={accent ? 'bar-fill-volt' : 'bar-fill'} style={{ width: `${(val / max) * 100}%` }} /></div>
      <span className="stat-num text-[12px] w-9 text-right">{val}%</span>
    </div>
  )
}
function PStat({ v, l, accent }: { v: number; l: string; accent?: boolean }) {
  return <div><div className={`stat-num text-[24px] leading-none ${accent ? 'text-ink' : ''}`}>{v}</div><div className="text-[10px] text-muted mt-1">{l}</div></div>
}
function Access({ label, sub, onClick, accent }: { label: string; sub: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`card p-5 text-left hover:shadow-apple-lg transition-shadow ${accent ? 'ring-1 ring-volt' : ''}`}>
      <div className="font-medium text-ink text-[15px]">{label}</div>
      <div className="text-[12px] text-muted mt-1">{sub}</div>
    </button>
  )
}
