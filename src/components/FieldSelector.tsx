import { PosGroup } from '../types/database'

// Zonas del campo con su grupo posicional
const ZONES: { id: string; label: string; group: PosGroup; x: number; y: number }[] = [
  { id: 'POR', label: 'POR', group: 'POR', x: 50, y: 90 },
  { id: 'LI', label: 'LI', group: 'DEF', x: 18, y: 72 },
  { id: 'DFC-I', label: 'DFC', group: 'DEF', x: 38, y: 76 },
  { id: 'DFC-D', label: 'DFC', group: 'DEF', x: 62, y: 76 },
  { id: 'LD', label: 'LD', group: 'DEF', x: 82, y: 72 },
  { id: 'MCD', label: 'MCD', group: 'MED', x: 50, y: 58 },
  { id: 'MC-I', label: 'MC', group: 'MED', x: 32, y: 48 },
  { id: 'MC-D', label: 'MC', group: 'MED', x: 68, y: 48 },
  { id: 'MP', label: 'MP', group: 'MED', x: 50, y: 38 },
  { id: 'EI', label: 'EI', group: 'DEL', x: 20, y: 26 },
  { id: 'DC', label: 'DC', group: 'DEL', x: 50, y: 18 },
  { id: 'ED', label: 'ED', group: 'DEL', x: 80, y: 26 },
]

interface Props { value: string | null; group: PosGroup | null; onChange: (pos: string, group: PosGroup) => void }

export default function FieldSelector({ value, onChange }: Props) {
  return (
    <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] rounded-2xl overflow-hidden bg-ink">
      {/* líneas del campo */}
      <svg viewBox="0 0 100 133" className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }}>
        <rect x="4" y="4" width="92" height="125" fill="none" stroke="#fff" strokeWidth="0.5" />
        <line x1="4" y1="66.5" x2="96" y2="66.5" stroke="#fff" strokeWidth="0.5" />
        <circle cx="50" cy="66.5" r="12" fill="none" stroke="#fff" strokeWidth="0.5" />
        <rect x="28" y="4" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
        <rect x="28" y="109" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
      </svg>
      {ZONES.map(z => {
        const active = value === z.id
        return (
          <button key={z.id} onClick={() => onChange(z.id, z.group)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[9px] font-bold transition ${active ? 'bg-volt text-ink scale-110 shadow-volt' : 'bg-paper/15 text-paper/70 hover:bg-paper/30'}`}
                  style={{ left: `${z.x}%`, top: `${z.y}%`, width: 30, height: 30 }}>
            {z.label}
          </button>
        )
      })}
    </div>
  )
}
