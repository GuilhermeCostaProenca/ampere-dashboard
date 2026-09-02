// Gera o PDF dos slides a partir dos artboards do canvas de design.
//
//   npm run slides
//
// Cada .dc.html é um slide de 1280x720. O export PDF do próprio canvas
// rasteriza e perde a JetBrains Mono (cai na fonte de fallback), então aqui
// os slides são remontados em um único documento e impressos pelo Chrome no
// tamanho exato do slide: uma página por artboard, texto vetorial, fonte real.
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DIR = 'entregas/cp5/slides'
const PDF = 'entregas/cp5/apresentacao-cp5.pdf'
const LARGURA = 1280
const ALTURA = 720

// A ordem é a do pitch, a mesma de canvas.json.
const ORDEM = [
  'Main', 'Problema', 'Solucao', 'Arquitetura', 'Produto',
  'Nilm', 'Negocio', 'Viabilidade', 'Status', 'Fechamento',
]

/** Extrai o conteúdo do artboard: o que está entre </helmet> e </x-dc>. */
function corpoDoSlide(nome) {
  const bruto = readFileSync(join(DIR, `${nome}.dc.html`), 'utf8')
  const ini = bruto.indexOf('</helmet>')
  const fim = bruto.indexOf('</x-dc>')
  if (ini < 0 || fim < 0) throw new Error(`${nome}.dc.html: não achei <helmet>/</x-dc>`)
  return bruto.slice(ini + '</helmet>'.length, fim).trim()
}

const paginas = ORDEM.map(
  (nome) =>
    `<section style="width:${LARGURA}px;height:${ALTURA}px;overflow:hidden;` +
    `page-break-after:always;break-after:page;">${corpoDoSlide(nome)}</section>`,
).join('\n')

const documento = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Amperê — Pitch CP5</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap">
<style>
  @page { size: ${LARGURA}px ${ALTURA}px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #05080a; }
  section:last-child { page-break-after: auto; break-after: auto; }
  a { color: #00ff66; text-decoration: none; }
</style></head>
<body>${paginas}</body></html>`

// Fica ao lado dos artboards para que src="dashboard.jpg" resolva.
const temporario = join(DIR, '_slides-print.html')
writeFileSync(temporario, documento, 'utf8')

const navegador = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', args: ['--no-sandbox'],
})
const pagina = await navegador.newPage()
await pagina.goto(pathToFileURL(resolve(temporario)).href, { waitUntil: 'networkidle0' })

// Espera a fonte e as imagens antes de paginar.
await pagina.evaluate(async () => {
  await document.fonts.ready
  await Promise.all(
    [...document.images]
      .filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r })),
  )
})

await pagina.pdf({
  path: resolve(PDF),
  width: `${LARGURA}px`,
  height: `${ALTURA}px`,
  printBackground: true,
  pageRanges: `1-${ORDEM.length}`,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
})

await navegador.close()
unlinkSync(temporario)
console.log(`${PDF} — ${ORDEM.length} slides, ${(readFileSync(PDF).length / 1024).toFixed(0)} KB`)
