// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Simulador do Amperê Node (ESP32 + SCT-013-030)
//
// Publica leituras em POST /ingest/readings no mesmo formato e com a mesma
// autenticação (X-Device-Key) previstos para o firmware real. Quando o
// hardware ficar pronto, ele substitui este script sem alterar o back-end.
//
//   npm run simulate                              -- contínuo (demo ao vivo)
//   npm run simulate -- --intervalo=10            -- tick a cada 10 s
//   npm run simulate -- --modo=batch --horas=24   -- backfill de 24 h
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../lib/supabase.js'
import { env } from '../env.js'
import { MINUTOS_POR_FATIA, consumoNoInstante } from './perfil.js'

const arg = (nome: string, padrao: string) => {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.split('=').slice(1).join('=') : padrao
}

const MODO = arg('modo', 'continuo') as 'continuo' | 'batch'
const INTERVALO_S = Number(arg('intervalo', '15'))
const HORAS = Number(arg('horas', '24'))
const EMAIL = arg('email', 'demo@ampere.app')
const API = process.env.AMPERE_API_URL ?? `http://localhost:${env.PORT}`

const log = (m: string) => console.log(`[node] ${m}`)

/** Ruído de medição do SCT-013: pequeno o bastante para não virar falso degrau. */
function comRuido(potencia: number) {
  const desvio = Math.min(25, potencia * 0.015)
  return Math.max(0, Number((potencia + (Math.random() * 2 - 1) * desvio).toFixed(1)))
}

async function obterChave(): Promise<string> {
  const doAmbiente = process.env.AMPERE_DEVICE_KEY
  if (doAmbiente) return doAmbiente

  const { data: usuario } = await db
    .from('dim_usuario')
    .select('id')
    .eq('email', EMAIL)
    .maybeSingle()

  if (!usuario) {
    throw new Error(
      `Nenhum usuário ${EMAIL}. Rode "npm run seed" antes, ou defina AMPERE_DEVICE_KEY.`,
    )
  }

  const { data: dispositivo } = await db
    .from('dim_dispositivo')
    .select('chave_ingestao')
    .eq('usuario_id', usuario.id)
    .limit(1)
    .maybeSingle()

  if (!dispositivo) throw new Error('Usuário sem dispositivo vinculado')
  return dispositivo.chave_ingestao as string
}

interface Leitura {
  registrado_em: string
  potencia_w: number
}

/** Payload idêntico ao que o firmware do ESP32 vai montar. */
async function publicar(chave: string, leituras: Leitura[]) {
  const resposta = await fetch(`${API}/ingest/readings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-key': chave },
    body: JSON.stringify({ leituras }),
  })

  const corpo = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status} — ${JSON.stringify(corpo)}`)
  }
  return corpo as {
    leituras_gravadas: number
    leituras_ignoradas: number
    eventos_detectados: number
    eventos_novos: number
  }
}

// ── Modo batch: reconstrói as últimas N horas de uma vez ─────────────────────

async function rodarBatch(chave: string) {
  const ms = MINUTOS_POR_FATIA * 60_000
  const fim = new Date(Math.floor(Date.now() / ms) * ms)
  const inicio = new Date(fim.getTime() - HORAS * 3600_000)

  const leituras: Leitura[] = []
  for (let t = inicio.getTime(); t <= fim.getTime(); t += ms) {
    const instante = new Date(t)
    const { agregado_w } = consumoNoInstante(instante)
    leituras.push({
      registrado_em: instante.toISOString(),
      potencia_w: comRuido(agregado_w),
    })
  }

  log(`modo batch: ${leituras.length} leituras (${HORAS}h) -> ${API}`)

  let gravadas = 0
  let ignoradas = 0
  let eventos = 0
  let novos = 0
  for (let i = 0; i < leituras.length; i += 200) {
    const r = await publicar(chave, leituras.slice(i, i + 200))
    gravadas += r.leituras_gravadas
    ignoradas += r.leituras_ignoradas
    eventos += r.eventos_detectados
    novos += r.eventos_novos
    process.stdout.write(`\r[node] enviadas ${Math.min(i + 200, leituras.length)}/${leituras.length}`)
  }
  process.stdout.write('\n')
  log(
    `concluído: ${gravadas} leituras novas · ${ignoradas} já existiam · ` +
      `${eventos} degraus detectados · ${novos} eventos gravados`,
  )
}

// ── Modo contínuo: telemetria ao vivo para a demonstração ────────────────────

async function rodarContinuo(chave: string) {
  log(`modo contínuo: 1 leitura a cada ${INTERVALO_S}s -> ${API}`)
  log('ctrl+c para parar')

  let ativo = true
  process.on('SIGINT', () => {
    ativo = false
    log('encerrando…')
    process.exit(0)
  })

  while (ativo) {
    const agora = new Date()
    const { agregado_w, cargas } = consumoNoInstante(agora)
    const potencia = comRuido(agregado_w)

    try {
      const r = await publicar(chave, [
        { registrado_em: agora.toISOString(), potencia_w: potencia },
      ])
      const nomes = cargas.map((c) => c.chave).join(', ') || 'somente consumo de base'
      log(
        `${agora.toLocaleTimeString('pt-BR', { hour12: false })}  ` +
          `${String(Math.round(potencia)).padStart(5)} W  ` +
          `[${nomes}]  NILM: ${r.eventos_detectados} degraus / ${r.eventos_novos} novos`,
      )
    } catch (e) {
      log(`falha ao publicar: ${e instanceof Error ? e.message : e}`)
    }

    await new Promise((r) => setTimeout(r, INTERVALO_S * 1000))
  }
}

async function main() {
  const chave = await obterChave()
  log(`dispositivo autenticado (X-Device-Key ...${chave.slice(-6)})`)

  if (MODO === 'batch') await rodarBatch(chave)
  else await rodarContinuo(chave)
}

main().catch((e) => {
  console.error('[node] falhou:', e instanceof Error ? e.message : e)
  process.exit(1)
})
