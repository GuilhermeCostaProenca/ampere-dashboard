// Fuso de referencia do produto: America/Sao_Paulo (UTC-3, sem horario de verao).
const OFFSET_HORAS = -3

const paraLocal = (d: Date) => new Date(d.getTime() + OFFSET_HORAS * 3600_000)
const paraUtc = (d: Date) => new Date(d.getTime() - OFFSET_HORAS * 3600_000)

export interface Janela {
  inicio: Date
  fim: Date
}

/** Inicio do dia corrente (horario de Brasilia) em UTC. */
export function janelaHoje(agora = new Date()): Janela {
  const local = paraLocal(agora)
  local.setUTCHours(0, 0, 0, 0)
  const inicio = paraUtc(local)
  return { inicio, fim: new Date(inicio.getTime() + 24 * 3600_000) }
}

/** Janela do mes corrente. */
export function janelaMes(agora = new Date()): Janela {
  const local = paraLocal(agora)
  const inicioLocal = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 0, 0, 0, 0),
  )
  const fimLocal = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  )
  return { inicio: paraUtc(inicioLocal), fim: paraUtc(fimLocal) }
}

/** Janela do mes anterior. */
export function janelaMesAnterior(agora = new Date()): Janela {
  const local = paraLocal(agora)
  const inicioLocal = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1, 0, 0, 0, 0),
  )
  const fimLocal = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 0, 0, 0, 0),
  )
  return { inicio: paraUtc(inicioLocal), fim: paraUtc(fimLocal) }
}

/** Ultimas 24 horas. */
export function janela24h(agora = new Date()): Janela {
  return { inicio: new Date(agora.getTime() - 24 * 3600_000), fim: agora }
}

/**
 * Projecao do gasto do mes: o consumido ate agora, extrapolado linearmente
 * para o mes inteiro. E o numero que o usuario ve como "gasto estimado do mes".
 */
/** Janela dos ultimos 30 dias — base estavel para media diaria. */
export function janela30d(agora = new Date()): Janela {
  return { inicio: new Date(agora.getTime() - 30 * 86400_000), fim: agora }
}

const DIA_MS = 86400_000

/**
 * Estimativa de fechamento do mes: o que ja foi gasto MAIS o que falta gastar,
 * projetado pela media diaria dos ultimos 30 dias.
 *
 *   estimativa = acumulado_no_mes + media_diaria_30d x dias_restantes
 *
 * A versao anterior extrapolava linearmente so o mes corrente
 * (acumulado x mes/decorrido). Isso quebra no comeco do mes: no dia 1o as 20h,
 * o multiplicador passa de 36x, e uma unica noite quente decide a conta do mes
 * inteiro. Pior ainda no seed, onde a calibracao dividia por uma energia de
 * ar-condicionado que ainda era zero naquele dia.
 *
 * Com a media de 30 dias, o dia 1o ja mostra um numero estavel, e a estimativa
 * converge para o valor real conforme o ciclo avanca.
 */
export function estimarMes(
  acumuladoNoMes: number,
  total30d: number,
  agora = new Date(),
): number {
  const { inicio, fim } = janelaMes(agora)
  const diasNoMes = (fim.getTime() - inicio.getTime()) / DIA_MS
  const decorridos = Math.min(diasNoMes, Math.max(0, (agora.getTime() - inicio.getTime()) / DIA_MS))
  const restantes = Math.max(0, diasNoMes - decorridos)
  const mediaDiaria = total30d / 30
  return acumuladoNoMes + mediaDiaria * restantes
}

export const MESES_PT = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]
