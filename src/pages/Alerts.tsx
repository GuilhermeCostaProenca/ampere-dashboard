import { Panel } from '../components/Hud'
import { AlertIcon } from '../components/icons'
import { HudErro, HudLoading } from '../components/HudState'
import { api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'
import type { Alerta, TipoAlerta } from '../api/types'

const meta: Record<TipoAlerta, { tag: string; accent: 'term' | 'amber' | 'danger'; color: string }> =
  {
    'over-average': { tag: 'ACIMA DA MÉDIA', accent: 'amber', color: 'text-amber' },
    'no-signal': { tag: 'SEM LEITURA', accent: 'danger', color: 'text-danger' },
    achievement: { tag: 'CONQUISTA', accent: 'term', color: 'text-term' },
  }

/** Linha de log derivada do alerta — o event log agora reflete dados reais. */
function linhaDeLog(a: Alerta) {
  const ts = a.em
    ? new Date(a.em).toLocaleTimeString('pt-BR', { hour12: false })
    : '--:--:--'
  const nivel = a.tipo === 'no-signal' ? 'ERR' : a.tipo === 'achievement' ? 'OK ' : 'WRN'
  return { ts, nivel, tipo: a.tipo, msg: a.titulo }
}

export function Alerts() {
  const { dados, erro, carregando, recarregar } = useRecurso(() => api.alertas(), [], {
    intervaloMs: 30_000,
  })

  if (carregando) {
    return (
      <HudLoading
        titulo="Central de alertas"
        linhas={[
          'varrendo fato_evento_aparelho',
          'comparando com a média da categoria',
          'checando assinaturas perdidas',
        ]}
      />
    )
  }

  if (erro && !dados) return <HudErro erro={erro} aoTentarNovamente={recarregar} />
  if (!dados) return null

  const { alertas } = dados
  const log = alertas.map(linhaDeLog)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Central de alertas
        </h1>
        <p className="t-sub">
          {alertas.length === 0
            ? 'Nenhum evento anômalo no ciclo — tudo dentro do esperado'
            : `${alertas.length} eventos detectados pela IA sobre os dados em nuvem`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── Cards (foco) ── */}
        <div className="grid gap-3 lg:col-span-7">
          {alertas.length === 0 && (
            <Panel title="Sem ocorrências">
              <p className="text-sm text-muted">
                O NILM não encontrou consumo acima da média, perda de assinatura ou marco de
                economia neste ciclo.
              </p>
            </Panel>
          )}
          {alertas.map((a) => {
            const m = meta[a.tipo]
            return (
              <Panel key={a.id} accent={m.accent}>
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center border border-line bg-base ${m.color}`}
                  >
                    <AlertIcon tipo={a.tipo} size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${m.color}`}>
                        {m.tag}
                      </span>
                      <span className="t-sub">{a.ha}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-term">{a.titulo}</h3>
                    <p className="mt-0.5 t-sub">{a.detalhe}</p>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>

        {/* ── Timeline / event log (estilo terminal) ── */}
        <div className="lg:col-span-5">
          <Panel
            title="Event log"
            badge={
              <span className="flex items-center gap-1.5 t-sub uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-term shadow-glow animate-blink" />
                live
              </span>
            }
          >
            <ul className="relative space-y-3 pl-4">
              <span className="absolute left-[5px] top-1 bottom-1 w-px bg-line" />
              {log.map((l, i) => {
                const m = meta[l.tipo]
                return (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-4 top-1 h-2 w-2 rounded-full border border-base ${
                        l.tipo === 'no-signal'
                          ? 'bg-danger'
                          : l.tipo === 'achievement'
                            ? 'bg-term shadow-glow'
                            : 'bg-amber'
                      }`}
                    />
                    <div className="flex items-baseline gap-2 text-[11px] leading-tight">
                      <span className="tabular-nums text-term-dim">{l.ts}</span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider ${m.color}`}
                      >
                        {l.nivel}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      <span className="text-term-dim">$ </span>
                      {l.msg}
                    </div>
                  </li>
                )
              })}
              <li className="relative">
                <span className="absolute -left-4 top-1 h-2 w-2 animate-blink rounded-full bg-term shadow-glow" />
                <span className="text-[11px] text-term">
                  <span className="text-term-dim">$ </span>
                  <span className="animate-blink">█</span>
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
