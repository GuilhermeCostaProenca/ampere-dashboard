import { useEffect, useState } from 'react'
import { CornerMarks, Panel } from './Hud'
import { ErroApi } from '../api/types'

// ─────────────────────────────────────────────────────────────────────────────
// Estados de carregamento e erro no vocabulário do cockpit.
// Nada de spinner genérico: o painel "liga" como um instrumento — varredura
// horizontal, log de boot e blocos de telemetria ainda sem sinal.
// ─────────────────────────────────────────────────────────────────────────────

const LOG_PADRAO = [
  'estabelecendo enlace com amperê node',
  'autenticando sessão',
  'lendo fato_leitura_agregada',
  'reconstruindo assinaturas NILM',
  'aplicando tarifa vigente',
]

/** Log de boot: linhas entram uma a uma, com cursor piscando no fim. */
function BootLog({ linhas = LOG_PADRAO }: { linhas?: string[] }) {
  const [visiveis, setVisiveis] = useState(1)

  useEffect(() => {
    const t = setInterval(
      () => setVisiveis((v) => (v >= linhas.length ? linhas.length : v + 1)),
      420,
    )
    return () => clearInterval(t)
  }, [linhas.length])

  return (
    <ul className="space-y-1 text-[11px] leading-tight">
      {linhas.slice(0, visiveis).map((l, i) => (
        <li key={l} className="text-muted">
          <span className="text-term-dim">$ </span>
          {l}
          {i < visiveis - 1 && <span className="ml-2 text-term-dim">[OK]</span>}
        </li>
      ))}
      <li className="text-term">
        <span className="text-term-dim">$ </span>
        <span className="animate-blink">█</span>
      </li>
    </ul>
  )
}

/** Faixa de varredura — o mesmo gesto do osciloscópio, sem dado por trás. */
function Varredura({ altura = 8 }: { altura?: number }) {
  return (
    <div
      className="relative overflow-hidden border border-line bg-base"
      style={{ height: altura }}
    >
      <div
        className="h-full w-1/3 animate-sweep"
        style={{ background: 'linear-gradient(90deg, transparent, #00ff6633, transparent)' }}
      />
    </div>
  )
}

/** Bloco vazio de telemetria, aguardando leitura. */
export function BlocoSemSinal({ altura = 64 }: { altura?: number }) {
  return (
    <div
      className="clip-hud-sm relative overflow-hidden border border-line bg-panel/50"
      style={{ height: altura }}
    >
      <div
        className="h-full w-1/3 animate-sweep"
        style={{ background: 'linear-gradient(90deg, transparent, #00ff661f, transparent)' }}
      />
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-[9px] uppercase tracking-[0.3em] text-term-label">
        aguardando sinal
      </span>
    </div>
  )
}

/** Placeholder do osciloscópio: grade e linha de base varrida. */
export function ScopeSemSinal({ height = 200 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden border border-line/60 bg-base" style={{ height }}>
      <svg className="absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="none">
        <defs>
          <pattern id="grade-hud" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0 L0 0 0 28" fill="none" stroke="#13201d" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grade-hud)" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#0a8f43" strokeWidth="1.2" strokeDasharray="4 6" />
      </svg>
      <div
        className="h-full w-1/4 animate-sweep"
        style={{ background: 'linear-gradient(90deg, transparent, #00ff6626, transparent)' }}
      />
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.3em] text-term-label">
        sem sinal — aguardando telemetria
      </span>
    </div>
  )
}

/** Tela de carregamento de uma rota inteira. */
export function HudLoading({
  titulo = 'Estabelecendo telemetria',
  linhas,
}: {
  titulo?: string
  linhas?: string[]
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          <span className="animate-blink">▮</span> {titulo}
        </h1>
        <p className="t-sub">Consultando o banco em nuvem…</p>
      </div>

      <section className="clip-hud relative border border-line bg-panel/80 p-4">
        <CornerMarks />
        <Varredura />
        <div className="mt-4">
          <BootLog linhas={linhas} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <BlocoSemSinal />
          <BlocoSemSinal />
          <BlocoSemSinal />
        </div>
      </section>
    </div>
  )
}

/** Carregamento embutido em um painel já existente. */
export function HudCarregandoInline({ altura = 120 }: { altura?: number }) {
  return (
    <div className="space-y-3">
      <Varredura altura={6} />
      <BlocoSemSinal altura={altura} />
    </div>
  )
}

function textoDoErro(erro: unknown): { titulo: string; detalhe: string; dica?: string } {
  if (erro instanceof ErroApi) {
    if (erro.codigo === 'sem_conexao') {
      return {
        titulo: 'Enlace perdido com a API',
        detalhe: erro.message,
        dica: 'Suba o back-end com "npm run dev" dentro de server/ ou confira VITE_API_URL.',
      }
    }
    if (erro.status === 401) {
      return {
        titulo: 'Sessão expirada',
        detalhe: 'O token de acesso não é mais válido.',
        dica: 'Entre novamente para restabelecer a sessão.',
      }
    }
    if (erro.status === 404) {
      return { titulo: 'Registro não encontrado', detalhe: erro.message }
    }
    return { titulo: `Falha ${erro.status} — ${erro.codigo}`, detalhe: erro.message }
  }
  return {
    titulo: 'Falha inesperada',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  }
}

/** Erro visível e legível, no lugar do conteúdo que falhou. */
export function HudErro({
  erro,
  aoTentarNovamente,
}: {
  erro: unknown
  aoTentarNovamente?: () => void
}) {
  const { titulo, detalhe, dica } = textoDoErro(erro)
  return (
    <Panel title="Falha de telemetria" accent="danger">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center border border-danger/50 bg-base text-danger text-glow-danger">
          ⚠
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-danger text-glow-danger">
            {titulo}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{detalhe}</p>
          {dica && (
            <p className="mt-2 border-l-2 border-amber/50 pl-2 text-[11px] text-amber/90">{dica}</p>
          )}
          {aoTentarNovamente && (
            <button
              onClick={aoTentarNovamente}
              className="clip-hud-sm mt-3 border border-term/50 bg-term/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-term transition-colors hover:bg-term/20"
            >
              ↻ Tentar novamente
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
