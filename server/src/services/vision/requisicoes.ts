// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Contratos dos corpos de confirmação
//
// A tela devolve DUAS coisas ao confirmar: o que o modelo havia extraído e o
// que a pessoa deixou nos campos. O par é o que permite calcular a taxa de
// acerto — sem o "antes", não há como saber o que foi corrigido.
//
// O que NÃO vem do cliente: a tarifa efetiva. Ela é recalculada aqui a partir
// dos valores confirmados. Aceitar a tarifa pronta do navegador deixaria o
// indicador de R$/mês de todos os aparelhos à mercê de um campo editável.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import {
  BANDEIRAS,
  CLASSES_EFICIENCIA,
  TIPOS_APARELHO,
  billCamposSchema,
  labelCamposSchema,
} from './schemas.js'

/** Metadados da extração que originou a confirmação (vêm da resposta anterior). */
const metaSchema = z
  .object({
    provider: z.string().trim().min(1).max(40).default('desconhecido'),
    modelo: z.string().trim().min(1).max(120).default('desconhecido'),
    latencia_ms: z.coerce.number().int().min(0).max(600_000).default(0),
    tentativas: z.coerce.number().int().min(0).max(10).default(0),
  })
  .default({ provider: 'desconhecido', modelo: 'desconhecido', latencia_ms: 0, tentativas: 0 })

const numeroOpcional = z.union([z.coerce.number(), z.null()]).optional().default(null)

// ── POST /vision/bill/confirm ────────────────────────────────────────────────

export const confirmarFaturaSchema = z.object({
  /** O que o modelo leu. Opcional: sem ele a taxa de acerto fica sem base. */
  extraido: billCamposSchema.partial().optional(),
  confirmado: z.object({
    distribuidora: z.union([z.string().trim().max(120), z.null()]).optional().default(null),
    mes_referencia: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'mes_referencia deve estar no formato YYYY-MM'),
    consumo_kwh: z.coerce.number().positive('consumo_kwh deve ser maior que zero'),
    valor_total: z.coerce.number().positive('valor_total deve ser maior que zero'),
    tarifa_kwh_sem_tributos: numeroOpcional,
    bandeira: z.union([z.enum(BANDEIRAS), z.null()]).optional().default(null),
    leitura_anterior: numeroOpcional,
    leitura_atual: numeroOpcional,
  }),
  meta: metaSchema,
})

export type CorpoConfirmarFatura = z.infer<typeof confirmarFaturaSchema>

// ── POST /vision/label/confirm ───────────────────────────────────────────────

export const confirmarEtiquetaSchema = z.object({
  /** Assinatura NILM escolhida na tela para receber o rótulo. */
  aparelho_id: z.string().uuid('aparelho_id deve ser um uuid'),
  extraido: labelCamposSchema.partial().optional(),
  confirmado: z.object({
    tipo_aparelho: z.enum(TIPOS_APARELHO),
    marca: z.union([z.string().trim().max(80), z.null()]).optional().default(null),
    modelo: z.union([z.string().trim().max(80), z.null()]).optional().default(null),
    potencia_w: numeroOpcional,
    tensao_v: numeroOpcional,
    consumo_kwh_mes_procel: numeroOpcional,
    classe_eficiencia: z.union([z.enum(CLASSES_EFICIENCIA), z.null()]).optional().default(null),
  }),
  /** Quando true, usa "Marca Modelo" como nome da carga no inventário. */
  renomear: z.boolean().optional().default(false),
  meta: metaSchema,
})

export type CorpoConfirmarEtiqueta = z.infer<typeof confirmarEtiquetaSchema>

/** Nome legível a partir da etiqueta: "Brastemp BRM54HK" → usado no inventário. */
export function nomeDoRotulo(
  marca: string | null,
  modelo: string | null,
  tipo: string,
): string | null {
  const partes = [marca, modelo].filter((p): p is string => !!p && p.trim().length > 0)
  if (partes.length === 0) return null
  const rotuloTipo = tipo === 'outro' ? '' : ` (${tipo.replace(/_/g, ' ')})`
  return `${partes.join(' ')}${rotuloTipo}`.slice(0, 120)
}
