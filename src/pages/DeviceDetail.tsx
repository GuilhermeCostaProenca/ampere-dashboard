import { Link, useParams } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { Bar, Metric, Panel, StatusDot } from '../components/Hud'
import { DeviceIcon } from '../components/icons'
import { Scope } from '../components/Scope'
import { BRL, getDevice } from '../data/mock'

export function DeviceDetail() {
  const { id } = useParams()
  const device = id ? getDevice(id) : undefined

  if (!device) {
    return (
      <Panel title="Aparelho não encontrado" accent="danger">
        <p className="text-sm text-muted">A carga solicitada não existe no inventário.</p>
        <Link to="/aparelhos" className="mt-3 inline-block text-xs text-term hover:text-glow">
          ◂ Voltar para aparelhos
        </Link>
      </Panel>
    )
  }

  const vsAvgPct = Math.round(
    ((device.monthCostBRL - device.avgCategoryCostBRL) / device.avgCategoryCostBRL) * 100,
  )
  const above = vsAvgPct > 0

  return (
    <div className="space-y-4">
      <Link
        to="/aparelhos"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted hover:text-term"
      >
        ◂ Aparelhos
      </Link>

      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center border border-term/40 bg-base text-term shadow-glow">
          <DeviceIcon id={device.id} size={28} />
        </span>
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-[0.2em] text-term text-glow">
            {device.name}
          </h1>
          <StatusDot status={device.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Panel>
          <Metric label="Potência atual" value={device.currentWatts > 0 ? device.currentWatts.toLocaleString('pt-BR') : '0'} unit="W" accent="amber" />
        </Panel>
        <Panel>
          <Metric label="Custo no mês" value={BRL(device.monthCostBRL)} />
        </Panel>
        <Panel>
          <Metric label="Horas ativas hoje" value={device.hoursTodayActive.toLocaleString('pt-BR')} unit="h" />
        </Panel>
        <Panel accent={above ? 'amber' : 'term'}>
          <Metric
            label="vs média da categoria"
            value={`${above ? '+' : ''}${vsAvgPct}%`}
            accent={above ? 'amber' : 'term'}
            sub={`média ${BRL(device.avgCategoryCostBRL)}`}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Curva de consumo (24h)"
          className="lg:col-span-2"
          badge={<span className="text-[10px] uppercase tracking-widest text-muted">Watts</span>}
        >
          <Scope data={device.series24h} height={240} fillId={`scope-${device.id}`} />
        </Panel>

        <Panel title="Comparativo">
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-term">Este aparelho</span>
                <span className="font-bold text-amber">{BRL(device.monthCostBRL)}</span>
              </div>
              <Bar
                value={device.monthCostBRL}
                max={Math.max(device.monthCostBRL, device.avgCategoryCostBRL)}
                color="amber"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">Média da categoria</span>
                <span className="font-bold text-muted">{BRL(device.avgCategoryCostBRL)}</span>
              </div>
              <Bar
                value={device.avgCategoryCostBRL}
                max={Math.max(device.monthCostBRL, device.avgCategoryCostBRL)}
                color="term"
              />
            </div>
            <p className="border-t border-line/60 pt-3 text-xs text-muted">
              {above
                ? `Consumo ${vsAvgPct}% acima de aparelhos similares. Há espaço para economia.`
                : `Consumo ${Math.abs(vsAvgPct)}% abaixo da média. Bom desempenho!`}
            </p>
          </div>
        </Panel>
      </div>

      {/* ROI / Recomendação */}
      {device.roi && (
        <Panel title="Recomendação de economia (ROI)" accent="amber">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Lightbulb size={22} strokeWidth={1.6} className="mt-0.5 flex-shrink-0 text-amber" />
              <div>
                <p className="text-sm text-term">{device.roi.suggestion}</p>
                <p className="mt-1 text-xs text-muted">
                  Estimativa baseada no perfil de uso detectado pelo NILM.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-term text-glow tabular-nums">
                  {BRL(device.roi.monthlySavingBRL)}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted">economia/mês</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber text-glow-amber tabular-nums">
                  {device.roi.paybackMonths > 0 ? `${device.roi.paybackMonths}m` : '—'}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted">payback</div>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
