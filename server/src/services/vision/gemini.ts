// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Provedor de visão: Google Gemini
//
// Alternativa configurável por VISION_PROVIDER=gemini. Mesma interface do
// provedor Anthropic; só o envelope da requisição muda.
// ─────────────────────────────────────────────────────────────────────────────

import { billExtractionSchema, labelExtractionSchema } from './schemas.js'
import type { BillExtraction, LabelExtraction } from './schemas.js'
import { PROMPT_ETIQUETA, PROMPT_FATURA } from './prompts.js'
import { extrairComValidacao, fetchComTimeout } from './provedorBase.js'
import { ErroVisao } from './types.js'
import type { ImagemProcessada, RespostaProvedor, VisionProvider } from './types.js'
import type { ConfigVisao } from './config.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class ProvedorGemini implements VisionProvider {
  readonly nome = 'gemini'

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
    const url = `${BASE}/${encodeURIComponent(this.config.modelo)}:generateContent`

    const resposta = await fetchComTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Chave no header, não na query string: query string vaza em log de proxy.
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: img.mime, data: img.buffer.toString('base64') } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
      this.config.timeoutMs,
    )

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '')
      throw erroDoProvedor(resposta.status, corpo)
    }

    const corpo = (await resposta.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const texto = (corpo.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text)
      .filter((t): t is string => typeof t === 'string')
      .join('\n')

    if (!texto.trim()) throw new Error('resposta do Gemini sem texto')
    return texto
  }
}

function erroDoProvedor(status: number, corpo: string): ErroVisao {
  if (status === 401 || status === 403) {
    return new ErroVisao(
      503,
      'provedor_nao_autorizado',
      'A chave da API de visão foi recusada. Confira GEMINI_API_KEY.',
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
