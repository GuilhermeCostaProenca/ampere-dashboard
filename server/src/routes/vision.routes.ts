// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Rotas de visão computacional (GS2)
//
//   POST /vision/bill            foto da conta  → campos + tarifa_efetiva + avisos
//   POST /vision/label           foto da etiqueta → campos + assinaturas candidatas
//   POST /vision/bill/confirm    grava a fatura confirmada/corrigida
//   POST /vision/label/confirm   vincula o rótulo a uma assinatura NILM
//   GET  /vision/custo-aparelhos consumo por aparelho em R$ pela tarifa da conta
//   GET  /vision/tarifa          qual tarifa está em uso (da conta ou estimada)
//   GET  /vision/acerto          indicador de taxa de acerto da leitura
//
// LGPD: o arquivo da foto vive em req.file.buffer (multer memoryStorage) e é
// descartado no fim da requisição. Nada de disco, nada de bucket, nada de
// banco — e o único lugar onde os bytes saem do processo é a chamada ao modelo.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { requisicaoInvalida } from '../lib/errors.js'
import { janela30d, janelaMes, estimarMes } from '../services/periodos.js'
import { db } from '../lib/supabase.js'
import {
  MIMES_ACEITOS,
  configVisao,
  erroDeConfiguracaoVisao,
  prepararImagem,
  provedorDeVisao,
  situacaoDaVisao,
} from '../services/vision/index.js'
import { ErroVisao } from '../services/vision/types.js'
import {
  avisosDaFatura,
  calcularTarifaEfetiva,
  casarAssinaturas,
} from '../services/vision/sanidade.js'
import {
  CAMPOS_ETIQUETA,
  CAMPOS_FATURA,
  compararCampos,
} from '../services/vision/comparacao.js'
import {
  assinaturasNilm,
  registrarExtracao,
  rotularAssinatura,
  salvarFatura,
  tarifaDaFatura,
  taxaDeAcerto,
} from '../services/vision/persistencia.js'
import {
  confirmarEtiquetaSchema,
  confirmarFaturaSchema,
  nomeDoRotulo,
} from '../services/vision/requisicoes.js'

export const visionRouter = Router()

// ── Upload ───────────────────────────────────────────────────────────────────

const LIMITE_PADRAO_MB = 8

/**
 * O limite é lido do ambiente, mas com fallback: a visão pode estar
 * desconfigurada e o multer precisa existir de todo jeito para a rota chegar
 * ao handler e responder 503 com a mensagem certa.
 */
const limiteBytes = (() => {
  try {
    return configVisao().maxUploadBytes
  } catch {
    return LIMITE_PADRAO_MB * 1024 * 1024
  }
})()

const upload = multer({
  // memoryStorage: a imagem NUNCA toca o disco (requisito de LGPD do módulo).
  storage: multer.memoryStorage(),
  limits: { fileSize: limiteBytes, files: 1, fields: 4 },
  fileFilter: (_req, file, cb) => {
    if ((MIMES_ACEITOS as readonly string[]).includes(file.mimetype)) return cb(null, true)
    cb(
      new ErroVisao(
        415,
        'formato_nao_aceito',
        `Formato ${file.mimetype} não é aceito. Envie JPEG, PNG ou WebP.`,
      ),
    )
  },
})

/** Traduz os erros do multer para o envelope de erro da API. */
function receberFoto(req: Request, res: Response, next: NextFunction) {
  upload.single('foto')(req, res, (erro: unknown) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ErroVisao(
            413,
            'imagem_grande',
            `A foto passa de ${Math.round(limiteBytes / 1024 / 1024)} MB. ` +
              'Tire a foto em resolução menor ou reduza a imagem antes de enviar.',
          ),
        )
      }
      if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          new ErroVisao(400, 'campo_inesperado', 'Envie a imagem no campo "foto".'),
        )
      }
      return next(new ErroVisao(400, 'upload_invalido', 'Falha ao receber a imagem.', erro.code))
    }
    next(erro)
  })
}

/** 503 legível quando falta chave/configuração, antes de gastar CPU com sharp. */
function exigirVisaoConfigurada(_req: Request, _res: Response, next: NextFunction) {
  const erro = erroDeConfiguracaoVisao()
  if (erro) {
    return next(
      new ErroVisao(
        503,
        'visao_nao_configurada',
        'A leitura por foto não está configurada neste servidor.',
        erro,
      ),
    )
  }
  next()
}

function fotoDaRequisicao(req: Request): Buffer {
  const arquivo = req.file
  if (!arquivo || !arquivo.buffer?.byteLength) {
    throw requisicaoInvalida('Nenhuma imagem recebida. Envie o arquivo no campo "foto".')
  }
  return arquivo.buffer
}

// ── POST /vision/bill ────────────────────────────────────────────────────────

visionRouter.post(
  '/bill',
  exigirAutenticacao,
  exigirVisaoConfigurada,
  receberFoto,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const original = fotoDaRequisicao(req)
    const provedor = provedorDeVisao()
    const { maxLadoPx } = configVisao()

    const imagem = await prepararImagem(original, { maxLadoPx, rotulo: 'fatura' })
    const { dados, latencia_ms, tentativas } = await provedor.extractBill(imagem)

    const tarifaEfetiva = calcularTarifaEfetiva(dados.valor_total, dados.consumo_kwh)
    const avisos = avisosDaFatura(dados, tarifaEfetiva)

    await registrarExtracao({
      usuario_id: usuario.id,
      tipo: 'bill',
      etapa: 'extracao',
      provider: provedor.nome,
      modelo: provedor.modelo,
      latencia_ms,
      tentativas_extra: tentativas,
      campos_extraidos: dados,
    })

    res.json({
      extracao: dados,
      tarifa_efetiva: tarifaEfetiva,
      warnings: avisos,
      meta: {
        provider: provedor.nome,
        modelo: provedor.modelo,
        latencia_ms,
        tentativas,
        imagem: {
          largura: imagem.largura,
          altura: imagem.altura,
          kb: Number((imagem.bytes / 1024).toFixed(0)),
          preparo_ms: imagem.duracoes.leitura_ms + imagem.duracoes.preparo_ms,
        },
      },
    })
  }),
)

// ── POST /vision/label ──────────────────────────────────────────────────────

visionRouter.post(
  '/label',
  exigirAutenticacao,
  exigirVisaoConfigurada,
  receberFoto,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const original = fotoDaRequisicao(req)
    const provedor = provedorDeVisao()
    const { maxLadoPx } = configVisao()

    const imagem = await prepararImagem(original, { maxLadoPx, rotulo: 'etiqueta' })
    const [{ dados, latencia_ms, tentativas }, assinaturas] = await Promise.all([
      provedor.extractLabel(imagem),
      assinaturasNilm(usuario.id),
    ])

    const candidatas = casarAssinaturas(dados.potencia_w, assinaturas)

    await registrarExtracao({
      usuario_id: usuario.id,
      tipo: 'label',
      etapa: 'extracao',
      provider: provedor.nome,
      modelo: provedor.modelo,
      latencia_ms,
      tentativas_extra: tentativas,
      campos_extraidos: dados,
    })

    res.json({
      extracao: dados,
      assinaturas_candidatas: candidatas,
      // Lista completa: sem potência na etiqueta (ou sem candidata na faixa) a
      // pessoa ainda precisa poder escolher a carga na mão.
      assinaturas: assinaturas,
      warnings:
        dados.potencia_w === null
          ? [
              {
                campo: 'potencia_w',
                codigo: 'potencia_ausente',
                mensagem:
                  'Não foi possível ler a potência na etiqueta. Preencha à mão ou escolha a carga pela lista.',
              },
            ]
          : candidatas.length === 0
            ? [
                {
                  campo: 'potencia_w',
                  codigo: 'sem_candidata',
                  mensagem: `Nenhuma assinatura do NILM tem potência próxima de ${dados.potencia_w} W. Escolha a carga pela lista completa.`,
                },
              ]
            : [],
      meta: {
        provider: provedor.nome,
        modelo: provedor.modelo,
        latencia_ms,
        tentativas,
        imagem: {
          largura: imagem.largura,
          altura: imagem.altura,
          kb: Number((imagem.bytes / 1024).toFixed(0)),
          preparo_ms: imagem.duracoes.leitura_ms + imagem.duracoes.preparo_ms,
        },
      },
    })
  }),
)

// ── POST /vision/bill/confirm ───────────────────────────────────────────────

visionRouter.post(
  '/bill/confirm',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const corpo = confirmarFaturaSchema.parse(req.body)
    const { confirmado, extraido, meta } = corpo

    // Recalculada aqui: a tarifa que vale é a dos números confirmados.
    const tarifaEfetiva = calcularTarifaEfetiva(confirmado.valor_total, confirmado.consumo_kwh)
    if (tarifaEfetiva === null) {
      throw requisicaoInvalida('Não é possível calcular a tarifa com o consumo e o valor informados')
    }

    const comparacao = extraido
      ? compararCampos(
          extraido as Record<string, unknown>,
          confirmado as Record<string, unknown>,
          CAMPOS_FATURA,
        )
      : { campos_comparados: 0, campos_corrigidos: [] as string[], taxa_acerto_pct: null }

    const fatura = await salvarFatura({
      usuario_id: usuario.id,
      distribuidora: confirmado.distribuidora ?? null,
      mes_referencia: confirmado.mes_referencia,
      consumo_kwh: confirmado.consumo_kwh,
      valor_total: confirmado.valor_total,
      tarifa_kwh_sem_tributos: confirmado.tarifa_kwh_sem_tributos ?? null,
      tarifa_efetiva: tarifaEfetiva,
      bandeira: confirmado.bandeira ?? null,
      leitura_anterior: confirmado.leitura_anterior ?? null,
      leitura_atual: confirmado.leitura_atual ?? null,
      editado_pelo_usuario: comparacao.campos_corrigidos.length > 0,
    })

    await registrarExtracao({
      usuario_id: usuario.id,
      tipo: 'bill',
      etapa: 'confirmacao',
      provider: meta.provider,
      modelo: meta.modelo,
      latencia_ms: meta.latencia_ms,
      tentativas_extra: meta.tentativas,
      campos_extraidos: (extraido ?? {}) as Record<string, unknown>,
      campos_confirmados: confirmado as Record<string, unknown>,
      campos_corrigidos: comparacao.campos_corrigidos,
      campos_comparados: comparacao.campos_comparados,
    })

    res.status(201).json({
      fatura: {
        id: fatura.id,
        mes_referencia: fatura.mes_referencia,
        distribuidora: fatura.distribuidora,
        consumo_kwh: Number(fatura.consumo_kwh),
        valor_total: Number(fatura.valor_total),
        tarifa_efetiva: Number(fatura.tarifa_efetiva),
        bandeira: fatura.bandeira,
        editado_pelo_usuario: fatura.editado_pelo_usuario,
      },
      acerto: comparacao,
    })
  }),
)

// ── POST /vision/label/confirm ──────────────────────────────────────────────

visionRouter.post(
  '/label/confirm',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const corpo = confirmarEtiquetaSchema.parse(req.body)
    const { aparelho_id, confirmado, extraido, renomear, meta } = corpo

    const comparacao = extraido
      ? compararCampos(
          extraido as Record<string, unknown>,
          confirmado as Record<string, unknown>,
          CAMPOS_ETIQUETA,
        )
      : { campos_comparados: 0, campos_corrigidos: [] as string[], taxa_acerto_pct: null }

    const nome = renomear
      ? nomeDoRotulo(confirmado.marca ?? null, confirmado.modelo ?? null, confirmado.tipo_aparelho)
      : null

    const aparelho = await rotularAssinatura(usuario.id, aparelho_id, {
      marca: confirmado.marca ?? null,
      modelo: confirmado.modelo ?? null,
      potencia_etiqueta_w:
        confirmado.potencia_w === null ? null : Math.round(confirmado.potencia_w),
      tensao_v: confirmado.tensao_v === null ? null : Math.round(confirmado.tensao_v),
      classe_eficiencia: confirmado.classe_eficiencia ?? null,
      consumo_kwh_mes_procel: confirmado.consumo_kwh_mes_procel ?? null,
      tipo_aparelho_visao: confirmado.tipo_aparelho,
      ...(nome ? { nome } : {}),
    })

    await registrarExtracao({
      usuario_id: usuario.id,
      tipo: 'label',
      etapa: 'confirmacao',
      provider: meta.provider,
      modelo: meta.modelo,
      latencia_ms: meta.latencia_ms,
      tentativas_extra: meta.tentativas,
      campos_extraidos: (extraido ?? {}) as Record<string, unknown>,
      campos_confirmados: confirmado as Record<string, unknown>,
      campos_corrigidos: comparacao.campos_corrigidos,
      campos_comparados: comparacao.campos_comparados,
    })

    res.status(201).json({ aparelho, acerto: comparacao })
  }),
)

// ── GET /vision/tarifa ──────────────────────────────────────────────────────

visionRouter.get(
  '/tarifa',
  exigirAutenticacao,
  async_(async (req, res) => {
    res.json(await tarifaDaFatura(req.usuario!.id))
  }),
)

// ── GET /vision/custo-aparelhos ─────────────────────────────────────────────

/**
 * Consumo por aparelho em REAIS, usando a tarifa efetiva da fatura mais
 * recente confirmada.
 *
 * Por que uma rota nova em vez de mudar GET /devices: o custo que /devices
 * devolve vem de fato_evento_aparelho.custo_brl, calculado na ingestão com a
 * tarifa de dim_tarifa. Aqui a conversão é refeita sobre a ENERGIA (kWh) com a
 * tarifa da conta da pessoa — são duas respostas diferentes para "quanto
 * custa", e misturá-las dentro da mesma rota quebraria o painel atual.
 */
visionRouter.get(
  '/custo-aparelhos',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const agora = new Date()
    const mes = janelaMes(agora)
    const ultimos30d = janela30d(agora)

    const [tarifa, noMes, em30d] = await Promise.all([
      tarifaDaFatura(usuario.id),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: ultimos30d.inicio.toISOString(),
        p_fim: ultimos30d.fim.toISOString(),
      }),
    ])

    const energia30d = new Map(
      ((em30d.data ?? []) as any[]).map((a) => [a.aparelho_id as string, Number(a.energia_kwh)]),
    )

    const aparelhos = ((noMes.data ?? []) as any[])
      .map((a) => {
        const energiaAcumulada = Number(a.energia_kwh)
        // Mesma projeção do dashboard: acumulado + média diária x dias restantes.
        const energiaMes = estimarMes(
          energiaAcumulada,
          energia30d.get(a.aparelho_id) ?? 0,
          agora,
        )
        return {
          id: a.aparelho_id,
          nome: a.nome,
          categoria: a.categoria,
          potencia_nominal_w: Number(a.potencia_nominal_w),
          energia_mes_kwh: Number(energiaMes.toFixed(2)),
          energia_acumulada_kwh: Number(energiaAcumulada.toFixed(2)),
          custo_mes_brl: Number((energiaMes * tarifa.tarifa_brl_kwh).toFixed(2)),
          custo_acumulado_brl: Number((energiaAcumulada * tarifa.tarifa_brl_kwh).toFixed(2)),
          horas_ativas_mes: Number(a.horas_ativas ?? 0),
        }
      })
      .filter((a) => a.energia_mes_kwh > 0)
      .sort((x, y) => y.custo_mes_brl - x.custo_mes_brl)

    res.json({
      tarifa_brl_kwh: tarifa.tarifa_brl_kwh,
      tarifa_estimada: tarifa.tarifa_estimada,
      fonte_tarifa: tarifa.fatura,
      total_mes_brl: Number(aparelhos.reduce((s, a) => s + a.custo_mes_brl, 0).toFixed(2)),
      total_mes_kwh: Number(aparelhos.reduce((s, a) => s + a.energia_mes_kwh, 0).toFixed(2)),
      aparelhos,
    })
  }),
)

// ── GET /vision/acerto ──────────────────────────────────────────────────────

visionRouter.get(
  '/acerto',
  exigirAutenticacao,
  async_(async (req, res) => {
    const porTipo = await taxaDeAcerto(req.usuario!.id)
    res.json({ visao: situacaoDaVisao(), por_tipo: porTipo })
  }),
)
