// Captura screenshots das telas com Recharts já renderizado.
// Uso: node scripts/shoot.mjs
import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:5180'
const OUT = 'docs'

const shots = [
  { path: '/', file: '01-dashboard.png' },
  { path: '/aparelhos', file: '02-aparelhos.png' },
  { path: '/alertas', file: '03-alertas.png' },
  { path: '/relatorio', file: '04-relatorio.png' },
  { path: '/config', file: '05-config.png' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=2', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

for (const s of shots) {
  await page.goto(BASE + s.path, { waitUntil: 'networkidle0' })
  // pausa animações p/ frame estável
  await page.addStyleTag({ content: '*{animation:none !important; transition:none !important;}' })
  // espera o Recharts desenhar (quando houver gráfico na tela)
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('.recharts-surface').length === 0 ||
        document.querySelector('.recharts-area-area, .recharts-pie, .recharts-bar-rectangle') !== null,
      { timeout: 8000 },
    )
    .catch(() => {})
  await sleep(700)
  await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: true })
  console.log('ok', s.file)
}

await browser.close()
console.log('done')
