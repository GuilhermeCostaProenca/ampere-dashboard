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
import { HudErro, HudLoading } from '../components/HudState'
import { BRL, api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'
import type { EconomiaAcumulada } from '../api/types'

const CORES = ['#00ff66', '#ffb000', '#37e6ff', '#5c7068']

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

function RadialGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 200 200"
    >
      <g stroke="#13201d" strokeWidth="0.6" fill="none">
        {[28, 48, 68, 88].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180
          return (
            <line key={i} x1="100" y1="100" x2={100 + Math.cos(a) * 88} y2={100 + Math.sin(a) * 88} />
          )
        })}
      </g>
    </svg>
  )
}

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
      <text
        x={ex + (right ? 5 : -5)}
        y={my - 2}
        textAnchor={anchor}
        fill="#9fb8ad"
        fontSize={10}
        fontFamily="JetBrains Mono"
      >
        {name}
      </text>
      <text
        x={ex + (right ? 5 : -5)}
        y={my + 10}
        textAnchor={anchor}
        fill="#ffb000"
        fontSize={11}
        fontWeight={700}
        fontFamily="JetBrains Mono"
      >
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

/**
 * Economia acumulada — ajuste 2 do teste de usabilidade do CP4.
 * Fica ao lado do gasto total e compara a projeção do ciclo corrente com a
 * média dos ciclos fechados anteriores. Economia positiva em verde-terminal;
 * gasto acima da média em âmbar, com o sinal explícito.
 */
function PainelEconomia({ economia }: { economia: EconomiaAcumulada }) {
  const economizou = economia.valor_brl >= 0
  const semBase = economia.meses_comparados === 0

  if (semBase) {
    return (
      <Panel title="Economia acumulada">
        <Metric label="Sem base de comparação" value="—" />
        <p className="mt-2 t-sub">
          É preciso ao menos um ciclo fechado anterior para calcular a economia.
        </p>
      </Panel>
    )
  }

  return (
    <Panel title="Economia acumulada" accent={economizou ? 'term' : 'amber'}>
      <Metric
        label={economizou ? 'Abaixo da média dos ciclos anteriores' : 'Acima da média dos anteriores'}
        value={`${economizou ? '−' : '+'}${BRL(Math.abs(economia.valor_brl)).replace('R$', 'R$ ')}`}
        accent={economizou ? 'term' : 'amber'}
        sub={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`font-bold ${economizou ? 'text-term' : 'text-amber'}`}
            >
              {economizou ? '▼' : '▲'} {Math.abs(economia.variacao_pct).toLocaleString('pt-BR')}%
            </span>
            <span>
              vs média de {economia.meses_comparados}{' '}
              {economia.meses_comparados === 1 ? 'ciclo' : 'ciclos'} (
              {BRL(economia.media_meses_anteriores_brl)})
            </span>
          </span>
        }
      />
    </Panel>
  )
}

export function Report() {
  const { dados, erro, carregando, recarregar } = useRecurso(() => api.relatorio(), [], {
    intervaloMs: 60_000,
  })

  if (carregando) {
    return (
      <HudLoading
        titulo="Relatório mensal"
        linhas={[
          'consolidando o ciclo corrente',
          'distribuindo custo por aparelho',
          'comparando com ciclos anteriores',
        ]}
      />
    )
  }

  if (erro && !dados) return <HudErro erro={erro} aoTentarNovamente={recarregar} />
  if (!dados) return null

  const { total_brl, total_kwh, distribuicao, historico, economia_acumulada, dica, bandeira } = dados
  const maxFatia = Math.max(...distribuicao.map((s) => s.custo_brl), 1)
  const maxHist = Math.max(...historico.map((m) => m.custo_brl), 1)
  const ultimoHist = historico.at(-1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
            Relatório mensal
          </h1>
          <p className="t-sub">Ciclo em curso • consolidação do consumo da residência</p>
        </div>
        <TariffFlagBadge bandeira={bandeira} />
      </div>

      {/* Resumo — gasto total, economia acumulada (ajuste CP4), energia e tarifa */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Panel title="Total do ciclo">
          <Metric
            label="Acumulado até agora"
            value={BRL(total_brl)}
            sub={`projeção do mês ${BRL(dados.projecao_brl)}`}
          />
        </Panel>

        <PainelEconomia economia={economia_acumulada} />

        <Panel title="Energia consumida" accent="amber">
          <Metric
            label="Total em kWh"
            value={total_kwh.toLocaleString('pt-BR')}
            unit="kWh"
            accent="amber"
          />
        </Panel>

        <Panel title="Tarifa média">
          <Metric
            label="Custo por kWh no ciclo"
            value={BRL(dados.tarifa_media_brl_kwh)}
            sub="inclui bandeira ativa"
          />
        </Panel>
      </div>

      {/* Distribuição + ranking */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title="Distribuição de custo por aparelho" className="lg:col-span-3">
          {distribuicao.length === 0 ? (
            <p className="py-12 text-center t-sub">
              Sem eventos de aparelho neste ciclo — nada a distribuir ainda.
            </p>
          ) : (
            <div className="relative mx-auto h-80 max-w-xl">
              <RadialGrid />
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicao}
                    dataKey="custo_brl"
                    nameKey="nome"
                    innerRadius={56}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="#05080a"
                    strokeWidth={3}
                    label={renderCallout}
                    labelLine={false}
                    isAnimationActive
                  >
                    {distribuicao.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="t-label">total</span>
                <span className="text-2xl font-bold text-term text-glow tabular-nums">
                  {BRL(total_brl)}
                </span>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Ranking de gasto" accent="amber" className="lg:col-span-2">
          <ul className="space-y-4">
            {distribuicao.map((s, i) => (
              <li key={s.nome}>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-2 text-term">
                    <span
                      className="inline-block h-2.5 w-2.5"
                      style={{ background: CORES[i % CORES.length] }}
                    />
                    {s.nome}
                  </span>
                  <span className="t-crit">{BRL(s.custo_brl)}</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={s.custo_brl} max={maxFatia} color={i === 0 ? 'amber' : 'term'} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Histórico + dica */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title={`Histórico — últimos ${historico.length} ciclos`} className="lg:col-span-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historico} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="rotulo"
                  tick={{ fill: '#5c7068', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1c2a28' }}
                  tickLine={false}
                />
                <Tooltip content={<HistTip />} cursor={{ fill: 'rgba(0,255,102,0.06)' }} />
                <RBar dataKey="custo_brl">
                  {historico.map((m, i) => (
                    <Cell key={i} fill={m.custo_brl === maxHist ? '#ffb000' : '#0a8f43'} />
                  ))}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 t-sub">
            {ultimoHist
              ? `Ciclo corrente (${ultimoHist.rotulo}) — ${BRL(ultimoHist.custo_brl)} acumulados`
              : 'Sem histórico consolidado'}
          </div>
        </Panel>

        <Panel title="Dica de economia do mês" accent="amber" className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-term/90">{dica}</p>
        </Panel>
      </div>
    </div>
  )
}
