// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — MOCK DATA LAYER
// Todos os dados desta tela são SIMULADOS (leituras NILM fictícias).
// Esta camada isola o front-end da fonte de dados. Na Fase 5 (Cloud), basta
// trocar os exports por chamadas a uma API/banco mantendo os mesmos tipos.
// ─────────────────────────────────────────────────────────────────────────────

export type FlagColor = 'verde' | 'amarela' | 'vermelha-1' | 'vermelha-2'

export interface TariffFlag {
  color: FlagColor
  label: string
  extraPerKwh: number // R$ adicional por kWh
}

export interface DeviceReading {
  hour: string // "00h" .. "23h"
  watts: number
}

export interface Device {
  id: string
  name: string
  icon: string // emoji simples como placeholder de ícone
  status: 'on' | 'off' | 'no-signal'
  currentWatts: number
  monthCostBRL: number
  avgCategoryCostBRL: number // média da categoria p/ comparação
  hoursTodayActive: number
  series24h: DeviceReading[]
  roi?: {
    suggestion: string
    monthlySavingBRL: number
    paybackMonths: number
  }
}

export interface AlertItem {
  id: string
  kind: 'over-average' | 'no-signal' | 'achievement'
  title: string
  detail: string
  timeAgo: string
}

export interface ReportSlice {
  name: string
  costBRL: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const WATTS = (v: number) =>
  `${v.toLocaleString('pt-BR')} W`

// gera uma curva de 24h plausível em torno de uma base
function curve(base: number, peakHours: number[], peakBoost: number, noise = 0.12): DeviceReading[] {
  return Array.from({ length: 24 }, (_, h) => {
    const isPeak = peakHours.includes(h)
    const wobble = 1 + (((h * 9301 + 49297) % 233) / 233 - 0.5) * noise
    const watts = Math.max(0, Math.round((base + (isPeak ? peakBoost : 0)) * wobble))
    return { hour: `${String(h).padStart(2, '0')}h`, watts }
  })
}

// ── Estado geral / Dashboard ───────────────────────────────────────────────────

export const tariffFlag: TariffFlag = {
  color: 'vermelha-1',
  label: 'VERMELHA P1',
  extraPerKwh: 0.0445,
}

export const dashboard = {
  monthEstimateBRL: 187,
  monthDeltaPct: 12, // +12% vs mês anterior
  nowWatts: 1340,
  todayCostBRL: 7.2,
  todayActiveHours: 6.2,
  // uso agregado da casa nas últimas 24h (estilo osciloscópio)
  house24h: curve(380, [7, 8, 18, 19, 20, 21], 1100, 0.18),
}

// ── Aparelhos ──────────────────────────────────────────────────────────────────

export const devices: Device[] = [
  {
    id: 'ar-condicionado',
    name: 'Ar-condicionado',
    icon: '❄️',
    status: 'on',
    currentWatts: 920,
    monthCostBRL: 89,
    avgCategoryCostBRL: 76,
    hoursTodayActive: 4.1,
    series24h: curve(120, [13, 14, 15, 20, 21, 22], 980, 0.1),
    roi: {
      suggestion: 'Trocar por modelo Inverter 1 ton (Selo A)',
      monthlySavingBRL: 31,
      paybackMonths: 14,
    },
  },
  {
    id: 'chuveiro',
    name: 'Chuveiro',
    icon: '🚿',
    status: 'on',
    currentWatts: 4200,
    monthCostBRL: 42,
    avgCategoryCostBRL: 38,
    hoursTodayActive: 0.8,
    series24h: curve(0, [6, 7, 19, 20], 5400, 0.05),
    roi: {
      suggestion: 'Reduzir tempo de banho em 3 min/dia',
      monthlySavingBRL: 11,
      paybackMonths: 0,
    },
  },
  {
    id: 'geladeira',
    name: 'Geladeira',
    icon: '🧊',
    status: 'no-signal',
    currentWatts: 0,
    monthCostBRL: 23,
    avgCategoryCostBRL: 21,
    hoursTodayActive: 22.0,
    series24h: curve(90, [12, 13, 22, 23], 60, 0.25),
    roi: {
      suggestion: 'Regular borracha de vedação da porta',
      monthlySavingBRL: 6,
      paybackMonths: 1,
    },
  },
  {
    id: 'maquina-lavar',
    name: 'Máquina de lavar',
    icon: '🌀',
    status: 'off',
    currentWatts: 0,
    monthCostBRL: 14,
    avgCategoryCostBRL: 16,
    hoursTodayActive: 0.0,
    series24h: curve(0, [10, 11, 16], 480, 0.08),
  },
  {
    id: 'tv-eletronicos',
    name: 'TV + eletrônicos',
    icon: '📺',
    status: 'on',
    currentWatts: 180,
    monthCostBRL: 12,
    avgCategoryCostBRL: 13,
    hoursTodayActive: 3.4,
    series24h: curve(40, [19, 20, 21, 22, 23], 200, 0.15),
  },
  {
    id: 'iluminacao',
    name: 'Iluminação',
    icon: '💡',
    status: 'on',
    currentWatts: 140,
    monthCostBRL: 7,
    avgCategoryCostBRL: 9,
    hoursTodayActive: 5.5,
    series24h: curve(20, [18, 19, 20, 21, 22], 160, 0.2),
  },
]

export const getDevice = (id: string) => devices.find((d) => d.id === id)

// Top aparelhos por gasto (ranking)
export const topDevices = [...devices]
  .sort((a, b) => b.monthCostBRL - a.monthCostBRL)
  .slice(0, 3)

// ── Alertas ──────────────────────────────────────────────────────────────────

export const alerts: AlertItem[] = [
  {
    id: 'a1',
    kind: 'over-average',
    title: 'Chuveiro ligado há 45 min',
    detail: 'Custo acumulado R$2,10 — acima da média diária para este aparelho.',
    timeAgo: 'agora',
  },
  {
    id: 'a2',
    kind: 'no-signal',
    title: 'Geladeira sem leitura há 2h',
    detail: 'O NILM não detecta a assinatura deste aparelho. Verifique a conexão do sensor.',
    timeAgo: 'há 2h',
  },
  {
    id: 'a3',
    kind: 'over-average',
    title: 'Ar-condicionado 17% acima da média',
    detail: 'Consumo do mês acima do histórico. Temperatura sugerida: 23°C.',
    timeAgo: 'há 5h',
  },
  {
    id: 'a4',
    kind: 'achievement',
    title: 'Redução conquistada: -8% na lavanderia',
    detail: 'Máquina de lavar abaixo da média neste mês. Continue assim! 🎯',
    timeAgo: 'ontem',
  },
]

// ── Relatório mensal ───────────────────────────────────────────────────────────

export const monthlyReport = {
  totalBRL: 312,
  totalKwh: 210,
  flag: tariffFlag,
  slices: [
    { name: 'Ar-condicionado', costBRL: 145 },
    { name: 'Chuveiro', costBRL: 72 },
    { name: 'Geladeira', costBRL: 44 },
    { name: 'Outros', costBRL: 51 },
  ] as ReportSlice[],
  tip: 'Concentre o uso do ar-condicionado fora dos horários de pico (18h–21h). Em bandeira vermelha, isso pode economizar até R$18 no próximo ciclo.',
}

// Histórico dos últimos 6 meses (R$) — para o painel de tendência do relatório
export const monthlyHistory: { month: string; costBRL: number }[] = [
  { month: 'JAN', costBRL: 268 },
  { month: 'FEV', costBRL: 245 },
  { month: 'MAR', costBRL: 291 },
  { month: 'ABR', costBRL: 277 },
  { month: 'MAI', costBRL: 298 },
  { month: 'JUN', costBRL: 312 },
]

// Soma das potências ativas no momento (derivado dos aparelhos)
export const totalActiveWatts = devices
  .filter((d) => d.status === 'on')
  .reduce((acc, d) => acc + d.currentWatts, 0)

// ── Usuário / Configurações ────────────────────────────────────────────────────

export const user = {
  name: 'Guilherme Proença',
  email: 'guilherme.proenca134@gmail.com',
  plan: 'Free' as 'Free' | 'Pro',
  home: 'Residência • São Paulo / SP',
  distributor: 'Enel SP',
}

export const sensor = {
  model: 'Amperê Node v1 (ESP32 + SCT-013-030)',
  status: 'online' as 'online' | 'offline',
  firmware: 'fw 1.4.2',
  wifiSignal: -54, // dBm
  wifiSsid: 'CASA_5G',
  lastSync: 'há 12 s',
  uptimeDays: 38,
}
