import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Bar, Panel, StatusDot } from '../components/Hud'
import { DeviceIcon } from '../components/icons'
import { Scope } from '../components/Scope'
import { BRL, dashboard, topDevices, WATTS } from '../data/mock'

function DeltaTag({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${
        up ? 'text-amber text-glow-amber' : 'text-term text-glow'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
      <span className="t-sub font-normal">vs mês ant.</span>
    </span>
  )
}

// KPI compacto p/ a coluna lateral estreita
function MiniKpi({
  label,
  value,
  unit,
  sub,
  accent = 'term',
}: {
  label: string
  value: string
  unit?: string
  sub: React.ReactNode
  accent?: 'term' | 'amber'
}) {
  const v = accent === 'amber' ? 'text-amber text-glow-amber' : 'text-term text-glow'
  return (
    <div className="clip-hud-sm relative border border-line bg-panel/70 px-3.5 py-3">
      <div className="t-label">{label}</div>
      <div className={`mt-1 font-bold leading-none ${v}`}>
        <span className="text-2xl tabular-nums">{value}</span>
        {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
      </div>
      <div className="mt-1.5 t-sub">{sub}</div>
    </div>
  )
}

export function Dashboard() {
  const maxTop = Math.max(...topDevices.map((d) => d.monthCostBRL))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
            Painel de Controle
          </h1>
          <p className="t-sub">Visão geral do consumo da residência em tempo real</p>
        </div>
      </div>

      {/* ── Composição dominante: osciloscópio grande + coluna estreita de KPIs ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel
          title="Uso nas últimas 24h"
          className="lg:col-span-8"
          badge={<span className="t-sub uppercase tracking-widest">Watts • casa</span>}
        >
          <Scope data={dashboard.house24h} height={336} />
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>PICO MANHÃ ~07h–08h</span>
            <span className="text-amber/80">PICO NOITE ~18h–21h</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <MiniKpi
            label="Gasto estimado do mês"
            value={BRL(dashboard.monthEstimateBRL)}
            sub={<DeltaTag pct={dashboard.monthDeltaPct} />}
          />
          <MiniKpi
            label="Consumo agora"
            value={dashboard.nowWatts.toLocaleString('pt-BR')}
            unit="W"
            accent="amber"
            sub={
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-glow-amber animate-blink" />
                leitura NILM ativa
              </span>
            }
          />
          <MiniKpi
            label="Gasto de hoje"
            value={BRL(dashboard.todayCostBRL)}
            sub={`${dashboard.todayActiveHours.toLocaleString('pt-BR')} h de uso ativo`}
          />
        </div>
      </div>

      {/* ── Top aparelhos — faixa larga e baixa (quebra a grade) ── */}
      <Panel
        title="Top aparelhos / gasto"
        accent="amber"
        badge={
          <Link to="/aparelhos" className="t-sub uppercase tracking-widest hover:text-term">
            ver todos ▸
          </Link>
        }
      >
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
          {topDevices.map((d, i) => (
            <li key={d.id}>
              <Link to={`/aparelhos/${d.id}`} className="group block">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-term group-hover:text-glow">
                    <span className="text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <DeviceIcon id={d.id} size={16} className="text-term-dim" />
                    {d.name}
                  </span>
                  <span className="t-crit text-sm">{BRL(d.monthCostBRL)}</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={d.monthCostBRL} max={maxTop} color={i === 0 ? 'amber' : 'term'} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                  <StatusDot status={d.status} />
                  <span className="inline-flex items-center gap-0.5">
                    {d.currentWatts > 0 ? WATTS(d.currentWatts) : '—'}
                    <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
