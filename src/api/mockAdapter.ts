// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Adaptador do modo mock
//
// Converte src/data/mock.ts para o MESMO formato devolvido pela API real.
// Ativado por VITE_USE_MOCK=true. Serve para desenvolver a interface sem o
// back-end no ar (e para a apresentação rodar mesmo se a nuvem cair).
// ─────────────────────────────────────────────────────────────────────────────

import {
  alerts,
  dashboard as painel,
  devices,
  monthlyHistory,
  monthlyReport,
  sensor,
  tariffFlag,
  totalActiveWatts,
  user,
} from '../data/mock'
import type {
  Aparelho,
  Bandeira,
  Configuracoes,
  DetalheAparelho,
  ListaAlertas,
  ListaAparelhos,
  RelatorioMensal,
  ResumoDashboard,
  Sessao,
} from './types'

const CATEGORIA: Record<string, string> = {
  'ar-condicionado': 'Climatização',
  chuveiro: 'Aquecimento',
  geladeira: 'Refrigeração',
  'maquina-lavar': 'Lavanderia',
  'tv-eletronicos': 'Eletrônicos',
  iluminacao: 'Iluminação',
}

const bandeira = (): Bandeira => ({
  cor: tariffFlag.color.replace('-', '_') as Bandeira['cor'],
  rotulo: tariffFlag.label,
  adicional_por_kwh: tariffFlag.extraPerKwh,
  tarifa_kwh: 0.85,
  concessionaria: 'Enel SP',
})

const paraAparelho = (d: (typeof devices)[number]): Aparelho => ({
  id: d.id,
  nome: d.name,
  categoria: CATEGORIA[d.id] ?? 'Outros',
  potencia_nominal_w: d.currentWatts || 100,
  status: d.status,
  potencia_atual_w: d.currentWatts,
  custo_mes_brl: d.monthCostBRL,
  energia_mes_kwh: Number((d.monthCostBRL / 0.86885).toFixed(2)),
  horas_ativas_mes: Number((d.hoursTodayActive * 30).toFixed(1)),
  media_categoria_brl: d.avgCategoryCostBRL,
})

export const sessao = (): Sessao => ({
  token: 'mock',
  expira_em: null,
  usuario: {
    id: 'mock-user',
    nome: user.name,
    email: user.email,
    tipo_imovel: 'apartamento',
    plano: user.plan === 'Pro' ? 'pro' : 'free',
  },
})

export async function dashboard(): Promise<ResumoDashboard> {
  const top = [...devices].sort((a, b) => b.monthCostBRL - a.monthCostBRL).slice(0, 3)
  return {
    gasto_mes: {
      valor_brl: painel.monthEstimateBRL,
      acumulado_brl: Number((painel.monthEstimateBRL * 0.87).toFixed(2)),
      variacao_pct: painel.monthDeltaPct,
    },
    consumo_agora_w: painel.nowWatts,
    ultima_leitura_em: new Date().toISOString(),
    hoje: {
      gasto_brl: painel.todayCostBRL,
      energia_kwh: Number((painel.todayCostBRL / 0.86885).toFixed(2)),
      horas_ativas: painel.todayActiveHours,
    },
    top_aparelhos: top.map((d) => ({
      id: d.id,
      nome: d.name,
      categoria: CATEGORIA[d.id] ?? 'Outros',
      custo_brl: d.monthCostBRL,
      potencia_atual_w: d.currentWatts,
      status: d.status,
    })),
    bandeira: bandeira(),
    serie_24h: painel.house24h.map((p) => ({ hora: p.hour, watts: p.watts })),
  }
}

export async function aparelhos(): Promise<ListaAparelhos> {
  return {
    aparelhos: devices.map(paraAparelho),
    total_ativo_w: totalActiveWatts,
    ligados: devices.filter((d) => d.status === 'on').length,
  }
}

export async function aparelho(id: string): Promise<DetalheAparelho> {
  const d = devices.find((x) => x.id === id)
  if (!d) throw new Error('Aparelho não encontrado no inventário')

  const ehPro = user.plan === 'Pro'
  const roi = d.roi
    ? {
        sugestao: d.roi.suggestion,
        economia_mensal_brl: d.roi.monthlySavingBRL,
        payback_meses: d.roi.paybackMonths,
      }
    : null

  return {
    aparelho: { ...paraAparelho(d), identificado_em: new Date().toISOString() },
    serie_24h: d.series24h.map((p) => ({ hora: p.hour, watts: p.watts })),
    roi: ehPro ? roi : null,
    roi_bloqueado: !ehPro && roi !== null,
    plano_requerido: ehPro ? null : { nome: 'Pro', preco_mensal: 19.9 },
  }
}

export async function alertas(): Promise<ListaAlertas> {
  return {
    alertas: alerts.map((a) => ({
      id: a.id,
      tipo: a.kind,
      titulo: a.title,
      detalhe: a.detail,
      em: null,
      ha: a.timeAgo,
    })),
    total: alerts.length,
  }
}

export async function relatorio(): Promise<RelatorioMensal> {
  const anteriores = monthlyHistory.slice(0, -1)
  const media = anteriores.reduce((a, m) => a + m.costBRL, 0) / Math.max(1, anteriores.length)
  const economia = media - monthlyReport.totalBRL

  return {
    periodo: { inicio: '', fim: '', rotulo: monthlyHistory.at(-1)?.month ?? '' },
    total_brl: monthlyReport.totalBRL,
    total_kwh: monthlyReport.totalKwh,
    projecao_brl: monthlyReport.totalBRL,
    tarifa_media_brl_kwh: Number((monthlyReport.totalBRL / monthlyReport.totalKwh).toFixed(4)),
    distribuicao: monthlyReport.slices.map((s) => ({ nome: s.name, custo_brl: s.costBRL })),
    historico: monthlyHistory.map((m, i) => ({
      rotulo: m.month,
      ano: 2026,
      mes: i + 1,
      custo_brl: m.costBRL,
      energia_kwh: Number((m.costBRL / 0.86885).toFixed(2)),
    })),
    economia_acumulada: {
      valor_brl: Number(economia.toFixed(2)),
      variacao_pct: Number(((economia / media) * 100).toFixed(1)),
      media_meses_anteriores_brl: Number(media.toFixed(2)),
      meses_comparados: anteriores.length,
    },
    bandeira: bandeira(),
    dica: monthlyReport.tip,
  }
}

export async function configuracoes(): Promise<Configuracoes> {
  const planos = [
    {
      id: 'free',
      nome: 'Free',
      preco_mensal: 0,
      recursos: [
        'Identificação de aparelhos por NILM',
        'Custos em R$ (não em kWh)',
        'Dashboard e alertas em tempo real',
      ],
    },
    {
      id: 'pro',
      nome: 'Pro',
      preco_mensal: 19.9,
      recursos: [
        'Tudo do plano Free',
        'Recomendações de ROI por aparelho',
        'Detalhe individual de cada aparelho',
      ],
    },
  ]

  return {
    usuario: sessao().usuario,
    plano_ativo: planos.find((p) => p.nome.toLowerCase() === (user.plan === 'Pro' ? 'pro' : 'free'))!,
    planos,
    sensor: {
      id: 'mock-sensor',
      apelido: sensor.model,
      status: sensor.status,
      versao_firmware: sensor.firmware,
      sinal_wifi_dbm: sensor.wifiSignal,
      ultimo_contato: new Date().toISOString(),
      minutos_sem_contato: 0.2,
    },
    tarifa: bandeira(),
  }
}
