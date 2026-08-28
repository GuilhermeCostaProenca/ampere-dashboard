import { useState } from 'react'
import { Panel, StatusDot } from '../components/Hud'
import { BadgePro } from '../components/BadgePro'
import { HudErro, HudLoading } from '../components/HudState'
import { api } from '../api/client'
import { useRecurso } from '../hooks/useRecurso'
import { useAuth } from '../auth/AuthContext'
import { ErroApi } from '../api/types'

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/50 py-2.5 text-sm last:border-0">
      <span className="flex-shrink-0 text-[11px] uppercase tracking-widest text-muted">{label}</span>
      <span
        className={`truncate text-right ${accent ? 'font-bold text-term text-glow' : 'text-term'}`}
      >
        {value}
      </span>
    </div>
  )
}

// Barra de sinal Wi-Fi a partir de dBm (-30 ótimo ... -90 ruim)
function WifiBars({ dbm }: { dbm: number | null }) {
  if (dbm === null) return <span className="text-xs text-muted">sem leitura</span>
  const qualidade = Math.max(0, Math.min(4, Math.round(((dbm + 90) / 60) * 4)))
  return (
    <span className="inline-flex items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={`w-1 ${b <= qualidade ? 'bg-term shadow-glow' : 'bg-line'}`}
          style={{ height: `${b * 3 + 2}px` }}
        />
      ))}
      <span className="ml-2 text-xs text-muted">{dbm} dBm</span>
    </span>
  )
}

function haQuantoTempo(iso: string | null) {
  if (!iso) return 'nunca'
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000)
  if (s < 90) return `há ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} dias`
}

export function Settings() {
  const { definirUsuario } = useAuth()
  const { dados, erro, carregando, recarregar } = useRecurso(() => api.configuracoes(), [], {
    intervaloMs: 30_000,
  })
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  async function trocarPlano(novo: 'free' | 'pro') {
    setSalvando(true)
    setErroSalvar(null)
    try {
      const atualizado = await api.salvarConfiguracoes({ plano: novo })
      definirUsuario(atualizado.usuario)
      recarregar()
    } catch (e) {
      setErroSalvar(e instanceof ErroApi ? e.message : 'Falha ao atualizar o plano')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <HudLoading
        titulo="Configurações"
        linhas={['lendo dim_usuario', 'lendo dim_plano', 'consultando status do sensor']}
      />
    )
  }

  if (erro && !dados) return <HudErro erro={erro} aoTentarNovamente={recarregar} />
  if (!dados) return null

  const { usuario, plano_ativo, planos, sensor, tarifa } = dados
  const ehPro = usuario.plano === 'pro'
  const planoPro = planos.find((p) => p.nome.toLowerCase() === 'pro') ?? null

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
          <Row label="Nome" value={usuario.nome} accent />
          <Row label="E-mail" value={usuario.email} />
          <Row
            label="Tipo de imóvel"
            value={usuario.tipo_imovel === 'casa' ? 'Casa' : 'Apartamento'}
          />
          <Row
            label="Distribuidora"
            value={`${tarifa.concessionaria} • R$ ${tarifa.tarifa_kwh.toFixed(2)}/kWh`}
          />
        </Panel>

        <Panel title="Plano atual" accent={ehPro ? 'term' : 'amber'}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold text-term text-glow">
                {plano_ativo?.nome ?? (ehPro ? 'Pro' : 'Free')}
              </div>
              <p className="mt-1 text-xs text-muted">
                {ehPro
                  ? 'Recomendações de ROI, histórico estendido e exportação.'
                  : 'Acesso a dashboard, alertas e relatório básico.'}
              </p>
            </div>

            {!ehPro ? (
              <div className="flex flex-col items-end gap-2">
                {/* Preço sempre visível junto do CTA (ajuste de usabilidade). */}
                <BadgePro plano={planoPro} compact />
                <button
                  onClick={() => trocarPlano('pro')}
                  disabled={salvando}
                  className="clip-hud border border-amber/60 bg-amber/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
                >
                  {salvando ? 'ativando…' : 'Upgrade ▸ Pro'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => trocarPlano('free')}
                disabled={salvando}
                className="clip-hud-sm border border-line px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
              >
                {salvando ? 'aguarde…' : 'Voltar ao Free'}
              </button>
            )}
          </div>

          {erroSalvar && (
            <div className="clip-hud-sm mt-3 border border-danger/50 bg-danger/10 px-3 py-2 text-[11px] text-danger">
              ⚠ {erroSalvar}
            </div>
          )}

          <ul className="mt-4 space-y-1.5 text-xs">
            {(plano_ativo?.recursos ?? []).map((r) => (
              <li key={r} className="text-muted">
                <span className="text-term">✓</span> {r}
              </li>
            ))}
            {!ehPro &&
              (planoPro?.recursos ?? [])
                .filter(
                  (r) =>
                    !(plano_ativo?.recursos ?? []).includes(r) && r !== 'Tudo do plano Free',
                )
                .map((r) => (
                  <li key={r} className="flex flex-wrap items-center gap-1.5 text-muted opacity-70">
                    <span className="text-amber">✗</span> {r}
                    <BadgePro plano={planoPro} compact />
                  </li>
                ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Status do sensor" badge={<StatusDot status={sensor.status} />}>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <div>
            <Row label="Modelo" value={sensor.apelido} />
            <Row label="Firmware" value={sensor.versao_firmware} />
            <Row label="ID do dispositivo" value={sensor.id.slice(0, 8)} />
          </div>
          <div>
            <Row label="Bandeira vigente" value={tarifa.rotulo} />
            <Row label="Sinal" value={<WifiBars dbm={sensor.sinal_wifi_dbm} />} />
            <Row label="Última sincronização" value={haQuantoTempo(sensor.ultimo_contato)} accent />
          </div>
        </div>
        <p className="mt-4 border-t border-line/50 pt-3 text-[10px] uppercase tracking-widest text-muted">
          ⚠ Leituras publicadas pelo simulador do Amperê Node. O hardware físico (ESP32 +
          SCT-013) usa a mesma interface de ingestão — Fase 6.
        </p>
      </Panel>
    </div>
  )
}
