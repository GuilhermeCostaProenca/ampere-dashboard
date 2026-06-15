import {
  Bar as RBar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { Bar, Metric, Panel } from '../components/Hud'
import { TariffFlagBadge } from '../components/TariffFlag'
import { BRL, monthlyHistory, monthlyReport } from '../data/mock'

const COLORS = ['#00ff66', '#ffb000', '#37e6ff', '#5c7068']

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="clip-hud-sm border border-term/40 bg-base/95 px-3 py-1.5 text-xs shadow-glow">
      <div className="text-term">{p.name}</div>
      <div className="t-crit">{BRL(p.value)}</div>
    </div>
  )
}

// Grid radial (tipo radar) atrás do donut
function RadialGrid() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 200 200">
      <g stroke="#13201d" strokeWidth="0.6" fill="none">
        {[28, 48, 68, 88].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + Math.cos(a) * 88}
              y2={100 + Math.sin(a) * 88}
            />
          )
        })}
      </g>
    </svg>
  )
}

// Label callout com linha conectora (estilo HUD)
function renderCallout(props: any) {
  const { cx, cy, midAngle, outerRadius, name, value } = props
  const RAD = Math.PI / 180
  const sin = Math.sin(-midAngle * RAD)
  const cos = Math.cos(-midAngle * RAD)
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin
  const mx = cx + (outerRadius + 18) * cos
  const my = cy + (outerRadius + 18) * sin
  const right = cos >= 0
  const ex = mx + (right ? 1 : -1) * 26
  const anchor = right ? 'start' : 'end'
  return (
    <g>
      <polyline
        points={`${sx},${sy} ${mx},${my} ${ex},${my}`}
        stroke="#0a8f43"
        strokeWidth={1}
        fill="none"
      />
      <circle cx={ex} cy={my} r={1.8} fill="#00ff66" />
      <text x={ex + (right ? 5 : -5)} y={my - 2} textAnchor={anchor} fill="#9fb8ad" fontSize={10} fontFamily="JetBrains Mono">
        {name}
      </text>
      <text x={ex + (right ? 5 : -5)} y={my + 10} textAnchor={anchor} fill="#ffb000" fontSize={11} fontWeight={700} fontFamily="JetBrains Mono">
        {BRL(value)}
      </text>
    </g>
  )
}

function HistTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="clip-hud-sm border border-term/40 bg-base/95 px-3 py-1.5 text-xs shadow-glow">
      <div className="text-muted">{label}</div>
      <div className="t-crit">{BRL(payload[0].value)}</div>
    </div>
  )
}

export function Report() {
  const { totalBRL, totalKwh, slices, tip } = monthlyReport
  const maxSlice = Math.max(...slices.map((s) => s.costBRL))
  const maxHist = Math.max(...monthlyHistory.map((m) => m.costBRL))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
            Relatório mensal
          </h1>
          <p className="t-sub">Ciclo fechado • consolidação do consumo da residência</p>
        </div>
        <TariffFlagBadge />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel title="Total faturado">
          <Metric label="Valor do ciclo" value={BRL(totalBRL)} />
        </Panel>
        <Panel title="Energia consumida" accent="amber">
          <Metric label="Total em kWh" value={totalKwh.toLocaleString('pt-BR')} unit="kWh" accent="amber" />
        </Panel>
        <Panel title="Tarifa média">
          <Metric label="Custo por kWh no ciclo" value={BRL(totalBRL / totalKwh)} sub="inclui bandeira ativa" />
        </Panel>
      </div>

      {/* Distribuição (pizza grande) + ranking */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title="Distribuição de custo por aparelho" className="lg:col-span-3">
          <div className="relative mx-auto h-80 max-w-xl">
            <RadialGrid />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="costBRL"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="#05080a"
                  strokeWidth={3}
                  label={renderCallout}
                  labelLine={false}
                  isAnimationActive
                >
                  {slices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* núcleo do donut */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="t-label">total</span>
              <span className="text-2xl font-bold text-term text-glow tabular-nums">{BRL(totalBRL)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Ranking de gasto" accent="amber" className="lg:col-span-2">
          <ul className="space-y-4">
            {slices.map((s, i) => (
              <li key={s.name}>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-2 text-term">
                    <span className="inline-block h-2.5 w-2.5" style={{ background: COLORS[i % COLORS.length] }} />
                    {s.name}
                  </span>
                  <span className="t-crit">{BRL(s.costBRL)}</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={s.costBRL} max={maxSlice} color={i === 0 ? 'amber' : 'term'} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Histórico 6 meses + dica */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title="Histórico — últimos 6 meses" className="lg:col-span-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#5c7068', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1c2a28' }}
                  tickLine={false}
                />
                <Tooltip content={<HistTip />} cursor={{ fill: 'rgba(0,255,102,0.06)' }} />
                <RBar dataKey="costBRL" radius={[0, 0, 0, 0]}>
                  {monthlyHistory.map((m, i) => (
                    <Cell
                      key={i}
                      fill={m.costBRL === maxHist ? '#ffb000' : '#0a8f43'}
                    />
                  ))}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 t-sub">Pico no mês atual (JUN) — {BRL(maxHist)}</div>
        </Panel>

        <Panel title="Dica de economia do mês" accent="amber" className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-term/90">{tip}</p>
        </Panel>
      </div>
    </div>
  )
}
