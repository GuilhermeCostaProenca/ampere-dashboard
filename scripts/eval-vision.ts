// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Avaliação da visão computacional
//
//   cd server && npm run eval:vision
//   cd server && npm run eval:vision -- --tipo=bill --repeticoes=3
//
// Roda a extração real sobre as imagens de eval/ e compara com o gabarito,
// imprimindo acurácia POR CAMPO, latência e um resumo em tabela. É o número
// que vai para o vídeo: "o módulo acerta X% dos campos da conta em Y segundos".
//
// Critério de acerto (o MESMO de services/vision/comparacao.ts, de propósito —
// o indicador do vídeo e o indicador do banco medem a mesma coisa):
//   • string  → match exato depois de normalizar caixa, acento e espaço
//   • número  → tolerância de ±1%
//   • nulo nos dois lados não conta nem como acerto nem como erro
//
// As fotos de eval/ NÃO vão para o repositório (ver eval/README.md).
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  erroDeConfiguracaoVisao,
  configVisao,
  prepararImagem,
  provedorDeVisao,
} from '../server/src/services/vision/index.js'
import {
  CAMPOS_ETIQUETA,
  CAMPOS_FATURA,
  valoresBatem,
} from '../server/src/services/vision/comparacao.js'
import {
  billExtractionSchema,
  labelExtractionSchema,
} from '../server/src/services/vision/schemas.js'

const RAIZ = resolve(fileURLToPath(import.meta.url), '..', '..')
const EXTENSOES = new Set(['.jpg', '.jpeg', '.png', '.webp'])

type Tipo = 'bill' | 'label'

interface Caso {
  nome: string
  imagem: string
  gabarito: Record<string, unknown>
}

interface Resultado {
  caso: string
  ok: boolean
  erro?: string
  latencia_ms: number
  preparo_ms: number
  tentativas: number
  acertos: Record<string, boolean>
  lidos: Record<string, unknown>
}

// ── Argumentos ───────────────────────────────────────────────────────────────

function argumento(nome: string): string | undefined {
  const achado = process.argv.slice(2).find((a) => a.startsWith(`--${nome}=`))
  return achado?.split('=')[1]
}

const tiposPedidos = ((): Tipo[] => {
  const t = argumento('tipo')
  if (t === 'bill' || t === 'label') return [t]
  return ['bill', 'label']
})()

const repeticoes = Math.max(1, Number(argumento('repeticoes') ?? 1))

// ── Carregamento dos casos ───────────────────────────────────────────────────

async function carregarCasos(pasta: string): Promise<Caso[]> {
  const caminho = join(RAIZ, 'eval', pasta)
  if (!existsSync(caminho)) return []

  const arquivos = await readdir(caminho)
  const imagens = arquivos.filter((a) => EXTENSOES.has(extname(a).toLowerCase()))

  const casos: Caso[] = []
  for (const imagem of imagens) {
    const nome = basename(imagem, extname(imagem))
    const gabaritoPath = join(caminho, `${nome}.json`)
    if (!existsSync(gabaritoPath)) {
      console.warn(`  ! ${imagem} ignorada: falta o gabarito ${nome}.json`)
      continue
    }
    const gabarito = JSON.parse(await readFile(gabaritoPath, 'utf8')) as Record<string, unknown>
    casos.push({ nome, imagem: join(caminho, imagem), gabarito })
  }
  return casos.sort((a, b) => a.nome.localeCompare(b.nome))
}

// ── Execução ─────────────────────────────────────────────────────────────────

/**
 * O gabarito passa pelo MESMO schema da extração antes de comparar. Sem isso,
 * um gabarito escrito como "287,43" seria comparado como string contra o
 * número 287.43 e contaria erro onde o módulo acertou.
 */
function normalizarGabarito(tipo: Tipo, bruto: Record<string, unknown>) {
  const schema = tipo === 'bill' ? billExtractionSchema : labelExtractionSchema
  const resultado = schema.safeParse({ confianca: {}, ...bruto })
  if (!resultado.success) {
    throw new Error(
      `gabarito inválido: ${resultado.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')}`,
    )
  }
  return resultado.data as Record<string, unknown>
}

async function rodar(tipo: Tipo, casos: Caso[]): Promise<Resultado[]> {
  const provedor = provedorDeVisao()
  const { maxLadoPx } = configVisao()
  const campos = tipo === 'bill' ? CAMPOS_FATURA : CAMPOS_ETIQUETA
  const resultados: Resultado[] = []

  for (const caso of casos) {
    for (let r = 0; r < repeticoes; r++) {
      const rotulo = repeticoes > 1 ? `${caso.nome} #${r + 1}` : caso.nome
      process.stdout.write(`  · ${rotulo} … `)

      try {
        const bytes = await readFile(caso.imagem)
        const imagem = await prepararImagem(bytes, { maxLadoPx, rotulo: tipo })
        const extracao =
          tipo === 'bill'
            ? await provedor.extractBill(imagem)
            : await provedor.extractLabel(imagem)

        const esperado = normalizarGabarito(tipo, caso.gabarito)
        const lidos = extracao.dados as unknown as Record<string, unknown>

        const acertos: Record<string, boolean> = {}
        for (const campo of campos) {
          const a = lidos[campo]
          const b = esperado[campo]
          const ambosVazios =
            (a === null || a === undefined) && (b === null || b === undefined)
          if (ambosVazios) continue
          acertos[campo] = valoresBatem(a, b)
        }

        const certos = Object.values(acertos).filter(Boolean).length
        const total = Object.keys(acertos).length
        console.log(
          `${certos}/${total} campos · ${(extracao.latencia_ms / 1000).toFixed(1)}s` +
            (extracao.tentativas > 0 ? ` · ${extracao.tentativas} retry` : ''),
        )

        resultados.push({
          caso: rotulo,
          ok: true,
          latencia_ms: extracao.latencia_ms,
          preparo_ms: imagem.duracoes.leitura_ms + imagem.duracoes.preparo_ms,
          tentativas: extracao.tentativas,
          acertos,
          lidos,
        })
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : String(e)
        console.log(`FALHOU — ${mensagem}`)
        resultados.push({
          caso: rotulo,
          ok: false,
          erro: mensagem,
          latencia_ms: 0,
          preparo_ms: 0,
          tentativas: 0,
          acertos: {},
          lidos: {},
        })
      }
    }
  }

  return resultados
}

// ── Relatório ────────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`)

function tabela(linhas: string[][]) {
  const larguras = linhas[0].map((_, i) => Math.max(...linhas.map((l) => l[i].length)))
  const traco = larguras.map((w) => '─'.repeat(w + 2)).join('┼')
  linhas.forEach((linha, i) => {
    console.log(
      linha.map((c, j) => ` ${i === 0 ? c.padEnd(larguras[j]) : c.padEnd(larguras[j])} `).join('│'),
    )
    if (i === 0) console.log(traco)
  })
}

function relatorio(tipo: Tipo, resultados: Resultado[]) {
  const campos = tipo === 'bill' ? CAMPOS_FATURA : CAMPOS_ETIQUETA
  const bons = resultados.filter((r) => r.ok)

  console.log(`\n── ${tipo === 'bill' ? 'FATURA' : 'ETIQUETA'} ─ acurácia por campo ──`)

  const linhas: string[][] = [['campo', 'comparados', 'acertos', 'acurácia']]
  let totalComparados = 0
  let totalAcertos = 0

  for (const campo of campos) {
    const comparados = bons.filter((r) => campo in r.acertos).length
    const acertos = bons.filter((r) => r.acertos[campo]).length
    totalComparados += comparados
    totalAcertos += acertos
    linhas.push([campo, String(comparados), String(acertos), pct(acertos, comparados)])
  }
  linhas.push(['TOTAL', String(totalComparados), String(totalAcertos), pct(totalAcertos, totalComparados)])
  tabela(linhas)

  if (bons.length > 0) {
    const latencias = bons.map((r) => r.latencia_ms).sort((a, b) => a - b)
    const media = latencias.reduce((s, v) => s + v, 0) / latencias.length
    const p95 = latencias[Math.min(latencias.length - 1, Math.floor(latencias.length * 0.95))]
    const preparo = bons.reduce((s, r) => s + r.preparo_ms, 0) / bons.length
    const retries = bons.filter((r) => r.tentativas > 0).length

    console.log(
      `\n  latência média ${(media / 1000).toFixed(2)}s · p95 ${(p95 / 1000).toFixed(2)}s · ` +
        `preparo da imagem ${preparo.toFixed(0)}ms`,
    )
    console.log(
      `  leituras ok ${bons.length}/${resultados.length} · ` +
        `JSON inválido na 1ª tentativa em ${retries}`,
    )
  }

  const falhas = resultados.filter((r) => !r.ok)
  if (falhas.length > 0) {
    console.log('\n  falhas:')
    for (const f of falhas) console.log(`   · ${f.caso}: ${f.erro}`)
  }

  return { totalComparados, totalAcertos }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const erroConfig = erroDeConfiguracaoVisao()
  if (erroConfig) {
    console.error(`\n✗ Visão não configurada: ${erroConfig}`)
    console.error('  Preencha VISION_PROVIDER e a chave do provider em server/.env\n')
    process.exitCode = 1
    return
  }

  const { provider, modelo } = configVisao()
  console.log(`\nAMPERÊ — avaliação da visão computacional`)
  console.log(`provider ${provider} · modelo ${modelo} · ${repeticoes}x por imagem\n`)

  let algumCaso = false
  let comparadosGeral = 0
  let acertosGeral = 0

  for (const tipo of tiposPedidos) {
    const pasta = tipo === 'bill' ? 'bills' : 'labels'
    const casos = await carregarCasos(pasta)

    if (casos.length === 0) {
      console.log(`eval/${pasta}/ — nenhum caso com gabarito. Veja eval/README.md.`)
      continue
    }

    algumCaso = true
    console.log(`eval/${pasta}/ — ${casos.length} caso(s):`)
    const resultados = await rodar(tipo, casos)
    const { totalComparados, totalAcertos } = relatorio(tipo, resultados)
    comparadosGeral += totalComparados
    acertosGeral += totalAcertos
    console.log('')
  }

  if (!algumCaso) {
    console.log('\nNada para avaliar. Coloque imagens e gabaritos em eval/ (veja eval/README.md).\n')
    return
  }

  console.log(`── RESUMO ──`)
  console.log(`taxa de acerto da leitura: ${pct(acertosGeral, comparadosGeral)} ` +
    `(${acertosGeral}/${comparadosGeral} campos)\n`)
}

main().catch((e) => {
  console.error('\n✗ erro na avaliação:', e)
  process.exitCode = 1
})
