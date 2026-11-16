import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Hud'
import { HudErro } from '../components/HudState'
import { AbasVisao } from '../components/vision/AbasVisao'
import { CapturaFoto } from '../components/vision/CapturaFoto'
import { CampoExtraido, ListaAvisos } from '../components/vision/CampoExtraido'
import { BRL } from '../api/client'
import { visao } from '../api/vision'
import { ROTULO_BANDEIRA } from '../api/visionTypes'
import type {
  Aviso,
  BandeiraFatura,
  FaturaConfirmada,
  RespostaFatura,
} from '../api/visionTypes'

// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Escanear conta de luz
//
// O que esta tela resolve: o NILM sabe quantos kWh cada aparelho gastou, mas
// não sabe quanto vale o kWh NESTA casa. A conta de luz tem esse número, e
// digitá-la à mão é justamente o atrito que faz ninguém usar. A foto resolve.
//
// A tarifa efetiva (valor_total / consumo) é o que sai daqui e vira o R$/mês
// de cada aparelho no painel.
// ─────────────────────────────────────────────────────────────────────────────

/** Texto do campo → número. Aceita "1.234,56" e "1234.56". */
function paraNumero(texto: string): number | null {
  const limpo = texto.trim()
  if (!limpo) return null
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo.replace(/\s/g, '')
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

/** Número → texto do campo, com vírgula decimal e sem separador de milhar. */
const paraTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

const BANDEIRAS_OPCOES = [
  { valor: '', rotulo: '— não informada —' },
  ...(Object.keys(ROTULO_BANDEIRA) as BandeiraFatura[]).map((b) => ({
    valor: b,
    rotulo: ROTULO_BANDEIRA[b],
  })),
]

interface Formulario {
  distribuidora: string
  mes_referencia: string
  consumo_kwh: string
  valor_total: string
  tarifa_kwh_sem_tributos: string
  bandeira: string
  leitura_anterior: string
  leitura_atual: string
}

function formularioDe(r: RespostaFatura): Formulario {
  const e = r.extracao
  return {
    distribuidora: e.distribuidora ?? '',
    mes_referencia: e.mes_referencia ?? '',
    consumo_kwh: paraTexto(e.consumo_kwh),
    valor_total: paraTexto(e.valor_total),
    tarifa_kwh_sem_tributos: paraTexto(e.tarifa_kwh_sem_tributos),
    bandeira: e.bandeira ?? '',
    leitura_anterior: paraTexto(e.leitura_anterior),
    leitura_atual: paraTexto(e.leitura_atual),
  }
}

export function EscanearConta() {
  const [foto, setFoto] = useState<File | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [resultado, setResultado] = useState<RespostaFatura | null>(null)
  const [form, setForm] = useState<Formulario | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmada, setConfirmada] = useState<FaturaConfirmada | null>(null)

  const avisoDe = (campo: string): Aviso | undefined =>
    resultado?.warnings.find((a) => a.campo === campo)

  const avisosSoltos = useMemo(() => {
    const camposNaTela = new Set([
      'distribuidora',
      'mes_referencia',
      'consumo_kwh',
      'valor_total',
      'tarifa_kwh_sem_tributos',
      'bandeira',
      'leitura_anterior',
      'leitura_atual',
    ])
    return (resultado?.warnings ?? []).filter((a) => !camposNaTela.has(a.campo))
  }, [resultado])

  // Recalculada a cada tecla: a pessoa corrige o consumo e vê a tarifa mudar
  // na hora, que é o feedback que mostra o impacto do que ela está digitando.
  const tarifaEfetiva = useMemo(() => {
    if (!form) return null
    const valor = paraNumero(form.valor_total)
    const consumo = paraNumero(form.consumo_kwh)
    if (valor === null || consumo === null || consumo <= 0 || valor <= 0) return null
    return valor / consumo
  }, [form])

  async function ler() {
    if (!foto) return
    setProcessando(true)
    setErro(null)
    setConfirmada(null)
    try {
      const r = await visao.lerConta(foto)
      setResultado(r)
      setForm(formularioDe(r))
    } catch (e) {
      setErro(e)
      setResultado(null)
      setForm(null)
    } finally {
      setProcessando(false)
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !resultado) return

    const consumo = paraNumero(form.consumo_kwh)
    const valor = paraNumero(form.valor_total)
    if (!form.mes_referencia || consumo === null || valor === null) return

    setSalvando(true)
    setErro(null)
    try {
      const r = await visao.confirmarConta({
        extraido: resultado.extracao,
        confirmado: {
          distribuidora: form.distribuidora.trim() || null,
          mes_referencia: form.mes_referencia,
          consumo_kwh: consumo,
          valor_total: valor,
          tarifa_kwh_sem_tributos: paraNumero(form.tarifa_kwh_sem_tributos),
          bandeira: form.bandeira || null,
          leitura_anterior: paraNumero(form.leitura_anterior),
          leitura_atual: paraNumero(form.leitura_atual),
        },
        meta: {
          provider: resultado.meta.provider,
          modelo: resultado.meta.modelo,
          latencia_ms: resultado.meta.latencia_ms,
          tentativas: resultado.meta.tentativas,
        },
      })
      setConfirmada(r)
    } catch (e2) {
      setErro(e2)
    } finally {
      setSalvando(false)
    }
  }

  const atualizar = (campo: keyof Formulario) => (valor: string) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f))

  const podeConfirmar =
    !!form &&
    !!form.mes_referencia &&
    paraNumero(form.consumo_kwh) !== null &&
    paraNumero(form.valor_total) !== null &&
    tarifaEfetiva !== null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Escanear conta
        </h1>
        <p className="t-sub">
          A foto da fatura dá ao Amperê a tarifa real desta casa — é ela que converte o kWh que o
          NILM mede em reais por aparelho.
        </p>
      </div>

      <AbasVisao />

      {erro ? <HudErro erro={erro} aoTentarNovamente={() => setErro(null)} /> : null}

      {confirmada ? (
        <Panel title="Fatura confirmada">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center border border-term/60 bg-base text-term text-glow">
                ✓
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-term text-glow">
                  Tarifa da sua conta ativada
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  O painel passa a mostrar o gasto de cada aparelho em reais usando{' '}
                  <strong className="text-term">
                    {BRL(confirmada.fatura.tarifa_efetiva)}/kWh
                  </strong>
                  , apurado da fatura de {confirmada.fatura.mes_referencia}.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { r: 'Consumo', v: `${confirmada.fatura.consumo_kwh} kWh` },
                { r: 'Total pago', v: BRL(confirmada.fatura.valor_total) },
                { r: 'Tarifa efetiva', v: `${BRL(confirmada.fatura.tarifa_efetiva)}/kWh` },
                {
                  r: 'Leitura conferida',
                  v:
                    confirmada.acerto.taxa_acerto_pct === null
                      ? '—'
                      : `${confirmada.acerto.taxa_acerto_pct}% sem correção`,
                },
              ].map((i) => (
                <div key={i.r} className="clip-hud-sm border border-line bg-panel/70 px-3 py-2.5">
                  <dt className="t-label">{i.r}</dt>
                  <dd className="mt-1 text-sm font-bold tabular-nums text-term">{i.v}</dd>
                </div>
              ))}
            </dl>

            {confirmada.acerto.campos_corrigidos.length > 0 && (
              <p className="t-sub">
                Campos que você corrigiu:{' '}
                <span className="text-amber">
                  {confirmada.acerto.campos_corrigidos.join(', ')}
                </span>
                . A correção entra no indicador de acerto da leitura.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                to="/painel"
                className="clip-hud-sm border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-term transition-colors hover:bg-term/20"
              >
                Ver o gasto por aparelho ▸
              </Link>
              <button
                type="button"
                onClick={() => {
                  setConfirmada(null)
                  setResultado(null)
                  setForm(null)
                  setFoto(null)
                }}
                className="clip-hud-sm border border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:border-term/50 hover:text-term"
              >
                Escanear outra conta
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel title="Foto da fatura" className="lg:col-span-5">
            <CapturaFoto
              id="foto-conta"
              rotulo="Fotografar a conta"
              dica="Enquadre a conta inteira, de frente e sem reflexo. O Amperê lê só os campos técnicos — nome, CPF, endereço e número de instalação não são extraídos, e a foto não é guardada."
              processando={processando}
              rotuloAcao="Ler a conta"
              aoEscolher={(f) => {
                setFoto(f)
                setResultado(null)
                setForm(null)
                setErro(null)
              }}
              aoLimpar={() => {
                setFoto(null)
                setResultado(null)
                setForm(null)
              }}
              aoEnviar={ler}
            />

            {resultado && (
              <dl className="mt-4 border-t border-line/70 pt-3 text-[10px] leading-relaxed text-muted">
                <div className="flex justify-between">
                  <dt>modelo</dt>
                  <dd className="text-term-dim">{resultado.meta.modelo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>latência da leitura</dt>
                  <dd className="tabular-nums text-term-dim">
                    {(resultado.meta.latencia_ms / 1000).toFixed(1)} s
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>preparo da imagem</dt>
                  <dd className="tabular-nums text-term-dim">
                    {resultado.meta.imagem.preparo_ms.toFixed(0)} ms ·{' '}
                    {resultado.meta.imagem.largura}×{resultado.meta.imagem.altura}
                  </dd>
                </div>
              </dl>
            )}
          </Panel>

          <div className="lg:col-span-7">
            {!form ? (
              <Panel title="Campos extraídos">
                <p className="t-sub">
                  Os campos lidos aparecem aqui para você conferir e corrigir antes de confirmar.
                </p>
              </Panel>
            ) : (
              <form onSubmit={confirmar} noValidate>
                <Panel
                  title="Campos extraídos"
                  accent={resultado && resultado.warnings.length > 0 ? 'amber' : 'term'}
                >
                  <div className="space-y-4">
                    <ListaAvisos avisos={avisosSoltos} />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CampoExtraido
                        id="f-distribuidora"
                        rotulo="Distribuidora"
                        valor={form.distribuidora}
                        aoMudar={atualizar('distribuidora')}
                        confianca={resultado?.extracao.confianca.distribuidora}
                        aviso={avisoDe('distribuidora')}
                      />
                      <CampoExtraido
                        id="f-mes"
                        rotulo="Mês de referência"
                        tipo="month"
                        valor={form.mes_referencia}
                        aoMudar={atualizar('mes_referencia')}
                        confianca={resultado?.extracao.confianca.mes_referencia}
                        aviso={avisoDe('mes_referencia')}
                        obrigatorio
                      />
                      <CampoExtraido
                        id="f-consumo"
                        rotulo="Consumo do mês"
                        unidade="kWh"
                        inputMode="decimal"
                        valor={form.consumo_kwh}
                        aoMudar={atualizar('consumo_kwh')}
                        confianca={resultado?.extracao.confianca.consumo_kwh}
                        aviso={avisoDe('consumo_kwh')}
                        obrigatorio
                      />
                      <CampoExtraido
                        id="f-total"
                        rotulo="Total a pagar"
                        unidade="R$"
                        inputMode="decimal"
                        valor={form.valor_total}
                        aoMudar={atualizar('valor_total')}
                        confianca={resultado?.extracao.confianca.valor_total}
                        aviso={avisoDe('valor_total')}
                        obrigatorio
                      />
                      <CampoExtraido
                        id="f-tarifa-sem-tributos"
                        rotulo="Tarifa impressa"
                        unidade="R$/kWh"
                        inputMode="decimal"
                        valor={form.tarifa_kwh_sem_tributos}
                        aoMudar={atualizar('tarifa_kwh_sem_tributos')}
                        confianca={resultado?.extracao.confianca.tarifa_kwh_sem_tributos}
                        aviso={avisoDe('tarifa_kwh_sem_tributos')}
                        dica="A tarifa sem tributos da conta — guardada para referência, não é a que o painel usa."
                      />
                      <CampoExtraido
                        id="f-bandeira"
                        rotulo="Bandeira tarifária"
                        valor={form.bandeira}
                        aoMudar={atualizar('bandeira')}
                        confianca={resultado?.extracao.confianca.bandeira}
                        aviso={avisoDe('bandeira')}
                        opcoes={BANDEIRAS_OPCOES}
                      />
                      <CampoExtraido
                        id="f-leitura-anterior"
                        rotulo="Leitura anterior"
                        unidade="kWh"
                        inputMode="decimal"
                        valor={form.leitura_anterior}
                        aoMudar={atualizar('leitura_anterior')}
                        confianca={resultado?.extracao.confianca.leitura_anterior}
                        aviso={avisoDe('leitura_anterior')}
                      />
                      <CampoExtraido
                        id="f-leitura-atual"
                        rotulo="Leitura atual"
                        unidade="kWh"
                        inputMode="decimal"
                        valor={form.leitura_atual}
                        aoMudar={atualizar('leitura_atual')}
                        confianca={resultado?.extracao.confianca.leitura_atual}
                        aviso={avisoDe('leitura_atual')}
                      />
                    </div>

                    {/* O número que importa: é ele que vira R$/mês por aparelho. */}
                    <div
                      className={`clip-hud-sm border px-3.5 py-3 ${
                        avisoDe('tarifa_efetiva')
                          ? 'border-amber/60 bg-amber/[0.07]'
                          : 'border-term/40 bg-term/[0.05]'
                      }`}
                    >
                      <div className="t-label">Tarifa efetiva desta conta</div>
                      <div className="mt-1 font-bold leading-none text-term text-glow">
                        <span className="text-3xl tabular-nums">
                          {tarifaEfetiva === null ? '—' : BRL(tarifaEfetiva)}
                        </span>
                        <span className="ml-1 text-base text-muted">/kWh</span>
                      </div>
                      <p className="mt-2 t-sub">
                        Total a pagar ÷ consumo. Inclui tributos, bandeira e iluminação pública —
                        por isso é maior que a tarifa impressa, e é a única que fecha com o que
                        você paga.
                      </p>
                      {avisoDe('tarifa_efetiva') && (
                        <p className="mt-2 border-l-2 border-amber/60 pl-2 text-[11px] text-amber/90">
                          <span aria-hidden="true">⚠ </span>
                          {avisoDe('tarifa_efetiva')?.mensagem}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!podeConfirmar || salvando}
                      className="clip-hud w-full border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-term transition-colors hover:bg-term/20 disabled:opacity-50"
                    >
                      {salvando ? (
                        <span className="animate-blink">gravando fatura…</span>
                      ) : (
                        'Confirmar e usar esta tarifa ▸'
                      )}
                    </button>
                    {!podeConfirmar && (
                      <p className="t-sub" role="status">
                        Para confirmar, preencha o mês de referência, o consumo em kWh e o total a
                        pagar.
                      </p>
                    )}
                  </div>
                </Panel>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
