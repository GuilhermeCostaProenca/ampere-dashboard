import { Panel } from '../components/Hud'
import { AlertIcon } from '../components/icons'
import { alerts } from '../data/mock'
import type { AlertItem } from '../data/mock'

const meta: Record<
  AlertItem['kind'],
  { tag: string; accent: 'term' | 'amber' | 'danger'; color: string }
> = {
  'over-average': { tag: 'ACIMA DA MÉDIA', accent: 'amber', color: 'text-amber' },
  'no-signal': { tag: 'SEM LEITURA', accent: 'danger', color: 'text-danger' },
  achievement: { tag: 'CONQUISTA', accent: 'term', color: 'text-term' },
}

// log de terminal: timestamps fictícios coerentes com timeAgo
const logLines: { ts: string; kind: AlertItem['kind']; msg: string }[] = [
  { ts: '14:32:07', kind: 'over-average', msg: 'SHOWER_HEATER load > daily_avg (+18%)' },
  { ts: '12:18:44', kind: 'no-signal', msg: 'FRIDGE signature lost — NILM timeout 2h' },
  { ts: '09:51:12', kind: 'over-average', msg: 'AC_UNIT month usage 17% over baseline' },
  { ts: '08:03:55', kind: 'achievement', msg: 'LAUNDRY consumption -8% vs avg [OK]' },
  { ts: '07:40:21', kind: 'over-average', msg: 'morning peak detected 4.2kW' },
  { ts: '02:15:09', kind: 'achievement', msg: 'standby drain within target [OK]' },
]

export function Alerts() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Central de alertas
        </h1>
        <p className="t-sub">Eventos detectados pela IA em tempo real</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── Cards (foco) ── */}
        <div className="grid gap-3 lg:col-span-7">
          {alerts.map((a) => {
            const m = meta[a.kind]
            return (
              <Panel key={a.id} accent={m.accent}>
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-9 w-9 flex-shrink-0 place-items-center border border-line bg-base ${m.color}`}
                  >
                    <AlertIcon kind={a.kind} size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${m.color}`}>
                        {m.tag}
                      </span>
                      <span className="t-sub">{a.timeAgo}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-term">{a.title}</h3>
                    <p className="mt-0.5 t-sub">{a.detail}</p>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>

        {/* ── Timeline / event log (estilo terminal) ── */}
        <div className="lg:col-span-5">
          <Panel
            title="Event log"
            badge={
              <span className="flex items-center gap-1.5 t-sub uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-term shadow-glow animate-blink" />
                live
              </span>
            }
          >
            <ul className="relative space-y-3 pl-4">
              {/* linha vertical da timeline */}
              <span className="absolute left-[5px] top-1 bottom-1 w-px bg-line" />
              {logLines.map((l, i) => {
                const m = meta[l.kind]
                return (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-4 top-1 h-2 w-2 rounded-full border border-base ${
                        l.kind === 'no-signal'
                          ? 'bg-danger'
                          : l.kind === 'achievement'
                            ? 'bg-term shadow-glow'
                            : 'bg-amber'
                      }`}
                    />
                    <div className="flex items-baseline gap-2 text-[11px] leading-tight">
                      <span className="tabular-nums text-term-dim">{l.ts}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${m.color}`}>
                        {l.kind === 'no-signal' ? 'ERR' : l.kind === 'achievement' ? 'OK ' : 'WRN'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      <span className="text-term-dim">$ </span>
                      {l.msg}
                    </div>
                  </li>
                )
              })}
              <li className="relative">
                <span className="absolute -left-4 top-1 h-2 w-2 animate-blink rounded-full bg-term shadow-glow" />
                <span className="text-[11px] text-term">
                  <span className="text-term-dim">$ </span>
                  <span className="animate-blink">█</span>
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
