// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Contratos da camada de visão computacional
//
// Mesma ideia de nilm/types.ts: fronteira estável entre "qual modelo lê a
// foto" e "o resto do sistema". Trocar Anthropic por Gemini (ou por um modelo
// local, depois) não toca em rota, schema nem tela.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiError } from '../../lib/errors.js'
import type { BillExtraction, LabelExtraction } from './schemas.js'

/** Imagem já pré-processada, pronta para ir ao modelo. Só existe em memória. */
export interface ImagemProcessada {
  buffer: Buffer
  mime: 'image/jpeg'
  largura: number
  altura: number
  bytes: number
  /** Duração de cada etapa do pré-processamento, em ms. */
  duracoes: { leitura_ms: number; preparo_ms: number }
}

/** Uma chamada ao modelo: o que voltou e quanto custou em tempo. */
export interface RespostaProvedor<T> {
  dados: T
  latencia_ms: number
  /** Quantas vezes o JSON precisou ser pedido de novo (0 = acertou de primeira). */
  tentativas: number
}

/**
 * Provedor de visão multimodal.
 *
 * As duas únicas coisas que o Amperê precisa ver numa foto: a conta de luz
 * (para saber quanto custa o kWh desta casa) e a etiqueta do aparelho (para
 * dar nome a uma assinatura que o NILM já detectou).
 */
export interface VisionProvider {
  readonly nome: string
  readonly modelo: string
  extractBill(img: ImagemProcessada): Promise<RespostaProvedor<BillExtraction>>
  extractLabel(img: ImagemProcessada): Promise<RespostaProvedor<LabelExtraction>>
}

/**
 * Falha da visão computacional.
 *
 * Estende ApiError de propósito: o tratador de erro que já existe
 * (middleware/erro.ts) devolve o envelope { erro: { codigo, mensagem } } sem
 * precisar de uma linha nova para conhecer este módulo.
 */
export class ErroVisao extends ApiError {
  constructor(status: number, codigo: string, message: string, detalhes?: unknown) {
    super(status, codigo, message, detalhes)
    this.name = 'ErroVisao'
  }
}
