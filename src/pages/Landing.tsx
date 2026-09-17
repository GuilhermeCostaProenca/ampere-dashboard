import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Página pública
//
// Mesma paleta do painel, com o peso invertido: aqui o âmbar lidera, porque é
// a cor do LED do aparelho nas fotos; o verde-terminal fica reservado para os
// momentos de dado e de sistema. A monoespaçada segue em rótulos, números e
// tudo que é interface — prosa longa usa Space Grotesk, que em monoespaçada
// cansaria.
// ─────────────────────────────────────────────────────────────────────────────

/** Rótulo pequeno em caixa alta, o mesmo gesto dos painéis do dashboard. */
function Rotulo({ children, cor = 'ambar' }: { children: React.ReactNode; cor?: 'ambar' | 'verde' }) {
  return (
    <span
      className={`font-mono text-[11px] font-bold uppercase tracking-[0.28em] ${
        cor === 'verde' ? 'text-term-dim' : 'text-amber/80'
      }`}
    >
      {children}
    </span>
  )
}

function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 flex-shrink-0 place-items-center border border-amber/60 font-mono text-lg font-extrabold leading-none text-amber shadow-[0_0_14px_rgba(255,176,0,0.3)]">
        A
      </span>
      {!compacta && (
        <span className="font-mono text-sm font-extrabold tracking-[0.3em] text-white">
          AMPERÊ
        </span>
      )}
    </div>
  )
}

/**
 * Os três vídeos abrem com fade-in do preto, então o primeiro segundo de cada
 * um é uma tela vazia. Entrar no meio da duração resolve: a cena já está lá
 * quando a pessoa chega.
 */
function VideoLoop({
  fonte,
  poster,
  className,
  rotulo,
}: {
  fonte: string
  poster: string
  className?: string
  rotulo?: string
}) {
  return (
    <video
      className={className}
      src={fonte}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget
        if (Number.isFinite(v.duration)) v.currentTime = v.duration * 0.35
      }}
    />
  )
}

function Topo() {
  const [rolou, setRolou] = useState(false)
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        rolou ? 'border-b border-white/[0.07] bg-base/85 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Marca />
        <nav className="hidden items-center gap-8 font-mono text-[12px] uppercase tracking-[0.18em] text-white/55 md:flex">
          <a href="#como" className="transition-colors hover:text-amber">Como funciona</a>
          <a href="#aparelho" className="transition-colors hover:text-amber">O aparelho</a>
          <a href="#planos" className="transition-colors hover:text-amber">Planos</a>
        </nav>
        <Link
          to="/entrar"
          className="clip-hud-sm border border-amber/50 bg-amber/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber transition-colors hover:bg-amber/20"
        >
          Entrar
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      <VideoLoop
        className="absolute inset-0 h-full w-full object-cover object-right"
        fonte="/midia/sinal.mp4"
        poster="/midia/sinal-poster.webp"
      />
      {/* Escurece o lado do texto sem apagar o aparelho, que fica à direita. */}
      <div className="absolute inset-0 bg-gradient-to-r from-base via-base/80 to-base/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/60" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-32">
        <Rotulo>NILM · monitoramento não-intrusivo</Rotulo>

        <h1 className="mt-5 max-w-3xl font-sans text-[2.4rem] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl lg:text-7xl">
          Sua conta de luz,<br />
          <span className="text-amber">aparelho por aparelho.</span>
        </h1>

        <p className="mt-7 max-w-xl font-sans text-lg leading-relaxed text-white/70 sm:text-xl">
          Um sensor no quadro elétrico identifica quanto cada aparelho da casa
          consome — e mostra em <strong className="font-semibold text-white">reais</strong>,
          não em quilowatt-hora.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/entrar"
            className="clip-hud border border-amber bg-amber px-7 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-base transition-all hover:bg-amber/85"
          >
            Ver o painel ▸
          </Link>
          <a
            href="#como"
            className="clip-hud border border-white/20 px-7 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            Como funciona
          </a>
        </div>

        <p className="mt-6 font-mono text-[11px] tracking-wide text-white/35">
          demonstração aberta · demo@ampere.app · ampere2026
        </p>
      </div>
    </section>
  )
}

function Problema() {
  return (
    <section className="border-t border-line bg-base py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <div>
          <Rotulo>O problema</Rotulo>
          <h2 className="mt-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl">
            A conta chega com um número só.
          </h2>
          <p className="mt-6 font-sans text-lg leading-relaxed text-white/65">
            Você paga, mas não sabe o que pagou. A fatura diz quantos quilowatt-hora
            a casa inteira consumiu — e nada sobre qual aparelho puxou aquilo.
            Sem saber onde o gasto está, economizar vira tentativa e erro.
          </p>
          <div className="mt-9 grid grid-cols-3 gap-px overflow-hidden border border-line bg-line">
            {[
              { valor: 'R$ 187', rotulo: 'conta do mês' },
              { valor: '?', rotulo: 'do ar-condicionado' },
              { valor: '?', rotulo: 'do chuveiro' },
            ].map((c) => (
              <div key={c.rotulo} className="bg-panel px-4 py-5">
                <div
                  className={`font-mono text-2xl font-bold tabular-nums ${
                    c.valor === '?' ? 'text-white/25' : 'text-white'
                  }`}
                >
                  {c.valor}
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  {c.rotulo}
                </div>
              </div>
            ))}
          </div>
        </div>

        <figure className="relative">
          <img
            src="/midia/apartamento-900.webp"
            srcSet="/midia/apartamento-900.webp 900w, /midia/apartamento.webp 1600w"
            sizes="(min-width: 1024px) 560px, 100vw"
            alt="Apartamento à noite, com o morador conferindo o consumo no celular"
            className="clip-hud w-full border border-line object-cover"
            loading="lazy"
            width={1600}
            height={1067}
          />
          <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            consumo residencial · pico entre 18h e 21h
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

const PASSOS = [
  {
    n: '01',
    titulo: 'Instala no quadro',
    texto:
      'Um sensor de corrente não-invasivo abraça o cabo de entrada. Não corta fio, não mexe na fiação de cada cômodo, não precisa de um plugue por aparelho.',
  },
  {
    n: '02',
    titulo: 'Lê a casa inteira',
    texto:
      'O ESP32 amostra a potência total e envia uma leitura a cada 15 minutos para a nuvem — cerca de 96 medições por dia.',
  },
  {
    n: '03',
    titulo: 'Separa aparelho por aparelho',
    texto:
      'Quando um aparelho liga, a potência total dá um degrau com assinatura própria. O algoritmo casa esse degrau com o catálogo e sabe quem ligou.',
  },
]

function ComoFunciona() {
  return (
    <section id="como" className="relative overflow-hidden border-t border-line py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <Rotulo cor="verde">Como funciona</Rotulo>
          <h2 className="mt-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl">
            Um sensor. Nenhuma tomada inteligente.
          </h2>
          <p className="mt-5 font-sans text-lg leading-relaxed text-white/65">
            Chama-se <strong className="font-semibold text-term">NILM</strong> —
            monitoramento não-intrusivo de cargas. Em vez de um medidor por aparelho,
            um único ponto de medição e um algoritmo que desmonta o sinal.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <ol className="space-y-px overflow-hidden border border-line bg-line">
            {PASSOS.map((p) => (
              <li key={p.n} className="flex gap-5 bg-panel px-6 py-7">
                <span className="font-mono text-sm font-bold tabular-nums text-amber/70">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-white">
                    {p.titulo}
                  </h3>
                  <p className="mt-2 font-sans leading-relaxed text-white/60">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-5">
            <VideoLoop
              className="clip-hud w-full border border-line"
              fonte="/midia/instalacao.mp4"
              poster="/midia/instalacao-poster.webp"
              rotulo="Instalação do sensor no quadro de energia"
            />
            <div className="border border-term/25 bg-term/[0.04] px-5 py-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-term-dim">
                Precisão medida
              </div>
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <span className="font-mono text-3xl font-bold tabular-nums text-term text-glow">
                    93,6%
                  </span>
                  <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                    recall
                  </span>
                </div>
                <div>
                  <span className="font-mono text-3xl font-bold tabular-nums text-term text-glow">
                    99,0%
                  </span>
                  <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                    precisão
                  </span>
                </div>
              </div>
              <p className="mt-4 font-sans text-sm leading-relaxed text-white/55">
                Números do detector rodando contra a base de validação do projeto.
                A versão atual é heurística, por detecção de degrau; o modelo de
                aprendizado de máquina está previsto para a próxima fase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FICHA = [
  ['Microcontrolador', 'ESP32 (Wi-Fi integrado)'],
  ['Sensor', 'SCT-013-030 · corrente não-invasiva'],
  ['Cadência', 'uma leitura a cada 15 minutos'],
  ['Instalação', 'no quadro, abraçando os cabos de entrada'],
]

function Aparelho() {
  return (
    <section id="aparelho" className="border-t border-line bg-panel/30 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <img
            src="/midia/produto-900.webp"
            srcSet="/midia/produto-900.webp 900w, /midia/produto.webp 1600w"
            sizes="(min-width: 1024px) 560px, 100vw"
            alt="O Amperê Node ao lado das duas garras de corrente que se prendem aos cabos"
            className="clip-hud w-full border border-line"
            loading="lazy"
            width={1600}
            height={900}
          />
        </div>

        <div className="order-1 lg:order-2">
          <Rotulo>O aparelho</Rotulo>
          <h2 className="mt-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl">
            Amperê Node
          </h2>
          <p className="mt-6 font-sans text-lg leading-relaxed text-white/65">
            Uma caixa no quadro de energia e garras de corrente nos cabos de entrada.
            Fica ligado na tomada, conecta no Wi-Fi da casa e reporta sozinho.
          </p>

          <dl className="mt-9 divide-y divide-line border-y border-line">
            {FICHA.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex flex-wrap justify-between gap-2 py-3.5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                  {rotulo}
                </dt>
                <dd className="font-mono text-sm text-white/85">{valor}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 flex gap-2.5 font-sans text-sm leading-relaxed text-amber/75">
            <span aria-hidden="true">⚠</span>
            <span>
              O hardware está em desenvolvimento. Hoje um simulador publica na mesma
              interface de ingestão prevista para o firmware — mesmo formato, mesma cadência.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 px-5 sm:grid-cols-2">
        <figure>
          <VideoLoop
            className="clip-hud w-full border border-line"
            fonte="/midia/produto.mp4"
            poster="/midia/produto-poster.webp"
            rotulo="O Amperê Node no trilho do quadro, com a barra âmbar acesa"
          />
          <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            no trilho, ao lado dos disjuntores
          </figcaption>
        </figure>
        <figure>
          <img
            src="/midia/quadro-900.webp"
            srcSet="/midia/quadro-900.webp 900w, /midia/quadro.webp 1600w"
            sizes="(min-width: 640px) 560px, 100vw"
            alt="Quadro de energia com o Amperê Node instalado e as garras no cabo de entrada"
            className="clip-hud w-full border border-line"
            loading="lazy"
            width={1600}
            height={900}
          />
          <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            instalação concluída · garras no cabo de entrada
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

// Mês de referência do projeto. A captura do painel logo abaixo é de outro
// mês e mostra valores um pouco diferentes -- por isso o bloco é rotulado
// como referência, e não como leitura ao vivo.
const NUMEROS = [
  { valor: '1.340 W', rotulo: 'consumo típico' },
  { valor: 'R$ 89', rotulo: 'ar-condicionado / mês' },
  { valor: 'R$ 42', rotulo: 'chuveiro / mês' },
  { valor: 'R$ 23', rotulo: 'geladeira / mês' },
]

function Painel() {
  return (
    <section className="border-t border-line py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <Rotulo cor="verde">O painel</Rotulo>
          <h2 className="mt-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl">
            Em reais. Não em quilowatt-hora.
          </h2>
          <p className="mt-5 font-sans text-lg leading-relaxed text-white/65">
            A tarifa da sua concessionária e a bandeira vigente entram na conta.
            O que aparece na tela é o que vai aparecer na fatura.
          </p>
        </div>

        <div className="mt-9">
          <Rotulo cor="verde">Apartamento de referência · mês típico</Rotulo>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.rotulo} className="bg-panel px-5 py-6">
              <div className="font-mono text-xl font-bold tabular-nums text-term text-glow sm:text-2xl">
                {n.valor}
              </div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                {n.rotulo}
              </div>
            </div>
          ))}
        </div>

        <figure className="mt-10">
          <img
            src="/midia/painel-900.webp"
            srcSet="/midia/painel-900.webp 900w, /midia/painel.webp 1600w"
            sizes="(min-width: 1024px) 1100px, 100vw"
            alt="Painel do Amperê mostrando consumo instantâneo, curva de 24 horas e custo por aparelho"
            className="clip-hud w-full border border-line"
            loading="lazy"
            width={1600}
            height={1000}
          />
          <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            painel real · tarifa Enel SP R$ 0,85/kWh · bandeira amarela
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

const PLANOS = [
  {
    nome: 'Amperê Node',
    preco: 'R$ 199',
    periodo: 'uma vez',
    descricao: 'O aparelho. Compra única, sem mensalidade obrigatória.',
    itens: ['ESP32 + sensor SCT-013-030', 'Instalação no quadro', 'Wi-Fi da própria casa'],
    destaque: false,
  },
  {
    nome: 'Free',
    preco: 'R$ 0',
    periodo: 'por mês',
    descricao: 'Tudo que você precisa para saber onde o dinheiro está indo.',
    itens: [
      'Identificação de aparelhos por NILM',
      'Custos em R$, não em kWh',
      'Painel e alertas em tempo real',
      'Relatório mensal básico',
    ],
    destaque: false,
  },
  {
    nome: 'Pro',
    preco: 'R$ 19,90',
    periodo: 'por mês',
    descricao: 'Para quem quer agir sobre o gasto, não só enxergar.',
    itens: [
      'Tudo do plano Free',
      'Recomendações de ROI por aparelho',
      'Detalhe individual de cada aparelho',
      'Histórico estendido e exportação',
    ],
    destaque: true,
  },
]

function Planos() {
  return (
    <section id="planos" className="border-t border-line bg-panel/30 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <Rotulo>Planos</Rotulo>
          <h2 className="mt-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl">
            O aparelho é seu. O software é de graça.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANOS.map((p) => (
            <div
              key={p.nome}
              className={`flex flex-col border px-6 py-7 ${
                p.destaque
                  ? 'border-amber/50 bg-amber/[0.05] shadow-glow-amber'
                  : 'border-line bg-panel'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-white">
                  {p.nome}
                </h3>
                {p.destaque && (
                  <span className="border border-amber/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-amber">
                    Pro
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span
                  className={`font-mono text-3xl font-bold tabular-nums ${
                    p.destaque ? 'text-amber' : 'text-white'
                  }`}
                >
                  {p.preco}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  {p.periodo}
                </span>
              </div>

              <p className="mt-4 font-sans text-sm leading-relaxed text-white/55">
                {p.descricao}
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {p.itens.map((i) => (
                  <li key={i} className="flex gap-2.5 font-sans text-sm text-white/70">
                    <span
                      aria-hidden="true"
                      className={p.destaque ? 'text-amber' : 'text-term-dim'}
                    >
                      ▸
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Fechamento() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <VideoLoop
        className="absolute inset-0 h-full w-full object-cover opacity-30"
        fonte="/midia/sinal.mp4"
        poster="/midia/sinal-poster.webp"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-base/85 via-base/70 to-base" />

      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
        <h2 className="font-sans text-3xl font-bold leading-tight text-white sm:text-5xl">
          Veja o painel funcionando.
        </h2>
        <p className="mx-auto mt-5 max-w-lg font-sans text-lg leading-relaxed text-white/65">
          A demonstração roda com 90 dias de leituras e os aparelhos já separados.
          Não precisa instalar nada.
        </p>
        <Link
          to="/entrar"
          className="clip-hud mt-9 inline-block border border-term bg-term px-9 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-base shadow-glow transition-all hover:bg-term/85"
        >
          Entrar no painel ▸
        </Link>
        <p className="mt-5 font-mono text-[11px] tracking-wide text-white/35">
          demo@ampere.app · senha ampere2026
        </p>
      </div>
    </section>
  )
}

function Rodape() {
  return (
    <footer className="border-t border-line bg-base py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Marca />
          <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-white/45">
            Protótipo acadêmico desenvolvido para a disciplina Startup One da FIAP.
            O hardware físico, o modelo de aprendizado de máquina e a cobrança dos
            planos estão previstos para a próxima fase — hoje as leituras vêm de um
            simulador que usa a mesma interface de ingestão do aparelho real.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/45">
          <a href="#como" className="transition-colors hover:text-amber">Como funciona</a>
          <a href="#aparelho" className="transition-colors hover:text-amber">O aparelho</a>
          <a href="#planos" className="transition-colors hover:text-amber">Planos</a>
          <Link to="/entrar" className="transition-colors hover:text-amber">Entrar</Link>
        </nav>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-line px-5 pt-6 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        Amperê · FIAP Startup One · 2026
      </div>
    </footer>
  )
}

export function Landing() {
  // Única tela do app fora da moldura do cockpit: aqui a fotografia manda, e o
  // verde-terminal fica guardado para os momentos de dado e para o CTA final.
  return (
    <div className="min-h-screen bg-base">
      <Topo />
      <main>
        <Hero />
        <Problema />
        <ComoFunciona />
        <Aparelho />
        <Painel />
        <Planos />
        <Fechamento />
      </main>
      <Rodape />
    </div>
  )
}
