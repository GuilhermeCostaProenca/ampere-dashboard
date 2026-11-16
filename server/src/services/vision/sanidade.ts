// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Derivações e sanity checks da extração
//
// Dois princípios aqui:
//
// 1. A TARIFA EFETIVA é calculada pelo back-end, nunca pedida ao modelo. Ela é
//    valor_total / consumo_kwh — a divisão é trivial e determinística, e pedir
//    para o modelo fazer conta é convidar erro onde não precisa haver.
//
// 2. Sanity check SINALIZA, não bloqueia. Uma conta de 4.800 kWh existe (sítio
//    com bomba d'água) e uma tarifa de R$ 1,40/kWh também. O que não pode é a
//    pessoa confirmar um dado absurdo sem ver um aviso — por isso warnings
//    aparecem em destaque na tela, com o campo editável ao lado.
// ─────────────────────────────────────────────────────────────────────────────

import type { BillExtraction } from './schemas.js'

/** Faixas plausíveis para uma conta de luz residencial no Brasil. */
export const LIMITES = {
  consumoKwh: { min: 1, max: 5000 },
  tarifaEfetiva: { min: 0.3, max: 2.5 },
  /** Divergência tolerada entre (leitura_atual − leitura_anterior) e consumo_kwh. */
  divergenciaLeituraPct: 5,
} as const

/** Tarifa usada quando não há nenhuma fatura confirmada (R$/kWh). */
export const TARIFA_FALLBACK_BRL_KWH = 0.85

export interface Aviso {
  campo: string
  codigo: string
  mensagem: string
}

/**
 * Tarifa efetiva da fatura, em R$/kWh.
 *
 * É ela — e não a tarifa sem tributos impressa na conta — que converte o kWh
 * do NILM em reais: o que a pessoa paga por kWh inclui ICMS, PIS/COFINS,
 * bandeira e iluminação pública. A tarifa "sem tributos" subestima em ~30%.
 */
export function calcularTarifaEfetiva(
  valorTotal: number | null,
  consumoKwh: number | null,
): number | null {
  if (valorTotal === null || consumoKwh === null) return null
  if (!Number.isFinite(valorTotal) || !Number.isFinite(consumoKwh)) return null
  if (consumoKwh <= 0 || valorTotal <= 0) return null
  return Number((valorTotal / consumoKwh).toFixed(4))
}

/** Avisos da extração de fatura. Lista vazia = nada suspeito. */
export function avisosDaFatura(
  extracao: Pick<
    BillExtraction,
    'consumo_kwh' | 'valor_total' | 'leitura_anterior' | 'leitura_atual'
  >,
  tarifaEfetiva: number | null,
): Aviso[] {
  const avisos: Aviso[] = []
  const { consumo_kwh, valor_total, leitura_anterior, leitura_atual } = extracao

  if (consumo_kwh === null) {
    avisos.push({
      campo: 'consumo_kwh',
      codigo: 'consumo_ausente',
      mensagem: 'Não foi possível ler o consumo em kWh. Preencha à mão para calcular a tarifa.',
    })
  } else if (consumo_kwh < LIMITES.consumoKwh.min || consumo_kwh > LIMITES.consumoKwh.max) {
    avisos.push({
      campo: 'consumo_kwh',
      codigo: 'consumo_fora_da_faixa',
      mensagem: `Consumo de ${consumo_kwh} kWh está fora da faixa esperada (${LIMITES.consumoKwh.min}–${LIMITES.consumoKwh.max} kWh). Confira o valor.`,
    })
  }

  if (valor_total === null) {
    avisos.push({
      campo: 'valor_total',
      codigo: 'valor_ausente',
      mensagem: 'Não foi possível ler o valor total da fatura. Preencha à mão.',
    })
  }

  if (tarifaEfetiva === null) {
    if (consumo_kwh !== null && valor_total !== null) {
      avisos.push({
        campo: 'tarifa_efetiva',
        codigo: 'tarifa_nao_calculavel',
        mensagem: 'Não foi possível calcular a tarifa efetiva com os valores lidos.',
      })
    }
  } else if (
    tarifaEfetiva < LIMITES.tarifaEfetiva.min ||
    tarifaEfetiva > LIMITES.tarifaEfetiva.max
  ) {
    avisos.push({
      campo: 'tarifa_efetiva',
      codigo: 'tarifa_fora_da_faixa',
      mensagem: `Tarifa efetiva de R$ ${tarifaEfetiva.toFixed(2)}/kWh está fora da faixa usual (R$ ${LIMITES.tarifaEfetiva.min.toFixed(2)}–R$ ${LIMITES.tarifaEfetiva.max.toFixed(2)}). Confira consumo e valor total.`,
    })
  }

  // Leitura do medidor contra o consumo faturado: fecham ou não fecham.
  if (leitura_anterior !== null && leitura_atual !== null && consumo_kwh !== null && consumo_kwh > 0) {
    const diferenca = leitura_atual - leitura_anterior
    const divergenciaPct = Math.abs((diferenca - consumo_kwh) / consumo_kwh) * 100
    if (divergenciaPct > LIMITES.divergenciaLeituraPct) {
      avisos.push({
        campo: 'leitura_atual',
        codigo: 'leitura_divergente',
        mensagem: `As leituras do medidor indicam ${diferenca.toFixed(0)} kWh, ${divergenciaPct.toFixed(1)}% diferente do consumo faturado (${consumo_kwh} kWh). Confira os três números.`,
      })
    }
  }

  return avisos
}

/** Candidata a assinatura NILM para receber o rótulo da etiqueta. */
export interface AssinaturaCandidata {
  aparelho_id: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  /** Potência média observada nos eventos do NILM, quando houver. */
  potencia_media_w: number | null
  /** Hora do dia em que esta carga mais liga (0–23), quando houver eventos. */
  horario_tipico_h: number | null
  /** Distância relativa entre a potência da etiqueta e a da assinatura. */
  divergencia_pct: number
}

/** Tolerância do casamento etiqueta ↔ assinatura NILM. */
export const TOLERANCIA_POTENCIA_PCT = 20

export interface AssinaturaParaCasar {
  aparelho_id: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  potencia_media_w: number | null
  horario_tipico_h: number | null
}

/**
 * Casa a potência da etiqueta com as assinaturas que o NILM já detectou.
 *
 * Compara contra a potência MÉDIA observada quando ela existe, e cai para a
 * nominal do catálogo quando a carga ainda não gerou eventos: o degrau que o
 * sensor mede é o que de fato identifica o aparelho, não o número do catálogo.
 *
 * Devolve só as candidatas dentro de ±20%, da mais próxima para a mais
 * distante. Nenhuma candidata é uma resposta válida — a tela então deixa a
 * pessoa escolher qualquer assinatura da lista.
 */
export function casarAssinaturas(
  potenciaEtiquetaW: number | null,
  assinaturas: AssinaturaParaCasar[],
  toleranciaPct = TOLERANCIA_POTENCIA_PCT,
): AssinaturaCandidata[] {
  if (potenciaEtiquetaW === null || potenciaEtiquetaW <= 0) return []

  return assinaturas
    .map((a) => {
      const referencia = a.potencia_media_w && a.potencia_media_w > 0
        ? a.potencia_media_w
        : a.potencia_nominal_w
      const divergencia = Math.abs((referencia - potenciaEtiquetaW) / potenciaEtiquetaW) * 100
      return { ...a, divergencia_pct: Number(divergencia.toFixed(1)) }
    })
    .filter((a) => a.divergencia_pct <= toleranciaPct)
    .sort((x, y) => x.divergencia_pct - y.divergencia_pct)
}
