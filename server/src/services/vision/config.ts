// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Configuração do módulo de visão computacional
//
// Deliberadamente SEPARADO de src/env.ts: a visão é um módulo opcional, e
// faltar ANTHROPIC_API_KEY não pode derrubar a API inteira (nem fazer o
// /health responder "configuracao_invalida"). Aqui o erro é local — só as
// rotas /vision devolvem 503 dizendo exatamente o que falta.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

export type ProvedorVisao = 'anthropic' | 'gemini'

/** Modelo padrão por provider — sobrescrito por VISION_MODEL. */
const MODELO_PADRAO: Record<ProvedorVisao, string> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  gemini: 'gemini-2.0-flash',
}

const schema = z.object({
  VISION_PROVIDER: z.enum(['anthropic', 'gemini']).default('anthropic'),
  VISION_MODEL: z.string().trim().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().trim().min(10).optional(),
  GEMINI_API_KEY: z.string().trim().min(10).optional(),
  /** Limite do upload em MB (multer). */
  VISION_MAX_UPLOAD_MB: z.coerce.number().positive().max(32).default(8),
  /** Lado maior da imagem depois do redimensionamento, em px. */
  VISION_MAX_LADO_PX: z.coerce.number().int().min(640).max(4096).default(1600),
  /** Timeout de cada chamada ao modelo, em ms. */
  VISION_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(45_000),
})

export interface ConfigVisao {
  provider: ProvedorVisao
  modelo: string
  apiKey: string
  maxUploadBytes: number
  maxLadoPx: number
  timeoutMs: number
}

/** Mensagem do que falta, ou null quando a visão está configurada. */
export function erroDeConfiguracaoVisao(ambiente: NodeJS.ProcessEnv = process.env): string | null {
  const parsed = schema.safeParse(ambiente)
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ')
  }

  const { VISION_PROVIDER, ANTHROPIC_API_KEY, GEMINI_API_KEY } = parsed.data
  if (VISION_PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) {
    return 'ANTHROPIC_API_KEY ausente (VISION_PROVIDER=anthropic)'
  }
  if (VISION_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
    return 'GEMINI_API_KEY ausente (VISION_PROVIDER=gemini)'
  }
  return null
}

/** Configuração resolvida. Só chame depois de checar erroDeConfiguracaoVisao(). */
export function configVisao(ambiente: NodeJS.ProcessEnv = process.env): ConfigVisao {
  const d = schema.parse(ambiente)
  const provider = d.VISION_PROVIDER
  const apiKey = (provider === 'anthropic' ? d.ANTHROPIC_API_KEY : d.GEMINI_API_KEY) ?? ''

  return {
    provider,
    modelo: d.VISION_MODEL ?? MODELO_PADRAO[provider],
    apiKey,
    maxUploadBytes: Math.round(d.VISION_MAX_UPLOAD_MB * 1024 * 1024),
    maxLadoPx: d.VISION_MAX_LADO_PX,
    timeoutMs: d.VISION_TIMEOUT_MS,
  }
}

/** Tipos MIME aceitos no upload. */
export const MIMES_ACEITOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
