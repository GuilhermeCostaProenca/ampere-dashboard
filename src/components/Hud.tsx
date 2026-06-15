import type { ReactNode } from 'react'

// Marcadores de mira (L-shapes) nos 4 cantos — estilo cockpit / visor
export function CornerMarks({ color = 'term' }: { color?: 'term' | 'amber' | 'danger' }) {
  const c =
    color === 'amber' ? 'border-amber/70' : color === 'danger' ? 'border-danger/80' : 'border-term/70'
  const size = 'h-3.5 w-3.5'
  return (
    <>
      <span className={`pointer-events-none absolute left-[5px] top-[5px] ${size} border-l-2 border-t-2 ${c}`} />
      <span className={`pointer-events-none absolute right-[5px] top-[5px] ${size} border-r-2 border-t-2 ${c}`} />
      <span className={`pointer-events-none absolute bottom-[5px] left-[5px] ${size} border-b-2 border-l-2 ${c}`} />
      <span className={`pointer-events-none absolute bottom-[5px] right-[5px] ${size} border-b-2 border-r-2 ${c}`} />
    </>
  )
}

interface PanelProps {
  title?: string
  badge?: ReactNode
  children: ReactNode
  className?: string
  accent?: 'term' | 'amber' | 'danger'
  brackets?: boolean
}

// Painel base do HUD: chanfro pronunciado, brackets de mira, label dim
export function Panel({
  title,
  badge,
  children,
  className = '',
  accent = 'term',
  brackets = true,
}: PanelProps) {
  const labelColor =
    accent === 'amber' ? 'text-amber/90' : accent === 'danger' ? 'text-danger/90' : 'text-term-label'
  const edge =
    accent === 'amber' ? 'border-amber/25' : accent === 'danger' ? 'border-danger/30' : 'border-line'
  return (
    <section
      className={`clip-hud relative border ${edge} bg-panel/80 backdrop-blur-sm ${className}`}
    >
      {brackets && <CornerMarks color={accent} />}
      {(title || badge) && (
        <header className="flex items-center justify-between border-b border-line/70 px-4 py-2.5">
          {title && (
            <h2 className={`t-label ${labelColor}`}>
              <span className="mr-1 opacity-50">▚</span>
              {title}
            </h2>
          )}
          {badge}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

// Rótulo + valor grande, padrão "telemetria"
export function Metric({
  label,
  value,
  unit,
  sub,
  accent = 'term',
  size = 'lg',
}: {
  label: string
  value: string
  unit?: string
  sub?: ReactNode
  accent?: 'term' | 'amber' | 'danger'
  size?: 'lg' | 'md'
}) {
  const valColor =
    accent === 'amber'
      ? 'text-amber text-glow-amber'
      : accent === 'danger'
        ? 'text-danger text-glow-danger'
        : 'text-term text-glow'
  const valSize = size === 'lg' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
  return (
    <div>
      <div className="t-label">{label}</div>
      <div className={`mt-1.5 font-bold leading-none ${valColor}`}>
        <span className={`${valSize} tabular-nums`}>{value}</span>
        {unit && <span className="ml-1 text-base text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-2 t-sub">{sub}</div>}
    </div>
  )
}

// Barra de progresso/uso estilo HUD
export function Bar({
  value,
  max,
  color = 'term',
}: {
  value: number
  max: number
  color?: 'term' | 'amber' | 'danger'
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const bg = color === 'amber' ? 'bg-amber' : color === 'danger' ? 'bg-danger' : 'bg-term'
  const shadow =
    color === 'amber' ? 'shadow-glow-amber' : color === 'danger' ? '' : 'shadow-glow'
  return (
    <div className="h-2 w-full overflow-hidden border border-line bg-base">
      <div
        className={`h-full ${bg} ${shadow} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// "LED" de status
export function StatusDot({ status }: { status: 'on' | 'off' | 'no-signal' | 'online' | 'offline' }) {
  const map = {
    on: { c: 'bg-term shadow-glow', t: 'LIGADO', anim: '' },
    online: { c: 'bg-term shadow-glow', t: 'ONLINE', anim: '' },
    off: { c: 'bg-muted', t: 'DESLIGADO', anim: '' },
    offline: { c: 'bg-muted', t: 'OFFLINE', anim: '' },
    'no-signal': { c: 'bg-amber shadow-glow-amber', t: 'SEM SINAL', anim: 'animate-blink' },
  } as const
  const m = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${m.c} ${m.anim}`} />
      {m.t}
    </span>
  )
}
