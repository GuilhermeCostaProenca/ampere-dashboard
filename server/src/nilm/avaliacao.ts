// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Avaliação do detector NILM (não toca no banco)
//
//   npm run check:nilm
//
// Gera 30 dias de série agregada a partir do perfil de consumo, guarda os
// eventos verdadeiros que o perfil produziu e roda o detector sobre a mesma
// série. Compara evento a evento (aparelho + tipo + instante) e imprime recall
// e precisão — inclusive por aparelho, que é onde as limitações aparecem.
//
// É por isso que o seed grava os eventos do PERFIL, e não a saída do detector:
// com ~94% de recall, seedar a partir da detecção derrubaria o custo das cargas
// que mais se perdem e os valores validados em campo deixariam de bater.
// ─────────────────────────────────────────────────────────────────────────────

import { DetectorDegraus } from './index.js'
import { POTENCIAS, alinharNaFatia, consumoNoInstante } from '../simulator/perfil.js'

const MS = 15 * 60_000
const PRECO = 0.86885
const ALVO: Record<string, number> = { 'ar-condicionado': 89, chuveiro: 42, geladeira: 23, 'maquina-lavar': 10, 'tv-eletronicos': 9, iluminacao: 5 }
const agora = alinharNaFatia(new Date())
const ini = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 3, 0, 0))
const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1, 3, 0, 0))
const fator = (fim.getTime() - ini.getTime()) / (agora.getTime() - ini.getTime())
const bruto: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) bruto[k] = 0
for (let t = ini.getTime(); t < agora.getTime(); t += MS)
  for (const c of consumoNoInstante(new Date(t)).cargas) bruto[c.chave]! += (c.potencia_w / 1000) * 0.25
const esc: Record<string, number> = {}
for (const k of Object.keys(POTENCIAS)) esc[k] = ALVO[k]! / (bruto[k]! * fator * PRECO)

// Serie agregada de 30 dias + eventos "verdade" do proprio perfil
const inicio30 = new Date(agora.getTime() - 30 * 86400_000)
const serie: { registrado_em: string; potencia_w: number }[] = []
const verdade: { chave: string; tipo: string; ts: number }[] = []
let ativas = new Set<string>()
for (let t = inicio30.getTime(); t < agora.getTime(); t += MS) {
  const d = new Date(t)
  const { agregado_w, cargas } = consumoNoInstante(d, esc)
  serie.push({ registrado_em: d.toISOString(), potencia_w: agregado_w })
  const agoraAtivas = new Set(cargas.map(c => c.chave))
  for (const c of ativas) if (!agoraAtivas.has(c)) verdade.push({ chave: c, tipo: 'desligou', ts: t })
  for (const c of agoraAtivas) if (!ativas.has(c)) verdade.push({ chave: c, tipo: 'ligou', ts: t })
  ativas = agoraAtivas
}

const det = new DetectorDegraus()
const detectados = det.detectar(serie)

const chaveDe = (e: {chave?:string; chave_aparelho?:string; tipo?:string; tipo_evento?:string; ts?:number; registrado_em?:string}) =>
  `${e.chave ?? e.chave_aparelho}|${e.tipo ?? e.tipo_evento}|${e.ts ?? Date.parse(e.registrado_em!)}`

const setVerdade = new Set(verdade.map(chaveDe))
const setDet = new Set(detectados.map(chaveDe))
const acertos = [...setDet].filter(k => setVerdade.has(k)).length

console.log(`janela: 30 dias · ${serie.length} amostras de 15 min`)
console.log(`eventos reais (perfil):     ${verdade.length}`)
console.log(`eventos detectados (NILM):  ${detectados.length}`)
console.log(`corretos (aparelho+tipo+instante): ${acertos}`)
console.log(`recall    ${(acertos / verdade.length * 100).toFixed(1)}%`)
console.log(`precisao  ${(acertos / Math.max(1, detectados.length) * 100).toFixed(1)}%`)

const porChave: Record<string, {real:number; ok:number}> = {}
for (const v of verdade) (porChave[v.chave] ??= {real:0, ok:0}).real++
for (const k of setDet) if (setVerdade.has(k)) porChave[k.split('|')[0]!]!.ok++
console.log('\nrecall por aparelho:')
for (const [k, v] of Object.entries(porChave))
  console.log(`  ${k.padEnd(18)} ${v.ok}/${v.real}  ${(v.ok/v.real*100).toFixed(1)}%`)
