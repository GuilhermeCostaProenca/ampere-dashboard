import { Link, useParams } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { Bar, Metric, Panel, StatusDot } from '../components/Hud'
import { DeviceIcon } from '../components/icons'
import { Scope } from '../components/Scope'
import { HudErro, HudLoading, ScopeSemSinal } from '../components/HudState'
import { BadgePro, RecursoBloqueado } from '../components/BadgePro'
import { BRL, api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'

export function DeviceDetail() {
  const { id } = useParams()
  const { dados, erro, carregando, recarregar } = useRecurso(() => api.aparelho(id!), [id], {
    habilitado: Boolean(id),
    intervaloMs: 30_000,
  })

  if (carregando) {
    return (
      <HudLoading
        titulo="Detalhe da carga"
        linhas={['lendo dim_aparelho', 'reconstruindo curva de 24h', 'calculando comparativos']}
      />
    )
  }

  if (erro && !dados) {
    return (
      <div className="space-y-4">
        <HudErro erro={erro} aoTentarNovamente={recarregar} />
        <Link to="/aparelhos" className="inline-block text-xs text-term hover:text-glow">
          ◂ Voltar para aparelhos
        </Link>
      </div>
    )
  }
  if (!dados) return null

  const { aparelho, serie_24h, roi, roi_bloqueado, plano_requerido } = dados
  const media = aparelho.media_categoria_brl
  const vsMediaPct =
    media > 0 ? Math.round(((aparelho.custo_mes_brl - media) / media) * 100) : 0
  const acima = vsMediaPct > 0

  return (
    <div className="space-y-4">
      <Link
        to="/aparelhos"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted hover:text-term"
      >
        ◂ Aparelhos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center border border-term/40 bg-base text-term shadow-glow">
            <DeviceIcon categoria={aparelho.categoria} nome={aparelho.nome} size={28} />
          </span>
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-[0.2em] text-term text-glow">
              {aparelho.nome}
            </h1>
            <StatusDot status={aparelho.status} />
          </div>
        </div>
        {/* Badge do plano também no topo do detalhe (ajuste de usabilidade). */}
        {roi_bloqueado && <BadgePro plano={plano_requerido} />}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Panel>
          <Metric
            label="Potência atual"
            value={Math.round(aparelho.potencia_atual_w).toLocaleString('pt-BR')}
            unit="W"
            accent="amber"
          />
        </Panel>
        <Panel>
          <Metric
            label="Custo estimado no mês"
            value={BRL(aparelho.custo_mes_brl)}
            sub={`${BRL(aparelho.custo_acumulado_brl)} acumulados no ciclo`}
          />
        </Panel>
        <Panel>
          <Metric
            label="Horas ativas no mês"
            value={aparelho.horas_ativas_mes.toLocaleString('pt-BR')}
            unit="h"
          />
        </Panel>
        <Panel accent={acima ? 'amber' : 'term'}>
          <Metric
            label="vs média da categoria"
            value={`${acima ? '+' : ''}${vsMediaPct}%`}
            accent={acima ? 'amber' : 'term'}
            sub={`média ${BRL(media)}`}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Curva de consumo (24h)"
          className="lg:col-span-2"
          badge={<span className="text-[10px] uppercase tracking-widest text-muted">Watts</span>}
        >
          {serie_24h.some((p) => p.watts > 0) ? (
            <Scope data={serie_24h} height={240} fillId={`scope-${aparelho.id}`} />
          ) : (
            <ScopeSemSinal height={240} />
          )}
        </Panel>

        <Panel title="Comparativo">
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-term">Este aparelho</span>
                <span className="font-bold text-amber">{BRL(aparelho.custo_mes_brl)}</span>
              </div>
              <Bar
                value={aparelho.custo_mes_brl}
                max={Math.max(aparelho.custo_mes_brl, media, 1)}
                color="amber"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">Média da categoria</span>
                <span className="font-bold text-muted">{BRL(media)}</span>
              </div>
              <Bar
                value={media}
                max={Math.max(aparelho.custo_mes_brl, media, 1)}
                color="term"
              />
            </div>
            <p className="border-t border-line/60 pt-3 text-xs text-muted">
              {acima
                ? `Consumo ${vsMediaPct}% acima de aparelhos similares. Há espaço para economia.`
                : `Consumo ${Math.abs(vsMediaPct)}% abaixo da média. Bom desempenho!`}
            </p>
          </div>
        </Panel>
      </div>

      {/* ── ROI: liberado no Pro, com preço visível quando bloqueado ── */}
      {roi && (
        <Panel title="Recomendação de economia (ROI)" accent="amber">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Lightbulb size={22} strokeWidth={1.6} className="mt-0.5 flex-shrink-0 text-amber" />
              <div>
                <p className="text-sm text-term">{roi.sugestao}</p>
                <p className="mt-1 text-xs text-muted">
                  Estimativa baseada no perfil de uso detectado pelo NILM.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-term text-glow tabular-nums">
                  {BRL(roi.economia_mensal_brl)}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted">economia/mês</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber text-glow-amber tabular-nums">
                  {roi.payback_meses > 0 ? `${roi.payback_meses}m` : '—'}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted">payback</div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {roi_bloqueado && (
        <Panel title="Recomendação de economia (ROI)" accent="amber">
          <RecursoBloqueado
            titulo="Recomendação de ROI disponível no plano Pro"
            descricao="Quanto este aparelho pode economizar por mês e em quantos meses o investimento se paga."
            plano={plano_requerido}
          />
        </Panel>
      )}
    </div>
  )
}
