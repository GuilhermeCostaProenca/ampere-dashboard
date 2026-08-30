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
export function projetarMes(gastoAteAgora: number, agora = new Date()): number {
  return gastoAteAgora * fatorProjecaoMes(agora)
}

/**
 * Quanto falta do mes, em multiplicador. Usado para projetar o total e o custo
 * de cada aparelho na MESMA base -- senao o painel mostraria um total estimado
 * ao lado de custos acumulados, e os numeros nao fechariam entre si.
 */
export function fatorProjecaoMes(agora = new Date()): number {
  const { inicio, fim } = janelaMes(agora)
  const decorrido = Math.max(1, agora.getTime() - inicio.getTime())
  const total = fim.getTime() - inicio.getTime()
  return total / decorrido
}

export const MESES_PT = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]
