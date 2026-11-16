import type { ReactNode } from 'react'
import type { Aviso, Confianca } from '../../api/visionTypes'

// ─────────────────────────────────────────────────────────────────────────────
// Campo lido pelo modelo: valor editável + barra de confiança + aviso.
//
// Três decisões de interface:
//
// 1. O campo é SEMPRE editável, nunca "só leitura com botão de editar". A
//    pessoa está conferindo um OCR; o atrito de um clique a mais por campo é
//    exatamente o atrito que faz ninguém conferir.
//
// 2. A confiança aparece como barra E como número. A barra sozinha não diz
//    "91%", e a cor sozinha não passa em contraste AA para quem não distingue
//    verde de âmbar — por isso vem com rótulo textual também.
//
// 3. Confiança baixa não desabilita nada: destaca em âmbar e segue.
// ─────────────────────────────────────────────────────────────────────────────

function faixa(valor: number | undefined) {
  if (valor === undefined) return { cor: 'muted', rotulo: 'sem medida', pct: 0 }
  const pct = Math.round(valor * 100)
  if (valor >= 0.8) return { cor: 'term', rotulo: 'alta', pct }
  if (valor >= 0.5) return { cor: 'amber', rotulo: 'média', pct }
  return { cor: 'danger', rotulo: 'baixa', pct }
}

function BarraConfianca({ valor }: { valor: number | undefined }) {
  const { cor, rotulo, pct } = faixa(valor)
  const fundo = cor === 'term' ? 'bg-term' : cor === 'amber' ? 'bg-amber' : cor === 'danger' ? 'bg-danger' : 'bg-muted'
  const texto =
    cor === 'term'
      ? 'text-term-dim'
      : cor === 'amber'
        ? 'text-amber/90'
        : cor === 'danger'
          ? 'text-danger/90'
          : 'text-muted'

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden border border-line bg-base" aria-hidden="true">
        <div className={`h-full ${fundo}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[9px] uppercase tracking-[0.18em] ${texto}`}>
        {valor === undefined ? 'confiança não informada' : `confiança ${rotulo} · ${pct}%`}
      </span>
    </div>
  )
}

export interface CampoExtraidoProps {
  id: string
  rotulo: string
  /** Unidade mostrada ao lado do campo (kWh, R$, W, V). */
  unidade?: string
  valor: string
  aoMudar: (valor: string) => void
  confianca?: number
  aviso?: Aviso
  tipo?: 'text' | 'number' | 'month'
  placeholder?: string
  inputMode?: 'text' | 'decimal' | 'numeric'
  /** Quando presente, renderiza um <select> em vez de <input>. */
  opcoes?: { valor: string; rotulo: string }[]
  obrigatorio?: boolean
  dica?: ReactNode
}

export function CampoExtraido({
  id,
  rotulo,
  unidade,
  valor,
  aoMudar,
  confianca,
  aviso,
  tipo = 'text',
  placeholder,
  inputMode,
  opcoes,
  obrigatorio,
  dica,
}: CampoExtraidoProps) {
  const vazio = valor.trim() === ''
  const borda = aviso
    ? 'border-amber/60'
    : vazio
      ? 'border-line'
      : 'border-line focus:border-term/60'
  const idAviso = `${id}-aviso`

  return (
    <div>
      <label htmlFor={id} className="block">
        <span className="t-label">
          {rotulo}
          {unidade && <span className="ml-1 normal-case tracking-normal text-muted">({unidade})</span>}
          {obrigatorio && (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </span>
      </label>

      {opcoes ? (
        <select
          id={id}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-describedby={aviso ? idAviso : undefined}
          className={`clip-hud-sm mt-1.5 w-full border ${borda} bg-base px-3 py-2.5 text-sm text-term outline-none transition-colors focus:shadow-glow`}
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor} className="bg-base text-term">
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={tipo}
          inputMode={inputMode}
          value={valor}
          placeholder={placeholder ?? 'não lido — preencha'}
          onChange={(e) => aoMudar(e.target.value)}
          aria-describedby={aviso ? idAviso : undefined}
          aria-invalid={aviso ? true : undefined}
          required={obrigatorio}
          className={`clip-hud-sm mt-1.5 w-full border ${borda} bg-base px-3 py-2.5 text-sm tabular-nums text-term outline-none transition-colors placeholder:text-muted/60 focus:shadow-glow`}
        />
      )}

      <BarraConfianca valor={confianca} />

      {dica && <p className="mt-1 t-sub">{dica}</p>}

      {aviso && (
        <p
          id={idAviso}
          className="mt-1.5 border-l-2 border-amber/60 pl-2 text-[11px] leading-relaxed text-amber/90"
        >
          <span className="font-bold" aria-hidden="true">
            ⚠{' '}
          </span>
          {aviso.mensagem}
        </p>
      )}
    </div>
  )
}

/** Avisos que não pertencem a um campo específico. */
export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null
  return (
    <div
      role="status"
      className="clip-hud-sm border border-amber/50 bg-amber/[0.07] px-3 py-2.5"
    >
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber">
        <span aria-hidden="true">⚠ </span>
        {avisos.length === 1 ? '1 ponto para conferir' : `${avisos.length} pontos para conferir`}
      </h3>
      <ul className="mt-1.5 space-y-1">
        {avisos.map((a) => (
          <li key={a.codigo + a.campo} className="text-[11px] leading-relaxed text-amber/90">
            • {a.mensagem}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Confiança de um campo, tolerando chave ausente. */
export const confiancaDe = (c: Confianca | undefined, campo: string) => c?.[campo]
