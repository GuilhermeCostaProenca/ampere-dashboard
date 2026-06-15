import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DeviceReading } from '../data/mock'

// Tooltip estilo terminal
function ScopeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-term/40 bg-base/95 px-3 py-1.5 text-xs shadow-glow">
      <div className="text-muted">{label}</div>
      <div className="font-bold text-term">
        {Number(payload[0].value).toLocaleString('pt-BR')} W
      </div>
    </div>
  )
}

interface ScopeProps {
  data: DeviceReading[]
  height?: number
  color?: string // hex
  fillId?: string
}

// Gráfico estilo osciloscópio: linha com glow, grid sutil, sem eixos pesados
export function Scope({ data, height = 200, color = '#00ff66', fillId = 'scopeFill' }: ScopeProps) {
  return (
    <div className="relative" style={{ height }}>
      {/* varredura horizontal animada */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div
          className="h-full w-1/3 animate-sweep"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}22, transparent)`,
          }}
        />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={`${fillId}-glow`}>
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="#13201d" strokeDasharray="2 4" vertical={true} />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#5c7068', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            interval={3}
            axisLine={{ stroke: '#1c2a28' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5c7068', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ScopeTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="watts"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${fillId})`}
            filter={`url(#${fillId}-glow)`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: '#05080a' }}
            isAnimationActive={true}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
