// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Conferência da calibração do perfil (não toca no banco)
//
//   npm run check:perfil
//
// Roda a mesma matemática do seed sobre o mês corrente e imprime o resultado
// contra os alvos validados em campo. Serve para verificar os números antes de
// escrever qualquer coisa na nuvem.
// ─────────────────────────────────────────────────────────────────────────────

import { POTENCIAS, STANDBY_W, alinharNaFatia, consumoNoInstante } from '../simulator/perfil.js'

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
const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 3, 0, 0))
const fimMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1, 3, 0, 0))
const fator = (fimMes.getTime() - inicioMes.getTime()) / (agora.getTime() - inicioMes.getTime())

// Passo 1 — energia por carga sem calibração
const bruto: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) bruto[k] = 0
for (let t = inicioMes.getTime(); t < agora.getTime(); t += MS_FATIA) {
  for (const c of consumoNoInstante(new Date(t)).cargas) {
    bruto[c.chave]! += (c.potencia_w / 1000) * 0.25
  }
}

const escalas: Record<string, number> = {}
console.log('── calibração ──────────────────────────────────────────────')
for (const k of Object.keys(POTENCIAS)) {
  const projetado = bruto[k]! * fator * PRECO_KWH
  escalas[k] = Number(Math.min(1.6, Math.max(0.5, ALVO[k]! / projetado)).toFixed(4))
  console.log(
    `${k.padEnd(18)} sem calibrar R$${projetado.toFixed(2).padStart(7)}` +
      `  ×${escalas[k]!.toFixed(3)}  →  ${(POTENCIAS[k]! * escalas[k]!).toFixed(0)} W`,
  )
}

// Passo 2 — resultado com a calibração aplicada
const calibrado: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) calibrado[k] = 0
let agregadoKwh = 0
const picos: number[] = []

for (let t = inicioMes.getTime(); t < agora.getTime(); t += MS_FATIA) {
  const { agregado_w, cargas } = consumoNoInstante(new Date(t), escalas)
  agregadoKwh += (agregado_w / 1000) * 0.25
  for (const c of cargas) calibrado[c.chave]! += (c.potencia_w / 1000) * 0.25
  const horaLocal = new Date(t - 3 * 3600_000).getUTCHours()
  // Janela do pico da noite: e a leitura "tipica" que o usuario ve no painel.
  if (horaLocal >= 20 && horaLocal <= 21) picos.push(agregado_w)
}

console.log('\n── projeção do mês corrente ────────────────────────────────')
let somaAparelhos = 0
for (const k of Object.keys(POTENCIAS)) {
  const v = calibrado[k]! * fator * PRECO_KWH
  somaAparelhos += v
  const ok = Math.abs(v - ALVO[k]!) < 0.51 ? 'OK' : '~'
  console.log(`${k.padEnd(18)} R$${v.toFixed(2).padStart(7)}   [alvo R$${ALVO[k]}] ${ok}`)
}

const total = agregadoKwh * fator * PRECO_KWH
const base = total - somaAparelhos
const ordenados = [...picos].sort((a, b) => a - b)
const percentil = (q: number) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * q))] ?? 0
const pico = percentil(0.5)

console.log(`${'soma dos aparelhos'.padEnd(18)} R$${somaAparelhos.toFixed(2).padStart(7)}`)
console.log(`${'consumo de base'.padEnd(18)} R$${base.toFixed(2).padStart(7)}   (${STANDBY_W} W contínuos)`)
console.log(`${'TOTAL DO MÊS'.padEnd(18)} R$${total.toFixed(2).padStart(7)}   [alvo R$${ALVO_TOTAL}]`)
console.log(`${'energia do mês'.padEnd(18)}   ${(agregadoKwh * fator).toFixed(1)} kWh`)
console.log(
  `${'pico 20h–21h'.padEnd(18)}   ${pico.toFixed(0)} W (mediana) · ` +
    `${percentil(0.75).toFixed(0)} W (p75)   [alvo ${ALVO_PICO_W} W]`,
)
console.log(
  `\nsoma dos eventos <= agregado: ${somaAparelhos <= total ? 'OK' : 'FALHOU'}`,
)
