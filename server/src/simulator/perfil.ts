// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Perfil de consumo da residência de referência
//
// Fonte única usada pelo seed (90 dias de histórico) e pelo simulador do
// dispositivo. Calibrado para reproduzir os valores validados em campo:
//
//   gasto mensal .............. R$ 187,00
//   consumo típico no pico ....  ~1.340 W
//   ar-condicionado ...........  R$ 89 / mês
//   chuveiro ..................  R$ 42 / mês
//   geladeira .................  R$ 23 / mês
//   tarifa ....................  R$ 0,85/kWh + bandeira amarela
//
// Granularidade: 15 min (96 fatias por dia). As cargas ligam e desligam em
// fronteira de fatia — é o que permite ao NILM enxergar degraus limpos.
// ─────────────────────────────────────────────────────────────────────────────

const OFFSET_HORAS = -3 // America/Sao_Paulo
export const FATIAS_POR_DIA = 96
export const MINUTOS_POR_FATIA = 15

/** Consumo de base da casa (roteador, carregadores, relógios). Não é um aparelho. */
export const STANDBY_W = 14

export interface CargaPerfil {
  chave: string
  potencia_w: number
}

/** Potências nominais do perfil (antes da calibração fina do seed). */
export const POTENCIAS: Record<string, number> = {
  'ar-condicionado': 1050,
  chuveiro: 4500,
  geladeira: 90,
  'maquina-lavar': 500,
  'tv-eletronicos': 180,
  iluminacao: 128,
}

// PRNG determinístico: mesmo dia => mesmo plano, em qualquer máquina.
function mulberry32(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function partesLocais(instante: Date) {
  const local = new Date(instante.getTime() + OFFSET_HORAS * 3600_000)
  const dia = Math.floor(local.getTime() / 86400_000)
  const fatia = Math.floor((local.getUTCHours() * 60 + local.getUTCMinutes()) / MINUTOS_POR_FATIA)
  return { dia, fatia, diaSemana: local.getUTCDay() }
}

const entre = (f: number, ini: number, fim: number) => f >= ini && f <= fim

/** Plano do dia: quais fatias cada carga fica ligada. */
function planoDoDia(dia: number, diaSemana: number): Record<string, boolean[]> {
  const rng = mulberry32(dia * 2654435761)
  const vazio = () => new Array<boolean>(FATIAS_POR_DIA).fill(false)

  const plano: Record<string, boolean[]> = {
    'ar-condicionado': vazio(),
    chuveiro: vazio(),
    geladeira: vazio(),
    'maquina-lavar': vazio(),
    'tv-eletronicos': vazio(),
    iluminacao: vazio(),
  }

  // Geladeira: cicla o dia inteiro (2 fatias ligada a cada 5) — ~40% de duty.
  const fase = Math.floor(rng() * 5)
  for (let f = 0; f < FATIAS_POR_DIA; f++) {
    plano.geladeira![f] = (f + fase) % 5 < 2
  }

  // Chuveiro: banho da manhã todo dia; banho da noite em ~metade dos dias.
  const banhoManha = 26 + (rng() < 0.4 ? 1 : 0) // 06:30 / 06:45
  plano.chuveiro![banhoManha] = true
  if (rng() < 0.5) plano.chuveiro![78] = true // 19:30

  // Ar-condicionado: nos dias quentes pega tarde (13h-14h), noite (20h-23h) e
  // madrugada (00h-00h45); nos dias amenos fica só na janela da noite.
  const diaQuente = rng() < 0.42
  for (let f = 0; f < FATIAS_POR_DIA; f++) {
    if (diaQuente) {
      if (entre(f, 0, 2) || entre(f, 52, 55) || entre(f, 80, 91)) {
        plano['ar-condicionado']![f] = true
      }
    } else if (entre(f, 80, 87)) {
      plano['ar-condicionado']![f] = true
    }
  }

  // Máquina de lavar: 4x por semana, ciclo de ~1h15 pela manhã.
  if ([1, 3, 5, 6].includes(diaSemana)) {
    for (let f = 40; f <= 44; f++) plano['maquina-lavar']![f] = true
  }

  // TV + eletrônicos: 20h–21h45 — sobreposta à janela do ar-condicionado, que
  // é o que forma o patamar típico de ~1.340 W no pico da noite.
  for (let f = 80; f <= 87; f++) plano['tv-eletronicos']![f] = true

  // Iluminação: 18h15–19h30. Termina uma fatia antes de o ar-condicionado e a
  // TV entrarem (20h), para não empilhar um desliga e dois liga no mesmo
  // instante — o que é o caso ruim do detector de degraus.
  for (let f = 73; f <= 78; f++) plano.iluminacao![f] = true

  return plano
}

const cachePlano = new Map<number, Record<string, boolean[]>>()

function planoCacheado(dia: number, diaSemana: number) {
  const emCache = cachePlano.get(dia)
  if (emCache) return emCache
  const plano = planoDoDia(dia, diaSemana)
  cachePlano.set(dia, plano)
  if (cachePlano.size > 400) cachePlano.clear()
  return plano
}

/**
 * Cargas ativas e potência agregada da casa em um instante.
 * `escalas` permite calibrar a potência de cada carga (o seed usa isso para
 * cravar os alvos mensais validados).
 */
export function consumoNoInstante(
  instante: Date,
  escalas: Record<string, number> = {},
): { agregado_w: number; cargas: CargaPerfil[] } {
  const { dia, fatia, diaSemana } = partesLocais(instante)
  const plano = planoCacheado(dia, diaSemana)

  const cargas: CargaPerfil[] = []
  let agregado = STANDBY_W

  for (const chave of Object.keys(POTENCIAS)) {
    if (!plano[chave]?.[fatia]) continue
    const potencia = POTENCIAS[chave]! * (escalas[chave] ?? 1)
    cargas.push({ chave, potencia_w: Number(potencia.toFixed(1)) })
    agregado += potencia
  }

  return { agregado_w: Number(agregado.toFixed(1)), cargas }
}

/** Sequência de instantes de 15 em 15 min, alinhada à fatia. */
export function alinharNaFatia(d: Date): Date {
  const ms = MINUTOS_POR_FATIA * 60_000
  return new Date(Math.floor(d.getTime() / ms) * ms)
}
