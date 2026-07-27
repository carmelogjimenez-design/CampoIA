import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player, Match } from '../types/database'
import { getPlayerName, isGoalkeeper } from '../lib/players'

interface Props { players: Player[]; matches: Match[]; coachId: string; onReload: () => void }

export default function MatchesView({ players, matches, coachId, onReload }: Props) {
  const [show, setShow] = useState(false)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rival, setRival] = useState('')
  const [result, setResult] = useState('')
  const [mins, setMins] = useState('0')
  const [goals, setGoals] = useState('0')
  const [assists, setAssists] = useState('0')
  const [conceded, setConceded] = useState('0')
  const [cleanSheet, setCleanSheet] = useState('0')
  const [busy, setBusy] = useState(false)

  const selPlayer = players.find(p => p.id === playerId)
  const gk = selPlayer ? isGoalkeeper(selPlayer) : false

  async function save() {
    if (!rival.trim() || !playerId) return
    setBusy(true)
    await supabase.from('matches').insert([{
      coach_id: coachId, player_id: playerId, date, rival: rival.trim(),
      result: result || null, mins: parseInt(mins) || 0,
      goals: parseInt(goals) || 0, assists: parseInt(assists) || 0,
      conceded: gk ? (parseInt(conceded) || 0) : null,
      clean_sheet: gk ? cleanSheet === '1' : null,
      called: 'yes', role: 'titular',
    }])
    setBusy(false); setShow(false); setRival(''); setResult(''); setMins('0')
    setGoals('0'); setAssists('0'); onReload()
  }

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-campo-violet text-sm'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Partidos</h1>
          <p className="text-slate-500 mt-1">{matches.length} registrados</p>
        </div>
        <button onClick={() => setShow(true)} className="bg-ink text-white font-semibold rounded-xl px-4 py-2.5">+ Registrar partido</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {matches.map(m => (
          <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="font-semibold text-ink">vs {m.rival}</div>
                <div className="text-xs text-slate-500">{m.date} · {getPlayerName(players, m.player_id)}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-lg text-campo-blue">{m.result || '—'}</div>
                <div className="text-xs text-slate-400">{m.mins}'</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-slate-600">
              {(m.goals ?? 0) > 0 && <span>⚽ {m.goals}</span>}
              {(m.assists ?? 0) > 0 && <span>🅰️ {m.assists}</span>}
              {m.clean_sheet && <span className="text-emerald-600">🧤 Portería a 0</span>}
            </div>
          </div>
        ))}
        {!matches.length && <p className="text-slate-400 py-8">Sin partidos aún.</p>}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
             onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-extrabold text-xl text-ink mb-4">Registrar partido</h2>
            <label className="block text-xs font-bold text-slate-600 mb-1">JUGADOR *</label>
            <select className={inp + ' mb-3'} value={playerId} onChange={e => setPlayerId(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs font-bold text-slate-600 mb-1">FECHA</label>
                <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">RIVAL *</label>
                <input className={inp} value={rival} onChange={e => setRival(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs font-bold text-slate-600 mb-1">RESULTADO</label>
                <input className={inp} placeholder="2-1" value={result} onChange={e => setResult(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">MINUTOS</label>
                <input type="number" className={inp} value={mins} onChange={e => setMins(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs font-bold text-slate-600 mb-1">GOLES</label>
                <input type="number" className={inp} value={goals} onChange={e => setGoals(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">ASISTENCIAS</label>
                <input type="number" className={inp} value={assists} onChange={e => setAssists(e.target.value)} /></div>
            </div>
            {gk && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">GOLES ENCAJADOS</label>
                  <input type="number" className={inp} value={conceded} onChange={e => setConceded(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">¿PORTERÍA A 0?</label>
                  <select className={inp} value={cleanSheet} onChange={e => setCleanSheet(e.target.value)}>
                    <option value="0">No</option><option value="1">Sí</option>
                  </select></div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-slate-500 font-medium">Cancelar</button>
              <button onClick={save} disabled={busy} className="px-5 py-2 bg-ink text-white font-semibold rounded-xl disabled:opacity-60">
                {busy ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
