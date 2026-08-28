import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Bar, Panel, StatusDot } from '../components/Hud'
import { DeviceIcon } from '../components/icons'
import { Scope } from '../components/Scope'
import { HudErro, HudLoading, ScopeSemSinal } from '../components/HudState'
import { BRL, WATTS, api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'

export function Devices() {
  const lista = useRecurso(() => api.aparelhos(), [], { intervaloMs: 30_000 })
  const painel = useRecurso(() => api.dashboard(), [], { intervaloMs: 30_000 })

  if (lista.carregando) {
    return (
      <HudLoading
        titulo="Aparelhos identificados"
        linhas={[
          'lendo dim_aparelho',
          'reconstruindo assinaturas NILM',
          'apurando custo do ciclo por carga',
        ]}
      />
    )
  }

  if (lista.erro && !lista.dados) {
    return <HudErro erro={lista.erro} aoTentarNovamente={lista.recarregar} />
  }
  if (!lista.dados) return null

  const { aparelhos, total_ativo_w, ligados } = lista.dados
  const maxWatts = Math.max(...aparelhos.map((d) => d.potencia_atual_w), 1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Aparelhos identificados
        </h1>
        <p className="t-sub">
          {aparelhos.length} cargas reconhecidas pela IA (NILM) a partir de 1 sensor no quadro
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── Inventário (largo) ── */}
        <Panel title="Inventário de cargas" className="lg:col-span-8">
          <div className="hidden grid-cols-12 gap-2 border-b border-line/70 pb-2 t-label md:grid">
            <div className="col-span-5">Aparelho</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2 text-right">Potência</div>
            <div className="col-span-2 text-right">Custo/mês</div>
          </div>

          {aparelhos.length === 0 ? (
            <p className="py-6 text-center t-sub">
              Nenhuma carga identificada ainda. Rode o simulador
              <span className="text-term"> npm run simulate </span>
              para o NILM começar a reconhecer assinaturas.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {aparelhos.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/aparelhos/${d.id}`}
                    className="group grid grid-cols-2 items-center gap-2 py-3 md:grid-cols-12"
                  >
                    <div className="col-span-1 flex items-center gap-3 md:col-span-5">
                      <span className="grid h-9 w-9 place-items-center border border-line bg-base text-term-dim">
                        <DeviceIcon categoria={d.categoria} nome={d.nome} size={18} />
                      </span>
                      <span className="text-sm text-term group-hover:text-glow">{d.nome}</span>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <StatusDot status={d.status} />
                    </div>
                    <div className="col-span-1 text-left text-sm tabular-nums text-muted md:col-span-2 md:text-right">
                      {d.potencia_atual_w > 0 ? WATTS(d.potencia_atual_w) : '—'}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1.5 text-right md:col-span-2">
                      <span className="t-crit text-sm">{BRL(d.custo_mes_brl)}</span>
                      <ChevronRight
                        size={14}
                        className="text-muted transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Painel lateral: telemetria agregada ── */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel title="Total ativo agora" accent="amber">
            <div className="font-bold leading-none text-amber text-glow-amber">
              <span className="text-4xl tabular-nums">
                {Math.round(total_ativo_w).toLocaleString('pt-BR')}
              </span>
              <span className="ml-1 text-base text-muted">W</span>
            </div>
            <div className="mt-2 t-sub">
              {ligados} de {aparelhos.length} cargas ligadas neste instante
            </div>
            <div className="mt-3 space-y-2">
              {aparelhos
                .filter((d) => d.potencia_atual_w > 0)
                .sort((a, b) => b.potencia_atual_w - a.potencia_atual_w)
                .map((d) => (
                  <div key={d.id}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-muted">
                        <DeviceIcon
                          categoria={d.categoria}
                          nome={d.nome}
                          size={12}
                          className="text-term-dim"
                        />
                        {d.nome}
                      </span>
                      <span className="tabular-nums text-term">{WATTS(d.potencia_atual_w)}</span>
                    </div>
                    <div className="mt-1">
                      <Bar value={d.potencia_atual_w} max={maxWatts} color="amber" />
                    </div>
                  </div>
                ))}
              {ligados === 0 && (
                <p className="t-sub">Nenhuma carga ligada — só o consumo de base da casa.</p>
              )}
            </div>
          </Panel>

          <Panel title="Consumo agregado 24h">
            {painel.dados && painel.dados.serie_24h.some((p) => p.watts > 0) ? (
              <Scope data={painel.dados.serie_24h} height={150} fillId="agg-scope" />
            ) : (
              <ScopeSemSinal height={150} />
            )}
            <div className="mt-1 t-sub">Soma de todos os dispositivos da residência</div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
