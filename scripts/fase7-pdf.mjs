// Gera os PDFs e o .ZIP da entrega da Fase 7.
//
//   npm run fase7
//
//   entregas/fase7/documentacao-fase7.pdf   A4, com rodapé e numeração
//   entregas/fase7/slides-fase7.pdf         uma página por slide, 1280x790
//   Ampere-Fase7-SenseForge.zip             o arquivo que sobe no FIAP ON
//
// Os dois HTML são autocontidos (sem imagem nem fonte externa), então aqui não
// há etapa de otimização de imagem como em scripts/doc.mjs — só a renderização.
//
// O .ZIP só é gerado quando o link do vídeo já está nos HTML. Enquanto o texto
// [INSERIR LINK DO VÍDEO] estiver lá, o script renderiza os PDFs, avisa e para:
// subir a entrega com o placeholder é o erro que isso existe para evitar.
import puppeteer from 'puppeteer-core'
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const RODAPE =
  '<div style="width:100%;font-size:7.5pt;color:#8a978f;font-family:Segoe UI,Arial;' +
  'padding:0 16mm;display:flex;justify-content:space-between">' +
  '<span>Amperê &middot; FIAP Startup One &middot; Fase 7</span>' +
  '<span class="pageNumber"></span></div>'

// O slide tem a altura fixa de 790px definida em .slide; a largura acompanha a
// página, então a folha precisa ter exatamente essas medidas para não sobrar
// faixa branca nem cortar conteúdo.
const TRABALHOS = [
  {
    html: 'entregas/fase7/documentacao-fase7.html',
    pdf: 'entregas/fase7/documentacao-fase7.pdf',
    opcoes: {
      format: 'A4',
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: RODAPE,
      margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
    },
  },
  {
    html: 'entregas/fase7/slides-fase7.html',
    pdf: 'entregas/fase7/slides-fase7.pdf',
    opcoes: {
      width: '1280px',
      height: '790px',
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    },
  },
]

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
})

let pendentes = 0

for (const { html, pdf, opcoes } of TRABALHOS) {
  if (readFileSync(html, 'utf8').includes('[INSERIR LINK DO VÍDEO]')) pendentes++

  const pagina = await navegador.newPage()
  await pagina.goto(pathToFileURL(resolve(html)).href, { waitUntil: 'networkidle0' })
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.pdf({ path: resolve(pdf), printBackground: true, ...opcoes })
  await pagina.close()

  console.log(`${pdf} — ${(readFileSync(pdf).length / 1024).toFixed(0)} KB`)
}

await navegador.close()

if (pendentes) {
  console.log(
    `\nAtenção: ${pendentes} arquivo(s) ainda com [INSERIR LINK DO VÍDEO].` +
      '\nTroque pelo link do YouTube nos dois .html, escreva o link em' +
      '\nentregas/fase7/link-do-video.txt e rode "npm run fase7" de novo.' +
      '\nO .ZIP não foi gerado.',
  )
  process.exit(0)
}

// ── .ZIP da entrega ──────────────────────────────────────────────────────────
// A atividade pede um único .ZIP com a documentação em PDF, os slides em PDF e
// o link do vídeo, que funcione ao descompactar. Vai junto o LEIA-ME, com o
// link do repositório, e o roteiro da gravação.
const ZIP = 'Ampere-Fase7-SenseForge.zip'
const CONTEUDO = [
  'documentacao-fase7.pdf',
  'slides-fase7.pdf',
  'link-do-video.txt',
  'roteiro-video.md',
  'LEIA-ME.txt',
].map((f) => `entregas/fase7/${f}`)

rmSync(ZIP, { force: true })
execFileSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path ${CONTEUDO.join(',')} -DestinationPath ${ZIP}`,
])
console.log(`\n${ZIP} — ${(readFileSync(ZIP).length / 1024).toFixed(0)} KB, pronto para o FIAP ON`)
