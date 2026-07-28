interface Props { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }
export default function Modal({ title, onClose, children, wide }: Props) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-[fadeIn_.2s_ease]"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card p-5 sm:p-7 w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto shadow-apple-lg`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-[22px] text-ink tracking-tighter2">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-canvas hover:bg-line flex items-center justify-center text-sub transition">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
