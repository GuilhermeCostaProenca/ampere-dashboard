import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Bar, Panel, StatusDot } from '../components/Hud'
import { DeviceIcon } from '../components/icons'
import { Scope } from '../components/Scope'
import { HudErro, HudLoading, ScopeSemSinal } from '../components/HudState'
import { BRL, WATTS, api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'
import type { TopAparelho } from '../api/types'

function DeltaTag({ pct }: { pct: number }) {
  const subiu = pct >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${
        subiu ? 'text-amber text-glow-amber' : 'text-term text-glow'
      }`}
    >
      {subiu ? '▲' : '▼'} {Math.abs(pct).toLocaleString('pt-BR')}%
      <span className="t-sub font-normal">vs mês ant.</span>
    </span>
  )
}

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

/**
 * Ranking de gasto por aparelho.
 *
 * Ajuste do teste de usabilidade do CP4: este bloco era o último da tela e os
 * participantes técnicos rolavam direto para o inventário completo, ignorando o
 * ranking. Agora abre o dashboard, e o maior ofensor recebe destaque em âmbar.
 */
function TopAparelhos({ itens }: { itens: TopAparelho[] }) {
  if (itens.length === 0) {
    return <p className="t-sub">Nenhum aparelho com consumo registrado neste ciclo ainda.</p>
  }
  const maior = Math.max(...itens.map((d) => d.custo_brl))

  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
      {itens.map((d, i) => {
        const lider = i === 0
        return (
          <li
            key={d.id}
            className={
              lider
                ? 'clip-hud-sm relative border border-amber/40 bg-amber/[0.06] px-3 py-2.5 md:-my-1'
                : 'px-3 py-2.5'
            }
          >
            <Link to={`/aparelhos/${d.id}`} className="group block">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`flex items-center gap-2 ${
                    lider ? 'text-amber text-glow-amber' : 'text-term group-hover:text-glow'
                  }`}
                >
                  <span className={lider ? 'text-amber/70' : 'text-muted'}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <DeviceIcon
                    categoria={d.categoria}
                    nome={d.nome}
                    size={16}
                    className={lider ? 'text-amber' : 'text-term-dim'}
                  />
                  {d.nome}
                </span>
                <span className={lider ? 't-crit text-base' : 't-crit text-sm'}>
                  {BRL(d.custo_brl)}
                </span>
              </div>
              <div className="mt-1.5">
                <Bar value={d.custo_brl} max={maior} color={lider ? 'amber' : 'term'} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                <StatusDot status={d.status} />
                <span className="inline-flex items-center gap-0.5">
                  {d.potencia_atual_w > 0 ? WATTS(d.potencia_atual_w) : '—'}
                  <ChevronRight
                    size={12}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
              {lider && (
                <div className="mt-2 border-t border-amber/25 pt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber/80">
                  ▲ maior gasto do ciclo
                </div>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Dashboard() {
  // Atualiza a cada 15 s: o "consumo agora" precisa acompanhar o sensor ao vivo.
  const { dados, erro, carregando, atualizando, recarregar } = useRecurso(
    () => api.dashboard(),
    [],
    { intervaloMs: 15_000 },
  )

  if (carregando) {
    return (
      <HudLoading
        titulo="Painel de controle"
        linhas={[
          'estabelecendo enlace com amperê node',
          'lendo fato_leitura_agregada (mês corrente)',
          'consolidando fato_evento_aparelho',
          'aplicando tarifa vigente',
        ]}
      />
    )
  }

  if (erro && !dados) return <HudErro erro={erro} aoTentarNovamente={recarregar} />
  if (!dados) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
            Painel de Controle
          </h1>
          <p className="t-sub">Visão geral do consumo da residência em tempo real</p>
        </div>
        <span className="flex items-center gap-1.5 t-sub uppercase tracking-widest">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              atualizando ? 'bg-amber shadow-glow-amber animate-blink' : 'bg-term shadow-glow'
            }`}
          />
          {atualizando ? 'sincronizando' : 'dados em nuvem'}
        </span>
      </div>

      {/* ── 1º: Top aparelhos (ajuste de usabilidade do CP4) ── */}
      <Panel
        title="Top aparelhos / gasto"
        accent="amber"
        badge={
          <Link to="/aparelhos" className="t-sub uppercase tracking-widest hover:text-term">
            ver todos ▸
          </Link>
        }
      >
        <TopAparelhos itens={dados.top_aparelhos} />
      </Panel>

      {/* ── 2º: osciloscópio grande + coluna estreita de KPIs ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel
          title="Uso nas últimas 24h"
          className="lg:col-span-8"
          badge={<span className="t-sub uppercase tracking-widest">Watts • casa</span>}
        >
          {dados.serie_24h.some((p) => p.watts > 0) ? (
            <Scope data={dados.serie_24h} height={336} />
          ) : (
            <ScopeSemSinal height={336} />
          )}
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>PICO MANHÃ ~06h–07h</span>
            <span className="text-amber/80">PICO NOITE ~19h–23h</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <MiniKpi
            label="Gasto estimado do mês"
            value={BRL(dados.gasto_mes.valor_brl)}
            sub={<DeltaTag pct={dados.gasto_mes.variacao_pct} />}
          />
          <MiniKpi
            label="Consumo agora"
            value={dados.consumo_agora_w.toLocaleString('pt-BR')}
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
            value={BRL(dados.hoje.gasto_brl)}
            sub={`${dados.hoje.horas_ativas.toLocaleString('pt-BR')} h de uso ativo`}
          />
          {Boolean(erro) && (
            <div className="clip-hud-sm border border-amber/40 bg-amber/10 px-3 py-2 text-[10px] text-amber">
              ⚠ última sincronização falhou — exibindo dados anteriores
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
