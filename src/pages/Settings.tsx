import { Panel, StatusDot } from '../components/Hud'
import { sensor, user } from '../data/mock'

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 py-2.5 text-sm last:border-0">
      <span className="text-[11px] uppercase tracking-widest text-muted">{label}</span>
      <span className={accent ? 'font-bold text-term text-glow' : 'text-term'}>{value}</span>
    </div>
  )
}

// Barra de sinal Wi-Fi a partir de dBm (-30 ótimo ... -90 ruim)
function WifiBars({ dbm }: { dbm: number }) {
  const quality = Math.max(0, Math.min(4, Math.round(((dbm + 90) / 60) * 4)))
  return (
    <span className="inline-flex items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={`w-1 ${b <= quality ? 'bg-term shadow-glow' : 'bg-line'}`}
          style={{ height: `${b * 3 + 2}px` }}
        />
      ))}
      <span className="ml-2 text-xs text-muted">{dbm} dBm</span>
    </span>
  )
}

export function Settings() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold uppercase tracking-[0.25em] text-term text-glow">
          Configurações
        </h1>
        <p className="text-xs text-muted">Conta, plano e diagnóstico do sensor</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Dados do usuário">
          <Row label="Nome" value={user.name} accent />
          <Row label="E-mail" value={user.email} />
          <Row label="Residência" value={user.home} />
          <Row label="Distribuidora" value={user.distributor} />
        </Panel>

        <Panel title="Plano atual" accent={user.plan === 'Pro' ? 'term' : 'amber'}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-extrabold text-term text-glow">{user.plan}</div>
              <p className="mt-1 text-xs text-muted">
                {user.plan === 'Free'
                  ? 'Acesso a dashboard, alertas e relatório básico.'
                  : 'Recomendações de ROI, histórico estendido e exportação.'}
              </p>
            </div>
            {user.plan === 'Free' && (
              <button className="clip-hud border border-amber/60 bg-amber/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber/20">
                Upgrade ▸ Pro
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-muted">
            <li>✓ Identificação de aparelhos por NILM</li>
            <li>✓ Custos em R$ (não em kWh)</li>
            <li className={user.plan === 'Pro' ? 'text-term' : 'opacity-50'}>
              {user.plan === 'Pro' ? '✓' : '✗'} Recomendações de ROI por aparelho
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Status do sensor" badge={<StatusDot status={sensor.status} />}>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <div>
            <Row label="Modelo" value={sensor.model} />
            <Row label="Firmware" value={sensor.firmware} />
            <Row label="Uptime" value={`${sensor.uptimeDays} dias`} />
          </div>
          <div>
            <Row label="Rede Wi-Fi" value={sensor.wifiSsid} />
            <Row label="Sinal" value={<WifiBars dbm={sensor.wifiSignal} />} />
            <Row label="Última sincronização" value={sensor.lastSync} accent />
          </div>
        </div>
        <p className="mt-4 border-t border-line/50 pt-3 text-[10px] uppercase tracking-widest text-muted">
          ⚠ Protótipo de alta fidelidade — dados simulados. Integração com hardware ESP32 e nuvem na Fase 5.
        </p>
      </Panel>
    </div>
  )
}
