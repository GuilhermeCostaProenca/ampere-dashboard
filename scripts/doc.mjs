// Gera o PDF da documentação do CP5 a partir de entregas/cp5/documentacao-cp5.html.
//
//   npm run doc
//
// Faz duas coisas:
//   1. Otimiza as capturas de docs/*.png (2880 px, ~3,5 MB cada) para JPEG de
//      1500 px em entregas/cp5/_img/. Sem isso o PDF passa de 28 MB, o que é
//      inviável para o .ZIP da entrega.
//   2. Renderiza o HTML em PDF A4 com rodapé e numeração.
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const HTML = 'entregas/cp5/documentacao-cp5.html'
const PDF = 'entregas/cp5/documentacao-cp5.pdf'
const IMG = 'entregas/cp5/_img'
const LARGURA = 1500
const QUALIDADE = 0.82

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
})

// ── 1. Otimização das capturas ───────────────────────────────────────────────
mkdirSync(IMG, { recursive: true })
const otim = await navegador.newPage()
await otim.goto('about:blank')

for (const arq of readdirSync('docs').filter((f) => f.endsWith('.png'))) {
  const b64 = readFileSync(`docs/${arq}`).toString('base64')
  const jpeg = await otim.evaluate(
    async (dados, largura, q) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + dados
      await img.decode()
      const escala = Math.min(1, largura / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * escala)
      c.height = Math.round(img.height * escala)
      const ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      // JPEG não tem alfa e as telas são escuras: pinta o fundo antes.
      ctx.fillStyle = '#05080a'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', q).split(',')[1]
    },
    b64, LARGURA, QUALIDADE,
  )
  const destino = `${IMG}/${arq.replace('.png', '.jpg')}`
  writeFileSync(destino, Buffer.from(jpeg, 'base64'))
  console.log(
    `  ${arq.padEnd(26)} ${(readFileSync(`docs/${arq}`).length / 1024).toFixed(0).padStart(5)} KB` +
      ` -> ${(readFileSync(destino).length / 1024).toFixed(0).padStart(4)} KB`,
  )
}
await otim.close()

// ── 2. Renderização do PDF ───────────────────────────────────────────────────
const pagina = await navegador.newPage()
await pagina.goto(pathToFileURL(resolve(HTML)).href, { waitUntil: 'networkidle0' })
await pagina.evaluate(() =>
  Promise.all(
    [...document.images]
      .filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r })),
  ),
)

const rodape =
  '<div style="width:100%;font-size:7.5pt;color:#8a978f;font-family:Segoe UI,Arial;' +
  'padding:0 16mm;display:flex;justify-content:space-between">' +
  '<span>Amperê &middot; FIAP Startup One &middot; Fase 5 (CP5)</span>' +
  '<span class="pageNumber"></span></div>'

await pagina.pdf({
  path: resolve(PDF),
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: rodape,
  margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
})

await navegador.close()
console.log(`\n${PDF} — ${(readFileSync(PDF).length / 1024).toFixed(0)} KB`)
