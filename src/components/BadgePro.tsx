import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import type { PlanoResumo } from '../api/types'

const PRECO_PADRAO: PlanoResumo = { nome: 'Pro', preco_mensal: 19.9 }

const preco = (p: PlanoResumo) =>
  `R$ ${p.preco_mensal.toFixed(2).replace('.', ',')}/mês`

/**
 * Selo de upsell. Aparece em TODO ponto onde um recurso premium está bloqueado,
 * sempre com o preço visível — ajuste vindo do teste de usabilidade do CP4:
 * os participantes viam o cadeado mas não sabiam quanto custava destravar.
 */
export function BadgePro({
  plano = PRECO_PADRAO,
  compact = false,
}: {
  plano?: PlanoResumo | null
  compact?: boolean
}) {
  const p = plano ?? PRECO_PADRAO
  return (
    <span
      className={`clip-hud-sm inline-flex items-center gap-1.5 border border-amber/50 bg-amber/10 text-amber ${
        compact ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'
      } font-bold uppercase tracking-[0.18em]`}
    >
      <Lock size={compact ? 10 : 12} strokeWidth={2.2} />
      {p.nome} · {preco(p)}
    </span>
  )
}

/** Bloco de recurso bloqueado: explica o que está travado e quanto custa. */
export function RecursoBloqueado({
  titulo,
  descricao,
  plano,
}: {
  titulo: string
  descricao: string
  plano?: PlanoResumo | null
}) {
  const p = plano ?? PRECO_PADRAO
  return (
    <div className="relative">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center border border-amber/40 bg-base text-amber">
            <Lock size={16} strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-bold text-amber text-glow-amber">{titulo}</p>
            <p className="mt-0.5 t-sub">{descricao}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <BadgePro plano={p} />
          <Link
            to="/config"
            className="clip-hud-sm border border-amber/60 bg-amber/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber/20"
          >
            Destravar ▸
          </Link>
        </div>
      </div>

      {/* Amostra borrada do que está por trás do cadeado. */}
      <div className="mt-4 select-none border-t border-line/60 pt-3 opacity-30 blur-[3px]">
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-term">R$ ██,██</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">economia/mês</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-amber">██m</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">payback</div>
          </div>
        </div>
      </div>
    </div>
  )
}
