// Gera os dois artefatos dos slides a partir dos artboards do canvas.
//
//   npm run slides
//
//   entregas/cp5/apresentacao-cp5.pdf   -> o PDF da entrega
//   entregas/cp5/slides/apresentar.html -> para apresentar e gravar o video
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

// ── Versão para apresentar ───────────────────────────────────────────────────
// Um PDF em leitor de tela rola continuamente e fica feio em gravação. Este
// arquivo avança slide a slide com as setas, entra em tela cheia e escala para
// qualquer resolução — e é autocontido, para abrir com dois cliques.
const imagem = readFileSync(join(DIR, 'dashboard.jpg')).toString('base64')

const slidesHtml = ORDEM.map(
  (nome, i) =>
    `<section class="slide" data-i="${i}">` +
    corpoDoSlide(nome).replace(
      /src="dashboard\.jpg"/g,
      `src="data:image/jpeg;base64,${imagem}"`,
    ) +
    '</section>',
).join('')

const apresentacao = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Amperê — Pitch CP5</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap">
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden;
               font-family: 'JetBrains Mono', ui-monospace, Consolas, monospace; }
  #palco { position: fixed; inset: 0; display: grid; place-items: center; }
  #trilho { width: ${LARGURA}px; height: ${ALTURA}px; position: relative;
            transform-origin: center center; }
  .slide { position: absolute; inset: 0; opacity: 0; visibility: hidden;
           transition: opacity .18s ease; }
  .slide.ativo { opacity: 1; visibility: visible; }
  #hud { position: fixed; right: 18px; bottom: 14px; z-index: 10;
         font-size: 12px; letter-spacing: .18em; color: #2f4a3e;
         transition: opacity .4s ease; user-select: none; }
  #hud.some { opacity: 0; }
  #ajuda { position: fixed; left: 18px; bottom: 14px; z-index: 10;
           font-size: 11px; letter-spacing: .1em; color: #2f4a3e;
           transition: opacity .4s ease; user-select: none; }
  #ajuda.some { opacity: 0; }
</style></head>
<body>
<div id="palco"><div id="trilho">${slidesHtml}</div></div>
<div id="hud"><span id="atual">1</span> / ${ORDEM.length}</div>
<div id="ajuda">← → passa &nbsp;·&nbsp; F tela cheia</div>
<script>
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var i = 0, hud = document.getElementById('hud'), ajuda = document.getElementById('ajuda');
  var atual = document.getElementById('atual'), trilho = document.getElementById('trilho');
  var sumir;

  function mostrar(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.classList.toggle('ativo', k === i); });
    atual.textContent = i + 1;
    location.hash = i + 1;
    revelar();
  }

  // A interface some sozinha para não aparecer na gravação.
  function revelar() {
    hud.classList.remove('some'); ajuda.classList.remove('some');
    clearTimeout(sumir);
    sumir = setTimeout(function () {
      hud.classList.add('some'); ajuda.classList.add('some');
    }, 2500);
  }

  // Escala o slide de ${LARGURA}x${ALTURA} para preencher qualquer tela sem cortar.
  function ajustar() {
    var e = Math.min(innerWidth / ${LARGURA}, innerHeight / ${ALTURA});
    trilho.style.transform = 'scale(' + e + ')';
  }

  addEventListener('resize', ajustar);
  addEventListener('keydown', function (ev) {
    var k = ev.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown' || k === 'Enter') { mostrar(i + 1); ev.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { mostrar(i - 1); ev.preventDefault(); }
    else if (k === 'Home') { mostrar(0); }
    else if (k === 'End') { mostrar(slides.length - 1); }
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });
  addEventListener('click', function (ev) { mostrar(i + (ev.clientX < innerWidth * 0.25 ? -1 : 1)); });
  addEventListener('mousemove', revelar);

  ajustar();
  mostrar(parseInt(location.hash.slice(1), 10) - 1 || 0);
</script>
</body></html>`

const arquivoApresentacao = join(DIR, 'apresentar.html')
writeFileSync(arquivoApresentacao, apresentacao, 'utf8')
console.log(
  `${arquivoApresentacao} — para apresentar, ` +
    `${(readFileSync(arquivoApresentacao).length / 1024).toFixed(0)} KB`,
)
