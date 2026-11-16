// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Provedor de visão: Anthropic (Claude)
//
// Chamada direta à Messages API via fetch, sem SDK. São 30 linhas de envelope
// HTTP contra uma dependência a mais no bundle da função serverless — e o
// contrato da API é estável.
// ─────────────────────────────────────────────────────────────────────────────

import { billExtractionSchema, labelExtractionSchema } from './schemas.js'
import type { BillExtraction, LabelExtraction } from './schemas.js'
import { PROMPT_ETIQUETA, PROMPT_FATURA } from './prompts.js'
import { extrairComValidacao, fetchComTimeout } from './provedorBase.js'
import { ErroVisao } from './types.js'
import type { ImagemProcessada, RespostaProvedor, VisionProvider } from './types.js'
import type { ConfigVisao } from './config.js'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const VERSAO_API = '2023-06-01'
const MAX_TOKENS = 1024

export class ProvedorAnthropic implements VisionProvider {
  readonly nome = 'anthropic'

  constructor(private readonly config: ConfigVisao) {}

  get modelo() {
    return this.config.modelo
  }

  extractBill(img: ImagemProcessada): Promise<RespostaProvedor<BillExtraction>> {
    return extrairComValidacao(
      billExtractionSchema,
      (i, p) => this.chamar(i, p),
      img,
      PROMPT_FATURA,
      'fatura',
    )
  }

  extractLabel(img: ImagemProcessada): Promise<RespostaProvedor<LabelExtraction>> {
    return extrairComValidacao(
      labelExtractionSchema,
      (i, p) => this.chamar(i, p),
      img,
      PROMPT_ETIQUETA,
      'etiqueta',
    )
  }

  private async chamar(img: ImagemProcessada, prompt: string): Promise<string> {
    const resposta = await fetchComTimeout(
      ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': VERSAO_API,
        },
        body: JSON.stringify({
          model: this.config.modelo,
          max_tokens: MAX_TOKENS,
          // temperatura 0: leitura de números não é tarefa criativa
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.mime,
                    data: img.buffer.toString('base64'),
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      },
      this.config.timeoutMs,
    )

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '')
      throw erroDoProvedor(resposta.status, corpo)
    }

    const corpo = (await resposta.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const texto = (corpo.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('\n')

    if (!texto.trim()) throw new Error('resposta da Anthropic sem bloco de texto')
    return texto
  }
}

/** Traduz o erro da API para algo que a pessoa na tela consiga agir sobre. */
function erroDoProvedor(status: number, corpo: string): ErroVisao {
  if (status === 401 || status === 403) {
    return new ErroVisao(
      503,
      'provedor_nao_autorizado',
      'A chave da API de visão foi recusada. Confira ANTHROPIC_API_KEY.',
      corpo.slice(0, 300),
    )
  }
  if (status === 429) {
    return new ErroVisao(
      429,
      'provedor_limite',
      'Limite de requisições do modelo de visão atingido. Tente em alguns segundos.',
      corpo.slice(0, 300),
    )
  }
  return new ErroVisao(
    502,
    'provedor_falhou',
    `O modelo de visão respondeu HTTP ${status}.`,
    corpo.slice(0, 300),
  )
}
