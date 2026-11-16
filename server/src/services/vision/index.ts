// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Fábrica do provedor de visão
//
// Único ponto do sistema que sabe QUAL modelo está em uso. Rotas, eval e
// testes dependem só da interface VisionProvider.
// ─────────────────────────────────────────────────────────────────────────────

import { ProvedorAnthropic } from './anthropic.js'
import { ProvedorGemini } from './gemini.js'
import { configVisao, erroDeConfiguracaoVisao } from './config.js'
import { ErroVisao } from './types.js'
import type { VisionProvider } from './types.js'

export * from './config.js'
export * from './sanidade.js'
export * from './schemas.js'
export * from './types.js'
export { prepararImagem } from './imagem.js'

let cache: VisionProvider | null = null

/**
 * Provedor configurado por VISION_PROVIDER. Cacheado: construir o objeto é
 * barato, mas reler e revalidar o ambiente a cada requisição não é.
 *
 * Lança ErroVisao 503 com a lista do que falta quando a visão não está
 * configurada — o resto da API continua funcionando normalmente.
 */
export function provedorDeVisao(): VisionProvider {
  if (cache) return cache

  const erro = erroDeConfiguracaoVisao()
  if (erro) {
    throw new ErroVisao(
      503,
      'visao_nao_configurada',
      'O módulo de visão computacional não está configurado neste servidor.',
      erro,
    )
  }

  const config = configVisao()
  cache = config.provider === 'gemini' ? new ProvedorGemini(config) : new ProvedorAnthropic(config)
  return cache
}

/** Usado pelos testes para injetar um provedor fake. */
export function definirProvedorDeVisao(provedor: VisionProvider | null) {
  cache = provedor
}

/** Resumo para o /health e para o log de extração — sem expor a chave. */
export function situacaoDaVisao() {
  const erro = erroDeConfiguracaoVisao()
  if (erro) return { configurado: false as const, motivo: erro }
  const { provider, modelo } = configVisao()
  return { configurado: true as const, provider, modelo }
}
