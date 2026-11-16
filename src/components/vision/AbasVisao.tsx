import { NavLink } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Alternador entre as duas leituras por foto.
//
// Existe para a barra inferior do celular não virar sete itens de 9px: a
// navegação principal ganha UM item ("Escanear") e a escolha entre conta e
// etiqueta acontece aqui dentro, com alvo de toque de tamanho decente.
// ─────────────────────────────────────────────────────────────────────────────

const ABAS = [
  { to: '/painel/escanear-conta', rotulo: 'Conta de luz', icone: '▤' },
  { to: '/painel/identificar-aparelho', rotulo: 'Etiqueta do aparelho', icone: '⬚' },
]

export function AbasVisao() {
  return (
    <nav aria-label="Tipo de leitura por foto" className="flex gap-2">
      {ABAS.map((a) => (
        <NavLink
          key={a.to}
          to={a.to}
          className={({ isActive }) =>
            `clip-hud-sm flex flex-1 items-center justify-center gap-2 border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
              isActive
                ? 'border-term/60 bg-term/10 text-term text-glow'
                : 'border-line text-muted hover:border-term/40 hover:text-term'
            }`
          }
        >
          <span aria-hidden="true" className="text-sm leading-none">
            {a.icone}
          </span>
          {a.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
