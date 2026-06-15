import { TriangleAlert } from 'lucide-react'
import { tariffFlag } from '../data/mock'
import type { FlagColor } from '../data/mock'

const styles: Record<
  FlagColor,
  { dot: string; text: string; border: string; alarm: boolean }
> = {
  verde: { dot: 'bg-term shadow-glow', text: 'text-term', border: 'border-term/50', alarm: false },
  amarela: { dot: 'bg-amber shadow-glow-amber', text: 'text-amber', border: 'border-amber/50', alarm: false },
  'vermelha-1': { dot: 'bg-danger', text: 'text-danger text-glow-danger', border: 'border-danger/60', alarm: true },
  'vermelha-2': { dot: 'bg-danger', text: 'text-danger text-glow-danger', border: 'border-danger/70', alarm: true },
}

export function TariffFlagBadge({ compact = false }: { compact?: boolean }) {
  const s = styles[tariffFlag.color]
  return (
    <div
      className={`clip-hud-sm flex items-center gap-2 border border-dashed ${s.border} px-2.5 py-1.5 ${
        s.alarm ? 'animate-alarm-pulse' : 'bg-base/60'
      }`}
    >
      {s.alarm ? (
        <TriangleAlert size={15} strokeWidth={2} className="text-danger text-glow-danger" />
      ) : (
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot} animate-blink`} />
      )}
      <div className="leading-tight">
        {!compact && <div className="t-label !tracking-[0.2em]">Bandeira</div>}
        <div className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
          {tariffFlag.label}
        </div>
      </div>
      {!compact && (
        <span className="ml-1 text-[10px] text-muted">
          +R${tariffFlag.extraPerKwh.toFixed(4)}/kWh
        </span>
      )}
    </div>
  )
}
