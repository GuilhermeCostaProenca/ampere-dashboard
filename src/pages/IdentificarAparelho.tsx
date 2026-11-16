import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Hud'
import { HudErro } from '../components/HudState'
import { DeviceIcon } from '../components/icons'
import { AbasVisao } from '../components/vision/AbasVisao'
import { CapturaFoto } from '../components/vision/CapturaFoto'
import { CampoExtraido, ListaAvisos } from '../components/vision/CampoExtraido'
import { WATTS } from '../api/client'
import { visao } from '../api/vision'
import { ROTULO_TIPO } from '../api/visionTypes'
import type {
  AssinaturaNilm,
  Aviso,
  ClasseEficiencia,
  EtiquetaConfirmada,
  RespostaEtiqueta,
  TipoAparelhoVisao,
} from '../api/visionTypes'

// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Identificar aparelho pela etiqueta
//
// O NILM detecta "uma carga de ~1.050 W que liga às 22h", mas não sabe que
// aquilo é o ar-condicionado do quarto. A etiqueta tem a potência; casando a
// potência da etiqueta com a da assinatura, a carga ganha nome, marca e
// modelo — e o ranking do painel deixa de falar em "carga 2".
//
// A escolha final é SEMPRE da pessoa: o casamento por potência sugere, nunca
// decide. Duas cargas de potência parecida existem na mesma casa.
// ─────────────────────────────────────────────────────────────────────────────

function paraNumero(texto: string): number | null {
  const limpo = texto.trim()
  if (!limpo) return null
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

const paraTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

const TIPOS_OPCOES = (Object.keys(ROTULO_TIPO) as TipoAparelhoVisao[]).map((t) => ({
  valor: t,
  rotulo: ROTULO_TIPO[t],
}))

const CLASSES_OPCOES = [
  { valor: '', rotulo: '— sem etiqueta ENCE —' },
  ...(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as ClasseEficiencia[]).map((c) => ({
    valor: c,
    rotulo: `Classe ${c}`,
  })),
]

interface Formulario {
  tipo_aparelho: string
  marca: string
  modelo: string
  potencia_w: string
  tensao_v: string
  consumo_kwh_mes_procel: string
  classe_eficiencia: string
}

const hora = (h: number | null) => (h === null ? 'sem padrão ainda' : `${String(h).padStart(2, '0')}h`)

/** Cartão de uma assinatura NILM: o que o sensor viu daquela carga. */
function CartaoAssinatura({
  assinatura,
  divergencia,
  selecionada,
  aoSelecionar,
  sugerida,
}: {
  assinatura: AssinaturaNilm
  divergencia?: number
  selecionada: boolean
  aoSelecionar: () => void
  sugerida: boolean
}) {
  return (
    <li>
      <label
        className={`clip-hud-sm flex cursor-pointer items-start gap-3 border px-3 py-2.5 transition-colors ${
          selecionada
            ? 'border-term/70 bg-term/10'
            : 'border-line bg-panel/60 hover:border-term/40'
        }`}
      >
        <input
          type="radio"
          name="assinatura"
          checked={selecionada}
          onChange={aoSelecionar}
          className="mt-1 h-3.5 w-3.5 flex-shrink-0 accent-[#00ff66]"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-2 text-sm ${
                selecionada ? 'text-term text-glow' : 'text-term'
              }`}
            >
              <DeviceIcon
                categoria={assinatura.categoria}
                nome={assinatura.nome}
                size={15}
                className="text-term-dim"
              />
              {assinatura.nome}
            </span>
            {sugerida && (
              <span className="flex-shrink-0 border border-term/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-term">
                sugerida
              </span>
            )}
          </span>
          <span className="mt-1 block text-[10px] leading-relaxed text-muted">
            potência média{' '}
            <span className="tabular-nums text-term-dim">
              {assinatura.potencia_media_w === null
                ? `${WATTS(assinatura.potencia_nominal_w)} (nominal)`
                : WATTS(assinatura.potencia_media_w)}
            </span>
            {' · '}
            liga tipicamente às{' '}
            <span className="tabular-nums text-term-dim">{hora(assinatura.horario_tipico_h)}</span>
            {divergencia !== undefined && (
              <>
                {' · '}
                <span className="tabular-nums text-term-dim">
                  {divergencia.toFixed(1)}% da etiqueta
                </span>
              </>
            )}
          </span>
        </span>
      </label>
    </li>
  )
}

export function IdentificarAparelho() {
  const [foto, setFoto] = useState<File | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [resultado, setResultado] = useState<RespostaEtiqueta | null>(null)
  const [form, setForm] = useState<Formulario | null>(null)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [renomear, setRenomear] = useState(true)
  const [verTodas, setVerTodas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmada, setConfirmada] = useState<EtiquetaConfirmada | null>(null)

  // A sugestão é pré-selecionada, mas trocável: pré-selecionar poupa um toque
  // no caso comum sem esconder as outras cargas.
  useEffect(() => {
    if (!resultado) return
    setEscolhida(resultado.assinaturas_candidatas[0]?.aparelho_id ?? null)
    setVerTodas(resultado.assinaturas_candidatas.length === 0)
  }, [resultado])

  const avisoDe = (campo: string): Aviso | undefined =>
    resultado?.warnings.find((a) => a.campo === campo)

  async function ler() {
    if (!foto) return
    setProcessando(true)
    setErro(null)
    setConfirmada(null)
    try {
      const r = await visao.lerEtiqueta(foto)
      setResultado(r)
      setForm({
        tipo_aparelho: r.extracao.tipo_aparelho,
        marca: r.extracao.marca ?? '',
        modelo: r.extracao.modelo ?? '',
        potencia_w: paraTexto(r.extracao.potencia_w),
        tensao_v: paraTexto(r.extracao.tensao_v),
        consumo_kwh_mes_procel: paraTexto(r.extracao.consumo_kwh_mes_procel),
        classe_eficiencia: r.extracao.classe_eficiencia ?? '',
      })
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
    if (!form || !resultado || !escolhida) return

    setSalvando(true)
    setErro(null)
    try {
      const r = await visao.confirmarEtiqueta({
        aparelho_id: escolhida,
        extraido: resultado.extracao,
        confirmado: {
          tipo_aparelho: form.tipo_aparelho,
          marca: form.marca.trim() || null,
          modelo: form.modelo.trim() || null,
          potencia_w: paraNumero(form.potencia_w),
          tensao_v: paraNumero(form.tensao_v),
          consumo_kwh_mes_procel: paraNumero(form.consumo_kwh_mes_procel),
          classe_eficiencia: form.classe_eficiencia || null,
        },
        renomear,
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

  const candidatas = resultado?.assinaturas_candidatas ?? []
  const idsCandidatas = new Set(candidatas.map((c) => c.aparelho_id))
  const listaVisivel = verTodas ? (resultado?.assinaturas ?? []) : candidatas
  const divergencias = new Map(candidatas.map((c) => [c.aparelho_id, c.divergencia_pct]))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Identificar aparelho
        </h1>
        <p className="t-sub">
          A etiqueta dá nome à assinatura de carga: o NILM já detectou o degrau, falta saber de
          qual aparelho ele é.
        </p>
      </div>

      <AbasVisao />

      {erro ? <HudErro erro={erro} aoTentarNovamente={() => setErro(null)} /> : null}

      {confirmada ? (
        <Panel title="Aparelho identificado">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center border border-term/60 bg-base text-term text-glow">
                ✓
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-term text-glow">
                  {confirmada.aparelho.nome}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  A assinatura NILM passa a aparecer com este nome no inventário e no ranking do
                  painel.
                  {confirmada.acerto.taxa_acerto_pct !== null && (
                    <>
                      {' '}
                      Leitura conferida com{' '}
                      <strong className="text-term">
                        {confirmada.acerto.taxa_acerto_pct}% sem correção
                      </strong>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/painel/aparelhos"
                className="clip-hud-sm border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-term transition-colors hover:bg-term/20"
              >
                Ver o inventário ▸
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
                Identificar outro aparelho
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel title="Foto da etiqueta" className="lg:col-span-5">
            <CapturaFoto
              id="foto-etiqueta"
              rotulo="Fotografar a etiqueta"
              dica="Aponte para a placa do fabricante ou para a etiqueta Procel/INMETRO, de perto e sem reflexo. A foto não é guardada."
              processando={processando}
              rotuloAcao="Ler a etiqueta"
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
              </dl>
            )}
          </Panel>

          <div className="lg:col-span-7">
            {!form ? (
              <Panel title="Dados da etiqueta">
                <p className="t-sub">
                  Os dados lidos aparecem aqui, junto das cargas que o NILM já detectou nesta casa.
                </p>
              </Panel>
            ) : (
              <form onSubmit={confirmar} noValidate className="space-y-4">
                <Panel
                  title="Dados da etiqueta"
                  accent={resultado && resultado.warnings.length > 0 ? 'amber' : 'term'}
                >
                  <div className="space-y-4">
                    <ListaAvisos
                      avisos={(resultado?.warnings ?? []).filter((a) => a.campo !== 'potencia_w')}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CampoExtraido
                        id="e-tipo"
                        rotulo="Tipo de aparelho"
                        valor={form.tipo_aparelho}
                        aoMudar={atualizar('tipo_aparelho')}
                        confianca={resultado?.extracao.confianca.tipo_aparelho}
                        opcoes={TIPOS_OPCOES}
                      />
                      <CampoExtraido
                        id="e-potencia"
                        rotulo="Potência"
                        unidade="W"
                        inputMode="decimal"
                        valor={form.potencia_w}
                        aoMudar={atualizar('potencia_w')}
                        confianca={resultado?.extracao.confianca.potencia_w}
                        aviso={avisoDe('potencia_w')}
                      />
                      <CampoExtraido
                        id="e-marca"
                        rotulo="Marca"
                        valor={form.marca}
                        aoMudar={atualizar('marca')}
                        confianca={resultado?.extracao.confianca.marca}
                      />
                      <CampoExtraido
                        id="e-modelo"
                        rotulo="Modelo"
                        valor={form.modelo}
                        aoMudar={atualizar('modelo')}
                        confianca={resultado?.extracao.confianca.modelo}
                      />
                      <CampoExtraido
                        id="e-tensao"
                        rotulo="Tensão"
                        unidade="V"
                        inputMode="numeric"
                        valor={form.tensao_v}
                        aoMudar={atualizar('tensao_v')}
                        confianca={resultado?.extracao.confianca.tensao_v}
                      />
                      <CampoExtraido
                        id="e-classe"
                        rotulo="Classe de eficiência"
                        valor={form.classe_eficiencia}
                        aoMudar={atualizar('classe_eficiencia')}
                        confianca={resultado?.extracao.confianca.classe_eficiencia}
                        opcoes={CLASSES_OPCOES}
                      />
                      <CampoExtraido
                        id="e-procel"
                        rotulo="Consumo Procel"
                        unidade="kWh/mês"
                        inputMode="decimal"
                        valor={form.consumo_kwh_mes_procel}
                        aoMudar={atualizar('consumo_kwh_mes_procel')}
                        confianca={resultado?.extracao.confianca.consumo_kwh_mes_procel}
                        dica="Só existe em etiqueta ENCE/Procel."
                      />
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Qual carga é esta?"
                  accent={candidatas.length === 0 ? 'amber' : 'term'}
                >
                  <div className="space-y-3">
                    <p className="t-sub">
                      {candidatas.length === 0
                        ? 'Nenhuma assinatura ficou dentro de ±20% da potência da etiqueta. Escolha a carga pela lista.'
                        : `Assinaturas do NILM compatíveis com ${form.potencia_w || '—'} W. Confira o horário típico antes de confirmar.`}
                    </p>

                    {listaVisivel.length === 0 ? (
                      <p className="t-sub">
                        O NILM ainda não detectou nenhuma carga nesta casa. Rode{' '}
                        <span className="text-term">npm run simulate</span> no back-end ou aguarde o
                        sensor enviar leituras.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {listaVisivel.map((a) => (
                          <CartaoAssinatura
                            key={a.aparelho_id}
                            assinatura={a}
                            divergencia={divergencias.get(a.aparelho_id)}
                            selecionada={escolhida === a.aparelho_id}
                            sugerida={
                              idsCandidatas.has(a.aparelho_id) &&
                              candidatas[0]?.aparelho_id === a.aparelho_id
                            }
                            aoSelecionar={() => setEscolhida(a.aparelho_id)}
                          />
                        ))}
                      </ul>
                    )}

                    {!verTodas && (resultado?.assinaturas.length ?? 0) > candidatas.length && (
                      <button
                        type="button"
                        onClick={() => setVerTodas(true)}
                        className="text-[10px] uppercase tracking-[0.18em] text-muted underline transition-colors hover:text-term"
                      >
                        ver todas as {resultado?.assinaturas.length} cargas
                      </button>
                    )}

                    <label className="flex items-center gap-2 border-t border-line/70 pt-3 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={renomear}
                        onChange={(e) => setRenomear(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#00ff66]"
                      />
                      Renomear a carga com marca e modelo da etiqueta
                    </label>

                    <button
                      type="submit"
                      disabled={!escolhida || salvando}
                      className="clip-hud w-full border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-term transition-colors hover:bg-term/20 disabled:opacity-50"
                    >
                      {salvando ? (
                        <span className="animate-blink">vinculando…</span>
                      ) : (
                        'Vincular à assinatura selecionada ▸'
                      )}
                    </button>
                    {!escolhida && listaVisivel.length > 0 && (
                      <p className="t-sub" role="status">
                        Selecione a carga que receberá o rótulo.
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
