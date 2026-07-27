import { Player } from '../types/database'

export default function ReportsView({ players }: { players: Player[] }) {
  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Informes</h1>
      <p className="text-slate-500 mb-6">Genera informes de progreso por jugador</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="font-semibold text-ink mb-2">{p.name}</div>
            <button className="text-sm text-campo-blue font-medium">Generar informe →</button>
          </div>
        ))}
      </div>
      <p className="text-slate-400 text-sm mt-6">La generación de informes con IA + PDF se conectará a la Edge Function en la siguiente iteración.</p>
    </div>
  )
}
