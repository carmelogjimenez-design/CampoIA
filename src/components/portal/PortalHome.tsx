import { PlayerData } from '../../hooks/usePlayerData'

export default function PortalHome({ pd, onGo }: { pd: PlayerData; onGo: (t: string) => void }) {
  const { profile, training, tasks } = pd
  const totalDone = training.filter(s => s.completed).length
  const pending = training.filter(s => !s.completed).length
  const pendingTasks = tasks.filter(t => !t.done).length

  return (
    <div>
      <div className="rounded-3xl p-7 mb-5 bg-ink text-paper relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />
        <div className="relative">
          <div className="text-[14px] text-paper/60">Hola, {profile!.name.split(' ')[0]}</div>
          <div className="font-display font-bold text-[26px] tracking-tightest mt-1.5">Tu progreso no para.</div>
          <div className="flex gap-8 mt-6">
            <div><div className="stat-num text-paper text-[30px] leading-none">{totalDone}</div><div className="text-[11px] text-paper/50 mt-1.5">Completados</div></div>
            <div><div className="stat-num text-volt text-[30px] leading-none">{pending}</div><div className="text-[11px] text-paper/50 mt-1.5">Por hacer</div></div>
            <div><div className="stat-num text-paper text-[30px] leading-none">{pendingTasks}</div><div className="text-[11px] text-paper/50 mt-1.5">Tareas</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Access label="Mis entrenos" sub={`${pending} pendientes`} onClick={() => onGo('training')} />
        <Access label="¿Cómo estás hoy?" sub="Registra tu día" onClick={() => onGo('checkin')} accent />
        <Access label="Mi comida" sub="Apunta lo que comes" onClick={() => onGo('nutrition')} />
        <Access label="Habla con tu coach" sub="Mensajes" onClick={() => onGo('chat')} />
      </div>
    </div>
  )
}

function Access({ label, sub, onClick, accent }: { label: string; sub: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`card p-5 text-left hover:shadow-apple-lg transition-shadow ${accent ? 'ring-1 ring-volt' : ''}`}>
      <div className="font-medium text-ink text-[15px]">{label}</div>
      <div className="text-[12px] text-muted mt-1">{sub}</div>
    </button>
  )
}
