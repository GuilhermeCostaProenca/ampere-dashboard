import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { TariffFlagBadge } from './TariffFlag'
import { api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'
import { useAuth } from '../auth/AuthContext'

const NAV = [
  { to: '/', label: 'Início', icon: '◰', end: true },
  { to: '/aparelhos', label: 'Aparelhos', icon: '⏚', end: false },
  { to: '/alertas', label: 'Alertas', icon: '⚠', end: false },
  { to: '/relatorio', label: 'Relatório', icon: '▤', end: false },
  { to: '/config', label: 'Config', icon: '⚙', end: false },
]

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="tabular-nums text-term/80">
      {now.toLocaleTimeString('pt-BR', { hour12: false })}
    </span>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center border border-term/60 text-term shadow-glow">
        <span className="text-lg font-extrabold leading-none">A</span>
      </span>
      <div className="leading-none">
        <div className="text-sm font-extrabold tracking-[0.3em] text-term text-glow">AMPERÊ</div>
        <div className="text-[8px] tracking-[0.3em] text-muted">NILM CONTROL</div>
      </div>
    </div>
  )
}

export function Layout() {
  const { usuario, sair } = useAuth()
  // Status do sensor e bandeira vigente vêm da API (atualiza a cada minuto).
  const { dados } = useRecurso(() => api.configuracoes(), [], { intervaloMs: 60_000 })

  const sensorOnline = dados?.sensor.status === 'online'

  return (
    <div className="min-h-full">
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-56 flex-col border-r border-line bg-panel/70 backdrop-blur md:flex">
        <div className="border-b border-line px-4 py-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `clip-hud flex items-center gap-3 border px-3 py-2 text-xs uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'border-term/50 bg-term/10 text-term text-glow'
                    : 'border-transparent text-muted hover:border-line hover:text-term'
                }`
              }
            >
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3 text-[9px] leading-relaxed text-muted">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                sensorOnline ? 'bg-term shadow-glow' : 'bg-amber shadow-glow-amber animate-blink'
              }`}
            />
            {dados ? (sensorOnline ? 'SENSOR ONLINE' : 'SENSOR OFFLINE') : 'CONECTANDO…'}
          </div>
          {usuario && (
            <div className="mt-2 truncate text-term-dim" title={usuario.email}>
              {usuario.nome}
            </div>
          )}
          <button
            onClick={sair}
            className="mt-1.5 text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-danger"
          >
            ◂ Encerrar sessão
          </button>
          <div className="mt-2 opacity-60">v1.0.0 — FIAP Startup One</div>
        </div>
      </aside>

      {/* ── Conteúdo ───────────────────────────────────────────────────── */}
      <div className="md:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-base/85 px-4 py-3 backdrop-blur">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted md:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                sensorOnline ? 'bg-term shadow-glow animate-blink' : 'bg-amber shadow-glow-amber'
              }`}
            />
            Telemetria ao vivo • <Clock />
          </div>
          <div className="flex items-center gap-3">
            <TariffFlagBadge bandeira={dados?.tarifa ?? null} />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 md:pb-8 animate-flicker">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav (mobile) ───────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 z-30 flex w-full justify-around border-t border-line bg-panel/95 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-wider ${
                isActive ? 'text-term text-glow' : 'text-muted'
              }`
            }
          >
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
