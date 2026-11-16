import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Bar, Panel } from '../Hud'
import { DeviceIcon } from '../icons'
import { HudCarregandoInline } from '../HudState'
import { BRL } from '../../api/client'
import { visao } from '../../api/vision'
import { useRecurso } from '../../hooks/useRecurso'
import { ROTULO_BANDEIRA } from '../../api/visionTypes'
import type { CustoPorAparelho } from '../../api/visionTypes'

// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Ranking de aparelhos em R$/mês
//
// O painel já mostrava reais, mas calculados com a tarifa de dim_tarifa — uma
// tarifa de referência, igual para todo mundo. Aqui o mesmo kWh é convertido
// pela tarifa da CONTA DA PESSOA, lida por foto.
//
// O badge não é enfeite: "R$ 48 no chuveiro" com tarifa chutada e com a tarifa
// real da conta são dois números diferentes, e quem olha o painel precisa
// saber qual dos dois está vendo.
// ─────────────────────────────────────────────────────────────────────────────

export function BadgeTarifa({
  dados,
  compacto = false,
}: {
  dados: Pick<CustoPorAparelho, 'tarifa_brl_kwh' | 'tarifa_estimada' | 'fonte_tarifa'>
  compacto?: boolean
}) {
  const { tarifa_brl_kwh, tarifa_estimada, fonte_tarifa } = dados

  const titulo = tarifa_estimada
    ? 'Tarifa estimada: nenhuma conta escaneada ainda'
    : `Tarifa apurada da fatura de ${fonte_tarifa?.mes_referencia}` +
      (fonte_tarifa?.distribuidora ? ` — ${fonte_tarifa.distribuidora}` : '') +
      (fonte_tarifa?.bandeira ? ` · bandeira ${ROTULO_BANDEIRA[fonte_tarifa.bandeira]}` : '')

  return (
    <span
      title={titulo}
      className={`clip-hud-sm inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
        tarifa_estimada
          ? 'border-amber/50 bg-amber/10 text-amber'
          : 'border-term/50 bg-term/10 text-term'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tarifa_estimada ? 'bg-amber shadow-glow-amber' : 'bg-term shadow-glow'
        }`}
        aria-hidden="true"
      />
      {tarifa_estimada ? 'tarifa estimada' : 'tarifa da sua conta'}
      {!compacto && (
        <span className="font-normal tabular-nums tracking-normal opacity-80">
          {BRL(tarifa_brl_kwh)}/kWh
        </span>
      )}
    </span>
  )
}

export function RankingReais({ limite = 5 }: { limite?: number }) {
  const { dados, erro, carregando } = useRecurso(() => visao.custoPorAparelho(), [], {
    intervaloMs: 60_000,
  })

  // O painel não quebra por causa deste bloco: sem a rota (API antiga, visão
  // desligada) ele simplesmente não aparece.
  if (erro && !dados) return null

  return (
    <Panel
      title="Gasto por aparelho em reais"
      badge={dados ? <BadgeTarifa dados={dados} /> : null}
    >
      {carregando || !dados ? (
        <HudCarregandoInline altura={100} />
      ) : dados.aparelhos.length === 0 ? (
        <p className="t-sub">
          Nenhuma carga com consumo no ciclo ainda. Assim que o NILM registrar eventos, o gasto de
          cada aparelho aparece aqui em reais.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="t-label">Total projetado do mês</div>
              <div className="mt-1 font-bold leading-none text-term text-glow">
                <span className="text-3xl tabular-nums">{BRL(dados.total_mes_brl)}</span>
              </div>
            </div>
            <div className="text-right t-sub">
              {dados.total_mes_kwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh ×{' '}
              {BRL(dados.tarifa_brl_kwh)}/kWh
            </div>
          </div>

          <ul className="divide-y divide-line/60">
            {dados.aparelhos.slice(0, limite).map((a, i) => {
              const maior = dados.aparelhos[0]?.custo_mes_brl || 1
              const lider = i === 0
              return (
                <li key={a.id} className="py-2.5">
                  <Link to={`/painel/aparelhos/${a.id}`} className="group block">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span
                        className={`flex min-w-0 items-center gap-2 ${
                          lider ? 'text-amber text-glow-amber' : 'text-term group-hover:text-glow'
                        }`}
                      >
                        <span className={lider ? 'text-amber/70' : 'text-muted'}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <DeviceIcon
                          categoria={a.categoria}
                          nome={a.nome}
                          size={15}
                          className={lider ? 'text-amber' : 'text-term-dim'}
                        />
                        <span className="truncate">{a.nome}</span>
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-1">
                        <span className={lider ? 't-crit text-base' : 't-crit text-sm'}>
                          {BRL(a.custo_mes_brl)}
                        </span>
                        <span className="t-sub">/mês</span>
                        <ChevronRight
                          size={13}
                          className="text-muted transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Bar
                        value={a.custo_mes_brl}
                        max={maior}
                        color={lider ? 'amber' : 'term'}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                      <span className="tabular-nums">
                        {a.energia_mes_kwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh
                        no mês
                      </span>
                      <span className="tabular-nums">
                        {a.horas_ativas_mes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
                        ativas
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>

          {dados.tarifa_estimada && (
            <Link
              to="/painel/escanear-conta"
              className="clip-hud-sm flex items-center justify-between gap-2 border border-amber/50 bg-amber/[0.07] px-3 py-2.5 transition-colors hover:bg-amber/[0.12]"
            >
              <span className="text-[11px] leading-relaxed text-amber/90">
                Estes valores usam a tarifa média de {BRL(dados.tarifa_brl_kwh)}/kWh. Escaneie sua
                conta para o Amperê usar a tarifa que você paga de verdade.
              </span>
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-amber">
                Escanear ▸
              </span>
            </Link>
          )}
        </div>
      )}
    </Panel>
  )
}
