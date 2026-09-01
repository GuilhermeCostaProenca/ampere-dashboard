// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Conferência da calibração do perfil (não toca no banco)
//
//   npm run check:perfil
//
// Roda a mesma matemática do painel sobre uma janela de 30 dias e imprime o
// resultado contra os alvos validados em campo.
//
// A janela é de 30 dias, e não do mês corrente, de propósito: no dia 1º o mês
// tem poucas horas de dados, e extrapolar dali dá número sem sentido — foi
// exatamente o defeito que quebrou o seed na virada de agosto para setembro.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CHAVE_BASE,
  POTENCIAS,
  STANDBY_W,
  alinharNaFatia,
  consumoNoInstante,
} from '../simulator/perfil.js'

const PRECO_KWH = 0.85 + 0.01885 // tarifa de referência + bandeira amarela
const MS_FATIA = 15 * 60_000

const ALVO: Record<string, number> = {
  'ar-condicionado': 89,
  chuveiro: 42,
  geladeira: 23,
  'maquina-lavar': 10,
  'tv-eletronicos': 9,
  iluminacao: 5,
}
const ALVO_TOTAL = 187
const ALVO_PICO_W = 1340

const agora = alinharNaFatia(new Date())
const inicio30d = new Date(agora.getTime() - 30 * 86400_000)
const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 3, 0, 0))
const fimMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1, 3, 0, 0))
const DIAS_NO_MES = (fimMes.getTime() - inicioMes.getTime()) / 86400_000

/** Mesma conta do painel: média diária de 30 dias projetada para o mês. */
const estimarMes = (kwh30d: number) => (kwh30d / 30) * DIAS_NO_MES * PRECO_KWH

// ── Passo 1: energia por carga em 30 dias, sem calibração ────────────────────
const bruto: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) bruto[k] = 0
let brutoAgregado = 0

for (let t = inicio30d.getTime(); t < agora.getTime(); t += MS_FATIA) {
  const { agregado_w, cargas } = consumoNoInstante(new Date(t))
  brutoAgregado += (agregado_w / 1000) * 0.25
  for (const c of cargas) bruto[c.chave]! += (c.potencia_w / 1000) * 0.25
}

const escalas: Record<string, number> = {}
console.log('── calibração (janela de 30 dias) ──────────────────────────')

let somaBruta = 0
for (const k of Object.keys(POTENCIAS)) {
  const estimado = estimarMes(bruto[k]!)
  somaBruta += estimado
  escalas[k] = Number(Math.min(2.5, Math.max(0.4, ALVO[k]! / estimado)).toFixed(4))
  console.log(
    `${k.padEnd(18)} sem calibrar R$${estimado.toFixed(2).padStart(7)}` +
      `  ×${escalas[k]!.toFixed(3)}  →  ${(POTENCIAS[k]! * escalas[k]!).toFixed(0)} W`,
  )
}

// O consumo de base é o resto do agregado, e também é calibrado.
const alvoBase = ALVO_TOTAL - Object.values(ALVO).reduce((a, b) => a + b, 0)
const baseBruta = estimarMes(brutoAgregado) - somaBruta
escalas[CHAVE_BASE] = Number(Math.min(2.5, Math.max(0.4, alvoBase / baseBruta)).toFixed(4))
console.log(
  `${'consumo-base'.padEnd(18)} sem calibrar R$${baseBruta.toFixed(2).padStart(7)}` +
    `  ×${escalas[CHAVE_BASE]!.toFixed(3)}  →  ${(STANDBY_W * escalas[CHAVE_BASE]!).toFixed(1)} W`,
)

// ── Passo 2: resultado com a calibração aplicada ─────────────────────────────
const calibrado: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) calibrado[k] = 0
let agregadoKwh = 0
const picos: number[] = []

for (let t = inicio30d.getTime(); t < agora.getTime(); t += MS_FATIA) {
  const { agregado_w, cargas } = consumoNoInstante(new Date(t), escalas)
  agregadoKwh += (agregado_w / 1000) * 0.25
  for (const c of cargas) calibrado[c.chave]! += (c.potencia_w / 1000) * 0.25
  const horaLocal = new Date(t - 3 * 3600_000).getUTCHours()
  // Janela do pico da noite: é a leitura "típica" que o usuário vê no painel.
  if (horaLocal >= 20 && horaLocal <= 21) picos.push(agregado_w)
}

console.log('\n── estimativa de fechamento do mês ─────────────────────────')
let somaAparelhos = 0
for (const k of Object.keys(POTENCIAS)) {
  const v = estimarMes(calibrado[k]!)
  somaAparelhos += v
  const ok = Math.abs(v - ALVO[k]!) < 0.51 ? 'OK' : '~'
  console.log(`${k.padEnd(18)} R$${v.toFixed(2).padStart(7)}   [alvo R$${ALVO[k]}] ${ok}`)
}

const total = estimarMes(agregadoKwh)
const base = total - somaAparelhos
const ordenados = [...picos].sort((a, b) => a - b)
const percentil = (q: number) =>
  ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * q))] ?? 0

console.log(`${'soma dos aparelhos'.padEnd(18)} R$${somaAparelhos.toFixed(2).padStart(7)}`)
console.log(`${'consumo de base'.padEnd(18)} R$${base.toFixed(2).padStart(7)}`)
console.log(`${'TOTAL DO MÊS'.padEnd(18)} R$${total.toFixed(2).padStart(7)}   [alvo R$${ALVO_TOTAL}]`)
console.log(`${'energia do mês'.padEnd(18)}   ${((agregadoKwh / 30) * DIAS_NO_MES).toFixed(1)} kWh`)
console.log(
  `${'pico 20h–21h'.padEnd(18)}   ${percentil(0.5).toFixed(0)} W (mediana) · ` +
    `${percentil(0.75).toFixed(0)} W (p75)   [alvo ${ALVO_PICO_W} W]`,
)
console.log(`\nsoma dos eventos <= agregado: ${somaAparelhos <= total ? 'OK' : 'FALHOU'}`)
