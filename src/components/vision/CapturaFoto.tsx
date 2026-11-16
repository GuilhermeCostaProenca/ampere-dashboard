import { useEffect, useRef, useState } from 'react'
import { CornerMarks } from '../Hud'

// ─────────────────────────────────────────────────────────────────────────────
// Captura da foto + estado de processamento.
//
// `capture="environment"` é o que abre a câmera de trás direto no celular —
// sem isso o iOS abre a galeria, e a demo é gravada no celular.
//
// A animação de scan roda SOBRE a foto escolhida, não num spinner ao lado:
// enquanto o modelo lê, a pessoa vê a linha varrendo a própria conta dela. É
// a leitura acontecendo, no vocabulário do resto do painel.
// ─────────────────────────────────────────────────────────────────────────────

/** Etapas mostradas durante o processamento (uma por vez, em sequência). */
const ETAPAS = [
  'corrigindo orientação e reduzindo a imagem',
  'enviando ao modelo de visão',
  'lendo os campos da imagem',
  'validando o resultado',
]

function LinhaDeScan() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-x-0 h-14 animate-scan"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(0,255,102,0.28), rgba(0,255,102,0.55), rgba(0,255,102,0.28), transparent)',
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,255,102,0.10) 0 1px, transparent 1px 7px)',
        }}
      />
    </>
  )
}

function Etapas({ ativo }: { ativo: boolean }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!ativo) {
      setIndice(0)
      return
    }
    const t = setInterval(() => setIndice((i) => Math.min(ETAPAS.length - 1, i + 1)), 1400)
    return () => clearInterval(t)
  }, [ativo])

  if (!ativo) return null

  return (
    <ul className="mt-3 space-y-1 text-[11px] leading-tight" aria-live="polite">
      {ETAPAS.slice(0, indice + 1).map((etapa, i) => (
        <li key={etapa} className="text-muted">
          <span className="text-term-dim">$ </span>
          {etapa}
          {i < indice ? (
            <span className="ml-2 text-term-dim">[OK]</span>
          ) : (
            <span className="ml-1 animate-blink text-term">█</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export interface CapturaFotoProps {
  /** Texto do botão quando não há foto escolhida. */
  rotulo: string
  /** Instrução de enquadramento mostrada acima do seletor. */
  dica: string
  processando: boolean
  /** Chamado quando a pessoa escolhe/troca a foto. */
  aoEscolher: (arquivo: File) => void
  /** Chamado ao limpar a foto (volta para o seletor). */
  aoLimpar: () => void
  /** Rótulo do botão de ação principal. */
  rotuloAcao: string
  aoEnviar: () => void
  id: string
}

export function CapturaFoto({
  rotulo,
  dica,
  processando,
  aoEscolher,
  aoLimpar,
  rotuloAcao,
  aoEnviar,
  id,
}: CapturaFotoProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  // A URL do objeto é revogada quando a prévia troca ou o componente sai:
  // sem isso o blob da foto fica retido na memória da aba a cada tentativa.
  useEffect(() => {
    if (!arquivo) {
      setPrevia(null)
      return
    }
    const url = URL.createObjectURL(arquivo)
    setPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [arquivo])

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setArquivo(f)
    aoEscolher(f)
  }

  function limpar() {
    setArquivo(null)
    if (entrada.current) entrada.current.value = ''
    aoLimpar()
  }

  return (
    <div className="space-y-3">
      <p className="t-sub">{dica}</p>

      {/* O input fica sempre no DOM e é alcançável por teclado via o label. */}
      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={escolher}
        disabled={processando}
        className="sr-only"
      />

      {!previa ? (
        <label
          htmlFor={id}
          className="clip-hud relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-term/40 bg-base/60 px-4 py-8 text-center transition-colors hover:border-term/70 hover:bg-term/[0.04] focus-within:border-term focus-within:shadow-glow"
        >
          <CornerMarks />
          <span className="text-3xl leading-none text-term-dim" aria-hidden="true">
            ⬚
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-term">
            {rotulo}
          </span>
          <span className="t-sub max-w-xs">
            Toque para abrir a câmera ou escolher uma foto da galeria
          </span>
        </label>
      ) : (
        <div className="space-y-3">
          <div className="clip-hud relative overflow-hidden border border-line bg-base">
            <CornerMarks color={processando ? 'amber' : 'term'} />
            <img
              src={previa}
              alt="Prévia da foto enviada para leitura"
              className="max-h-[320px] w-full object-contain"
            />
            {processando && <LinhaDeScan />}
            {processando && (
              <span className="absolute left-3 top-3 border border-term/60 bg-base/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-term">
                <span className="animate-blink">▮</span> lendo
              </span>
            )}
          </div>

          <Etapas ativo={processando} />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aoEnviar}
              disabled={processando}
              className="clip-hud-sm flex-1 border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-term transition-colors hover:bg-term/20 disabled:opacity-50"
            >
              {processando ? (
                <span className="animate-blink">processando…</span>
              ) : (
                `${rotuloAcao} ▸`
              )}
            </button>
            <button
              type="button"
              onClick={limpar}
              disabled={processando}
              className="clip-hud-sm border border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
            >
              Trocar foto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
