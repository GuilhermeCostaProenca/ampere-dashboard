// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Comparação extraído × confirmado
//
// É daqui que sai o indicador "taxa de acerto da leitura": dos campos que a
// pessoa reviu na tela, quantos ela NÃO precisou corrigir.
//
// A mesma regra de comparação vale no eval (contra gabarito) e na confirmação
// (contra o que a pessoa editou), de propósito: o número do vídeo e o número
// do banco medem a mesma coisa.
// ─────────────────────────────────────────────────────────────────────────────

/** Tolerância relativa para campos numéricos. */
export const TOLERANCIA_NUMERICA = 0.01 // 1%

/** Normalização de string antes do match exato: caixa, acento e espaço. */
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

/** true quando os dois valores são "o mesmo dado" para efeito de acerto. */
export function valoresBatem(
  extraido: unknown,
  confirmado: unknown,
  tolerancia = TOLERANCIA_NUMERICA,
): boolean {
  const vazio = (v: unknown) => v === null || v === undefined || v === ''
  if (vazio(extraido) && vazio(confirmado)) return true
  if (vazio(extraido) || vazio(confirmado)) return false

  if (typeof extraido === 'number' && typeof confirmado === 'number') {
    if (confirmado === 0) return extraido === 0
    return Math.abs(extraido - confirmado) / Math.abs(confirmado) <= tolerancia
  }

  if (typeof extraido === 'string' && typeof confirmado === 'string') {
    return normalizarTexto(extraido) === normalizarTexto(confirmado)
  }

  return extraido === confirmado
}

export interface ResultadoComparacao {
  /** Campos em que havia algo para comparar (um dos lados não-nulo). */
  campos_comparados: number
  campos_corrigidos: string[]
  /** 0–100, null quando nada era comparável. */
  taxa_acerto_pct: number | null
}

/**
 * Compara campo a campo.
 *
 * Campo nulo dos dois lados NÃO conta: a conta não trazia leitura do medidor e
 * a pessoa também não preencheu — não houve acerto nem erro ali. Campo que o
 * modelo deixou nulo e a pessoa preencheu conta como erro, porque na prática
 * ela teve de digitar.
 */
export function compararCampos<T extends Record<string, unknown>>(
  extraido: T,
  confirmado: Partial<T>,
  campos: readonly (keyof T & string)[],
  tolerancia = TOLERANCIA_NUMERICA,
): ResultadoComparacao {
  const corrigidos: string[] = []
  let comparados = 0

  for (const campo of campos) {
    const a = extraido[campo]
    const b = confirmado[campo]
    const ambosVazios =
      (a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')
    if (ambosVazios) continue

    comparados++
    if (!valoresBatem(a, b, tolerancia)) corrigidos.push(campo)
  }

  return {
    campos_comparados: comparados,
    campos_corrigidos: corrigidos,
    taxa_acerto_pct:
      comparados === 0
        ? null
        : Number((((comparados - corrigidos.length) / comparados) * 100).toFixed(1)),
  }
}

/** Campos da fatura que entram no indicador. */
export const CAMPOS_FATURA = [
  'distribuidora',
  'mes_referencia',
  'consumo_kwh',
  'valor_total',
  'tarifa_kwh_sem_tributos',
  'bandeira',
  'leitura_anterior',
  'leitura_atual',
] as const

/** Campos da etiqueta que entram no indicador. */
export const CAMPOS_ETIQUETA = [
  'tipo_aparelho',
  'marca',
  'modelo',
  'potencia_w',
  'tensao_v',
  'consumo_kwh_mes_procel',
  'classe_eficiencia',
] as const
