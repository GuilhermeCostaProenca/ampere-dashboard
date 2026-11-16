// Gera o PDF da documentação final do TCC.
//
//   npm run tcc
//
// A formatação ABNT (margens 3/2/2/3 cm, Arial 12, entrelinha 1,5) está no CSS
// do próprio HTML, em @page e no body. Aqui só entra o que o CSS não alcança: a
// numeração de página no alto, à direita, em Arial 10.
//
// Desvio conhecido da NBR 14724: a numeração aparece em todas as folhas,
// inclusive nas pré-textuais, onde a norma pede que seja contada mas não
// impressa. O cabeçalho de impressão do Chrome é estático e não permite
// condicionar a exibição ao número da página.
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const HTML = 'entregas/tcc/documentacao-tcc.html'
const PDF = 'entregas/tcc/documentacao-tcc.pdf'

const cabecalho =
  '<div style="width:100%;font-family:Arial,sans-serif;font-size:10pt;color:#000;' +
  'padding:0 2cm 0 3cm;text-align:right"><span class="pageNumber"></span></div>'

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
})
// ── Otimização das capturas de tela ──────────────────────────────────────────
// As capturas de docs/ têm 2880 px e cerca de 4 MB cada. Sem reduzi-las o PDF
// passa de 20 MB, o que inviabiliza o envio. A conversão é feita no próprio
// Chrome, para não depender de ferramenta externa.
const IMG = 'entregas/tcc/_img'
const TELAS = ['01-dashboard', '02-aparelhos', '06-detalhe-aparelho']
mkdirSync(IMG, { recursive: true })

const conversor = await navegador.newPage()
await conversor.goto('about:blank')
for (const nome of TELAS) {
  const destino = `${IMG}/${nome}.jpg`
  if (existsSync(destino)) continue
  const b64 = readFileSync(`docs/${nome}.png`).toString('base64')
  const jpeg = await conversor.evaluate(async (dados) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + dados
    await img.decode()
    const escala = Math.min(1, 1400 / img.width)
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * escala)
    c.height = Math.round(img.height * escala)
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#05080a'               // as telas são escuras e o JPEG não tem alfa
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.82).split(',')[1]
  }, b64)
  writeFileSync(destino, Buffer.from(jpeg, 'base64'))
  console.log(`  ${nome}.jpg — ${(readFileSync(destino).length / 1024).toFixed(0)} KB`)
}
await conversor.close()

const pagina = await navegador.newPage()
await pagina.goto(pathToFileURL(resolve(HTML)).href, { waitUntil: 'networkidle0' })
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
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: cabecalho,
  footerTemplate: '<div></div>',
  // Quando page.pdf recebe "margin", ele prevalece sobre o @page do CSS. Então
  // as medidas da ABNT têm de ser repetidas aqui, e não só no CSS: 3 cm na
  // esquerda e no alto, 2 cm na direita e embaixo. O número da página é
  // desenhado dentro da faixa superior de 3 cm.
  margin: { top: '3cm', right: '2cm', bottom: '2cm', left: '3cm' },
})

await navegador.close()
console.log(`${PDF} — ${(readFileSync(PDF).length / 1024).toFixed(0)} KB`)
