// Captura as screenshots das telas com dados reais vindos da API.
//
// Pré-requisitos: API no ar (cd server && npm run dev) e front no ar
// (npm run dev -- --port 5180).
//
// Uso: node scripts/shoot.mjs
import puppeteer from 'puppeteer-core'

// Barras normais de proposito: o Windows aceita, e nao ha escape para errar.
const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.AMPERE_WEB_URL ?? 'http://localhost:5180'
const OUT = 'docs'

const EMAIL = process.env.AMPERE_EMAIL ?? 'demo@ampere.app'
const SENHA = process.env.AMPERE_SENHA ?? 'ampere2026'

const shots = [
  { path: '/', file: '01-dashboard.png' },
  { path: '/aparelhos', file: '02-aparelhos.png' },
  { path: '/alertas', file: '03-alertas.png' },
  { path: '/relatorio', file: '04-relatorio.png' },
  { path: '/config', file: '05-config.png' },
  // Detalhe do aparelho: resolvido em runtime, é o 1º do inventário.
  { path: null, file: '06-detalhe-aparelho.png' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=2', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

// ── Sessão real: o app agora exige login ─────────────────────────────────────
await page.goto(BASE, { waitUntil: 'networkidle0' })

const temLogin = await page.$('input[type="password"]')
if (temLogin) {
  console.log('autenticando como', EMAIL)

  // O campo vem pré-preenchido e é um input controlado do React: triple-click
  // não seleciona o conteúdo, e digitar por cima concatena. Ctrl+A dispara
  // eventos de teclado reais, que o React enxerga.
  const preencher = async (seletor, valor) => {
    await page.focus(seletor)
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await page.keyboard.press('Backspace')
    await page.type(seletor, valor)
  }

  await preencher('input[type="email"]', EMAIL)
  await preencher('input[type="password"]', SENHA)

  const emailDigitado = await page.$eval('input[type="email"]', (e) => e.value)
  if (emailDigitado !== EMAIL) {
    throw new Error(`campo de e-mail ficou "${emailDigitado}", esperado "${EMAIL}"`)
  }

  await page.click('button[type="submit"]')

  // A sessão só está pronta quando o painel aparece no lugar do formulário.
  try {
    await page.waitForFunction(() => !document.querySelector('input[type="password"]'), {
      timeout: 20000,
    })
  } catch {
    // Falha silenciosa é pior que falha ruidosa: mostra o que a tela dizia.
    const texto = await page.evaluate(() => document.body.innerText)
    throw new Error(`login não completou. Tela:
${texto.slice(0, 400)}`)
  }
  console.log('sessão estabelecida')
} else {
  console.log('já autenticado')
}

// Descobre o id do primeiro aparelho para a tela de detalhe.
await page.goto(`${BASE}/aparelhos`, { waitUntil: 'networkidle0' })
await page.waitForSelector('a[href^="/aparelhos/"]', { timeout: 15000 }).catch(() => {})
const primeiroAparelho = await page.$eval('a[href^="/aparelhos/"]', (a) =>
  a.getAttribute('href'),
).catch(() => null)

for (const s of shots) {
  const destino = s.path ?? primeiroAparelho
  if (!destino) {
    console.log('pulei', s.file, '(nenhum aparelho no inventário)')
    continue
  }

  await page.goto(BASE + destino, { waitUntil: 'networkidle0' })

  // Espera o conteúdo real substituir o estado de carregamento HUD.
  await page
    .waitForFunction(() => !document.body.innerText.includes('AGUARDANDO SINAL'), {
      timeout: 15000,
    })
    .catch(() => {})

  // Espera as formas do Recharts existirem de fato — não basta o surface.
  await page
    .waitForFunction(
      () => {
        if (document.querySelectorAll('.recharts-surface').length === 0) return true
        const formas = [
          ...document.querySelectorAll('.recharts-area-area'),
          ...document.querySelectorAll('.recharts-pie-sector path'),
          ...document.querySelectorAll('.recharts-bar-rectangle path'),
        ]
        return formas.length > 0 && formas.every((f) => (f.getAttribute('d') || '').length > 30)
      },
      { timeout: 15000 },
    )
    .catch(() => console.warn('  aviso: formas do gráfico não apareceram a tempo'))

  // O Recharts anima via TRANSIÇÃO CSS (react-smooth). Matar `transition`
  // congelava a pizza e as barras no estado inicial, invisíveis. Só as
  // animações decorativas (varredura, blink do cursor) são desligadas, e
  // depois de a entrada terminar.
  await sleep(2500)
  await page.addStyleTag({ content: '*{animation:none !important;}' })
  await sleep(250)

  const formas = await page.evaluate(() => ({
    areas: document.querySelectorAll('.recharts-area-area').length,
    setores: document.querySelectorAll('.recharts-pie-sector').length,
    barras: document.querySelectorAll('.recharts-bar-rectangle').length,
  }))

  await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: true })
  console.log(
    'ok',
    s.file,
    `(areas ${formas.areas} · setores ${formas.setores} · barras ${formas.barras})`,
  )
}

await browser.close()
console.log('done')
