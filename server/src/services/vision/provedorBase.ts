// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Parte comum dos provedores de visão
//
// Anthropic e Gemini diferem só no envelope HTTP. Extrair o JSON da resposta,
// validar no zod, tentar de novo uma vez e cronometrar é idêntico nos dois —
// e é aqui.
//
// A política de retry é a pedida no escopo: UMA segunda tentativa, com o
// prompt reforçado, e 422 na segunda falha. Mais que isso dobraria a latência
// da demo para salvar um caso que, na prática, é foto ruim.
// ─────────────────────────────────────────────────────────────────────────────

import type { z } from 'zod'
import { ErroVisao } from './types.js'
import type { ImagemProcessada, RespostaProvedor } from './types.js'

/** Envia imagem + prompt ao modelo e devolve o texto cru da resposta. */
export type ChamadaModelo = (img: ImagemProcessada, prompt: string) => Promise<string>

const REFORCO = `

ATENÇÃO: a resposta anterior não era um JSON válido no formato pedido.
Responda AGORA somente com o objeto JSON, começando em { e terminando em },
sem cercas de código, sem explicação e sem texto fora do objeto.`

/**
 * Isola o objeto JSON dentro do texto do modelo.
 *
 * Mesmo pedindo "só o JSON", modelo às vezes embrulha em ```json ou prefacia
 * com uma frase. Recortar do primeiro { ao último } resolve os dois casos sem
 * um parser tolerante de verdade.
 */
export function recortarJson(texto: string): unknown {
  const limpo = texto.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const inicio = limpo.indexOf('{')
  const fim = limpo.lastIndexOf('}')
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error('nenhum objeto JSON encontrado na resposta')
  }
  return JSON.parse(limpo.slice(inicio, fim + 1))
}

/**
 * Chama o modelo, valida no zod e, se o JSON vier inválido, tenta exatamente
 * mais uma vez com o prompt reforçado.
 */
export async function extrairComValidacao<S extends z.ZodTypeAny>(
  schema: S,
  chamar: ChamadaModelo,
  img: ImagemProcessada,
  prompt: string,
  rotulo: string,
): Promise<RespostaProvedor<z.infer<S>>> {
  const inicio = performance.now()
  const falhas: string[] = []

  for (let tentativa = 0; tentativa <= 1; tentativa++) {
    const promptAtual = tentativa === 0 ? prompt : prompt + REFORCO
    let texto: string
    try {
      texto = await chamar(img, promptAtual)
    } catch (e) {
      // Falha de rede/HTTP não é problema de formato: não vale retry de JSON.
      if (e instanceof ErroVisao) throw e
      throw new ErroVisao(
        502,
        'provedor_indisponivel',
        'O modelo de visão não respondeu. Tente novamente em alguns segundos.',
        e instanceof Error ? e.message : String(e),
      )
    }

    try {
      const resultado = schema.parse(recortarJson(texto))
      const latencia = performance.now() - inicio
      console.log(
        `[amperê/visão] extração ${rotulo}: ok em ${latencia.toFixed(0)}ms ` +
          `(tentativas: ${tentativa + 1})`,
      )
      return {
        dados: resultado,
        latencia_ms: Number(latencia.toFixed(0)),
        tentativas: tentativa,
      }
    } catch (e) {
      const motivo = e instanceof Error ? e.message : String(e)
      falhas.push(`tentativa ${tentativa + 1}: ${motivo}`)
      console.warn(`[amperê/visão] extração ${rotulo} inválida — ${motivo}`)
    }
  }

  throw new ErroVisao(
    422,
    'extracao_invalida',
    'A foto foi lida, mas o resultado não veio num formato aproveitável. ' +
      'Tente de novo com a imagem mais nítida, enquadrada e sem reflexo.',
    falhas,
  )
}

/** fetch com timeout — sem isso uma chamada pendurada travaria a requisição. */
export async function fetchComTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controlador = new AbortController()
  const t = setTimeout(() => controlador.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controlador.signal })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ErroVisao(
        504,
        'provedor_timeout',
        `O modelo de visão não respondeu em ${Math.round(timeoutMs / 1000)}s. Tente novamente.`,
      )
    }
    throw e
  } finally {
    clearTimeout(t)
  }
}
