import { TriangleAlert } from 'lucide-react'
import type { Bandeira, CorBandeira } from '../api/types'

const estilos: Record<
  CorBandeira,
  { dot: string; text: string; border: string; alarme: boolean }
> = {
  verde: { dot: 'bg-term shadow-glow', text: 'text-term', border: 'border-term/50', alarme: false },
  amarela: {
    dot: 'bg-amber shadow-glow-amber',
    text: 'text-amber',
    border: 'border-amber/50',
    alarme: false,
  },
  vermelha_1: {
    dot: 'bg-danger',
    text: 'text-danger text-glow-danger',
    border: 'border-danger/60',
    alarme: true,
  },
  vermelha_2: {
    dot: 'bg-danger',
    text: 'text-danger text-glow-danger',
    border: 'border-danger/70',
    alarme: true,
  },
}

export function TariffFlagBadge({
  bandeira,
  compact = false,
}: {
  bandeira: Bandeira | null
  compact?: boolean
}) {
  if (!bandeira) {
    return (
      <div className="clip-hud-sm flex items-center gap-2 border border-dashed border-line px-2.5 py-1.5">
        <span className="h-2.5 w-2.5 animate-blink rounded-full bg-muted" />
        <span className="text-[10px] uppercase tracking-widest text-muted">bandeira —</span>
      </div>
    )
  }

  const s = estilos[bandeira.cor] ?? estilos.verde

  return (
    <div
      className={`clip-hud-sm flex items-center gap-2 border border-dashed ${s.border} px-2.5 py-1.5 ${
        s.alarme ? 'animate-alarm-pulse' : 'bg-base/60'
      }`}
    >
      {s.alarme ? (
        <TriangleAlert size={15} strokeWidth={2} className="text-danger text-glow-danger" />
      ) : (
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot} animate-blink`} />
      )}
      <div className="leading-tight">
        {!compact && <div className="t-label !tracking-[0.2em]">Bandeira</div>}
        <div className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
          {bandeira.rotulo}
        </div>
      </div>
      {!compact && (
        <span className="ml-1 text-[10px] text-muted">
          +R${bandeira.adicional_por_kwh.toFixed(4)}/kWh
        </span>
      )}
    </div>
  )
}
