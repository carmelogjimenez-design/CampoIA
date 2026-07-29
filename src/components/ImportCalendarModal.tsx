import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { isGoalkeeper } from '../lib/players'
import { parseFixtures, detectTeam, teamOptions, viewFor, Fixture } from '../lib/seasonCalendar'
import { seasonOf, seasonsIn, currentSeason } from '../lib/seasons'
import Modal from './Modal'

type Estado = 'no' | 'titular' | 'suplente' | 'banquillo'

interface RowState { estado: Estado; mins: string; conceded: string; goals: string }

const ESTADOS: [Estado, string][] = [
  ['no', '—'], ['titular', 'T'], ['suplente', 'S'], ['banquillo', 'B'],
]

const ESTADO_LABEL: Record<Estado, string> = {
  no: 'No convocado', titular: 'Titular', suplente: 'Suplente', banquillo: 'Convocado sin jugar',
}

export default function ImportCalendarModal({ player, onClose, onSaved }: {
  player: Player; onClose: () => void; onSaved?: () => void
}) {
  const [text, setText] = useState('')
  const [fixtures, setFixtures] = useState<Fixture[] | null>(null)
  const [team, setTeam] = useState('')
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [existing, setExisting] = useState(0)
  const [replace, setReplace] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)

  const gk = isGoalkeeper(player)

  async function read() {
    setError('')
    const parsed = parseFixtures(text)
    if (parsed.length < 2) {
      setError('No he reconocido ningún partido. Pega el calendario con una línea por jornada: fecha, equipos y resultado.')
      return
    }
    const t = detectTeam(parsed) ?? ''
    const { count } = await supabase.from('matches')
      .select('*', { count: 'exact', head: true }).eq('player_id', player.id)
    setExisting(count ?? 0)
    setTeam(t)
    setFixtures(parsed)
    setRows(Object.fromEntries(parsed.map((_, i) => [i, { estado: 'no', mins: '', conceded: '', goals: '' } as RowState])))
  }

  const views = useMemo(
    () => (fixtures && team) ? fixtures.map(f => viewFor(f, team)) : [],
    [fixtures, team],
  )

  function setRow(i: number, patch: Partial<RowState>) {
    setRows(r => ({ ...r, [i]: { ...r[i], ...patch } }))
  }

  function cycle(i: number, estado: Estado) {
    const v = views[i]
    const patch: Partial<RowState> = { estado }
    if (estado === 'titular') {
      patch.mins = rows[i].mins || '90'
      if (gk && v?.goalsAgainst != null) patch.conceded = rows[i].conceded || String(v.goalsAgainst)
    }
    if (estado === 'no' || estado === 'banquillo') { patch.mins = estado === 'banquillo' ? '0' : ''; patch.conceded = '' }
    setRow(i, patch)
  }

  // Totales en vivo: sirven para cuadrarlos con los que da la federación
  const tot = useMemo(() => {
    let convocatorias = 0, titular = 0, suplente = 0, mins = 0, encajados = 0, porterias0 = 0
    Object.entries(rows).forEach(([, r]) => {
      if (r.estado === 'no') return
      convocatorias++
      if (r.estado === 'titular') titular++
      if (r.estado === 'suplente') suplente++
      mins += Number(r.mins) || 0
      if (r.conceded !== '') {
        encajados += Number(r.conceded) || 0
        if (Number(r.conceded) === 0 && r.estado !== 'banquillo') porterias0++
      }
    })
    return { convocatorias, titular, suplente, mins, encajados, porterias0 }
  }, [rows])

  function bulk(estado: Estado) {
    const next: Record<number, RowState> = {}
    views.forEach((v, i) => {
      next[i] = { ...rows[i], estado }
      if (estado === 'titular') {
        next[i].mins = '90'
        if (gk && v.goalsAgainst != null) next[i].conceded = String(v.goalsAgainst)
      } else { next[i].mins = estado === 'banquillo' ? '0' : ''; next[i].conceded = '' }
    })
    setRows(next)
  }

  async function save() {
    setBusy(true); setError('')
    try {
      const toSave = views.map((v, i) => ({ v, r: rows[i] })).filter(x => x.r.estado !== 'no')
      if (!toSave.length) { setError('No has marcado ningún partido.'); setBusy(false); return }
      const rowsToInsertSeasons = toSave.map(x => seasonOf(x.v.fixture.date) ?? currentSeason())

      if (replace && existing > 0) {
        // Solo se borra la temporada que estás importando: el histórico anterior no se toca.
        const temporadas = Array.from(new Set(rowsToInsertSeasons))
        const { error: delErr } = await supabase.from('matches')
          .delete().eq('player_id', player.id).in('season', temporadas)
        if (delErr) throw delErr
      }

      const rowsToInsert = toSave.map(({ v, r }) => ({
        coach_id: player.coach_id, player_id: player.id,
        season: seasonOf(v.fixture.date) ?? currentSeason(),
        date: v.fixture.date, rival: v.rival, result: v.result,
        mins: r.mins === '' ? null : Number(r.mins),
        called: 'yes',
        role: r.estado === 'banquillo' ? 'no-play' : r.estado,
        goals: r.goals === '' ? null : Number(r.goals),
        assists: null,
        conceded: r.conceded === '' ? null : Number(r.conceded),
        clean_sheet: gk && r.conceded !== '' ? Number(r.conceded) === 0 : null,
        notes: v.isHome ? 'Casa' : 'Fuera',
      }))

      const { error: insErr } = await supabase.from('matches').insert(rowsToInsert)
      if (insErr) throw insErr
      setSaved(rowsToInsert.length)
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los partidos.')
    } finally { setBusy(false) }
  }

  // ── Guardado ──
  if (saved > 0) return (
    <Modal title="Temporada guardada" onClose={onClose}>
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-volt flex items-center justify-center text-ink text-[24px] mx-auto mb-4">✓</div>
        <p className="text-ink text-[16px] font-medium mb-1.5">{saved} partidos en su ficha</p>
        <p className="text-muted text-[14px] leading-relaxed max-w-[280px] mx-auto mb-6">
          {tot.titular} de titular · {tot.suplente} de suplente · {tot.mins} minutos
        </p>
        <button onClick={onClose} className="btn-ink">Ver la ficha</button>
      </div>
    </Modal>
  )

  // ── Pegar el calendario ──
  if (!fixtures) return (
    <Modal title="Calendario del equipo" onClose={onClose} wide>
      <p className="text-sub text-[14px] leading-relaxed mb-4">
        Pega el calendario de la temporada tal cual sale en la federación. Lo leo yo
        —sin IA, así que ni se corta ni se inventa nada— y después marcas en cuáles jugó.
      </p>
      <textarea className="field mb-3 font-mono text-[12px]" rows={8} value={text}
                onChange={e => setText(e.target.value)}
                placeholder={'1 | 27/09/2025 | Unión Zona Norte – Football Dreams | 1-7\n2 | 04/10/2025 | Football Dreams – Aravaca | 0-3\n…'} />
      {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">⚠ {error}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-line">Cerrar</button>
        <button onClick={read} disabled={!text.trim()} className="btn-ink">Leer calendario</button>
      </div>
    </Modal>
  )

  // ── Marcar los partidos ──
  return (
    <Modal title={`Temporada de ${player.name.split(' ')[0]}`} onClose={onClose} wide>
      {error && <div className="card-line px-4 py-3 mb-4 text-[13px] text-ink">⚠ {error}</div>}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="eyebrow">Temporada</span>
        <span className="chip bg-ink text-paper tnum">
          {seasonsIn(fixtures.map(f => ({ date: f.date }))).join(' · ') || currentSeason()}
        </span>
        <span className="eyebrow">Su equipo</span>
        <select className="bg-canvas rounded-lg px-3 py-1.5 text-[13px] outline-none border border-line"
                value={team} onChange={e => setTeam(e.target.value)}>
          <option value="">— elige —</option>
          {teamOptions(fixtures).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-[12px] text-muted">{fixtures.length} jornadas leídas</span>
      </div>

      {!team && <p className="text-[13px] text-ink card-line px-4 py-3">Elige cuál de los equipos es el suyo para poder calcular rivales y resultados.</p>}

      {team && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={() => bulk('titular')} className="chip hover:bg-line transition">Todos titulares 90′</button>
            <button onClick={() => bulk('no')} className="chip hover:bg-line transition">Limpiar todo</button>
            <span className="text-[11px] text-faint self-center">T titular · S suplente · B convocado sin jugar</span>
          </div>

          <div className="border border-line rounded-xl overflow-hidden mb-4">
            <div className="max-h-[42vh] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-canvas sticky top-0 z-10">
                  <tr className="text-muted">
                    <th className="text-left font-semibold px-2 py-2 w-8">J</th>
                    <th className="text-left font-semibold px-2 py-2">Rival</th>
                    <th className="text-left font-semibold px-2 py-2 w-14">Res.</th>
                    <th className="text-left font-semibold px-2 py-2 w-[124px]">Estado</th>
                    <th className="text-left font-semibold px-2 py-2 w-14">Min</th>
                    {gk && <th className="text-left font-semibold px-2 py-2 w-14">Enc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {views.map((v, i) => {
                    const r = rows[i]
                    const off = r.estado === 'no'
                    return (
                      <tr key={i} className={`border-t border-line ${off ? 'opacity-45' : ''}`}>
                        <td className="px-2 py-1.5 tnum text-faint">{v.fixture.round ?? i + 1}</td>
                        <td className="px-2 py-1.5">
                          <span className="text-ink">{v.rival}</span>
                          <span className="text-faint ml-1.5">{v.isHome ? 'C' : 'F'}</span>
                          <div className="text-faint tnum text-[11px]">{v.fixture.date}</div>
                        </td>
                        <td className="px-2 py-1.5 tnum text-sub">{v.result ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-0.5">
                            {ESTADOS.map(([id, short]) => (
                              <button key={id} onClick={() => cycle(i, id)} title={ESTADO_LABEL[id]}
                                      className={`w-6 h-6 rounded-md text-[11px] font-semibold transition ${
                                        r.estado === id ? 'bg-ink text-paper' : 'bg-canvas text-muted hover:bg-line'}`}>
                                {short}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input className="w-11 bg-canvas rounded-md px-1.5 py-1 text-[12px] tnum outline-none disabled:opacity-40"
                                 disabled={off} value={r.mins} inputMode="numeric"
                                 onChange={e => setRow(i, { mins: e.target.value.replace(/\D/g, '') })} />
                        </td>
                        {gk && (
                          <td className="px-2 py-1.5">
                            <input className="w-11 bg-canvas rounded-md px-1.5 py-1 text-[12px] tnum outline-none disabled:opacity-40"
                                   disabled={off} value={r.conceded} inputMode="numeric"
                                   onChange={e => setRow(i, { conceded: e.target.value.replace(/\D/g, '') })} />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales en vivo para cuadrarlos con los de la federación */}
          <div className="bg-ink rounded-2xl px-5 py-4 mb-4 text-paper">
            <div className="eyebrow text-paper/40 mb-3">Cuadra estos con los de la federación</div>
            <div className={`grid ${gk ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'} gap-4`}>
              <Tot v={tot.convocatorias} l="Convocatorias" />
              <Tot v={tot.titular} l="Titular" />
              <Tot v={tot.suplente} l="Suplente" />
              <Tot v={tot.mins} l="Minutos" />
              {gk && <Tot v={tot.encajados} l="Encajados" />}
              {gk && <Tot v={tot.porterias0} l="Porterías 0" />}
            </div>
          </div>

          {existing > 0 && (
            <div className="card-line p-4 mb-4">
              <p className="text-[13px] text-ink mb-3">
                Ya tiene <span className="font-semibold tnum">{existing}</span> partidos guardados en total.
                Reemplazar solo afecta a la temporada que estás importando.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setReplace(false)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-medium ${!replace ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                  Añadir
                </button>
                <button onClick={() => setReplace(true)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-medium ${replace ? 'bg-ink text-paper' : 'bg-canvas text-sub'}`}>
                  Reemplazar esta temporada
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setFixtures(null)} className="btn-line">Volver</button>
            <button onClick={save} disabled={busy || !tot.convocatorias} className="btn-volt">
              {busy ? 'Guardando…' : `Guardar ${tot.convocatorias} partidos`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function Tot({ v, l }: { v: number; l: string }) {
  return (
    <div>
      <div className="stat-num text-paper text-[22px] leading-none tnum">{v}</div>
      <div className="text-[11px] text-paper/40 mt-1">{l}</div>
    </div>
  )
}
