// ─────────────────────────────────────────────────────────────────────────────
// Recomendacoes de ROI por categoria de carga.
// Percentuais de economia e payback vindos das referencias usadas nas fases
// anteriores (PROCEL / selo A). Recurso do plano Pro.
// ─────────────────────────────────────────────────────────────────────────────

interface RegraRoi {
  sugestao: string
  fracao_economia: number // % do custo mensal daquele aparelho
  payback_meses: number
}

const REGRAS: Record<string, RegraRoi> = {
  'Climatizacao': {
    sugestao: 'Trocar por modelo Inverter 1 ton (Selo A)',
    fracao_economia: 0.35,
    payback_meses: 14,
  },
  'Climatização': {
    sugestao: 'Trocar por modelo Inverter 1 ton (Selo A)',
    fracao_economia: 0.35,
    payback_meses: 14,
  },
  'Aquecimento': {
    sugestao: 'Reduzir tempo de banho em 3 min/dia',
    fracao_economia: 0.26,
    payback_meses: 0,
  },
  'Refrigeracao': {
    sugestao: 'Regular borracha de vedacao da porta',
    fracao_economia: 0.25,
    payback_meses: 1,
  },
  'Refrigeração': {
    sugestao: 'Regular borracha de vedação da porta',
    fracao_economia: 0.25,
    payback_meses: 1,
  },
  'Lavanderia': {
    sugestao: 'Concentrar cargas cheias e usar agua fria',
    fracao_economia: 0.2,
    payback_meses: 0,
  },
  'Eletronicos': {
    sugestao: 'Cortar consumo em standby com regua chaveada',
    fracao_economia: 0.15,
    payback_meses: 2,
  },
  'Eletrônicos': {
    sugestao: 'Cortar consumo em standby com régua chaveada',
    fracao_economia: 0.15,
    payback_meses: 2,
  },
  'Iluminacao': {
    sugestao: 'Substituir pontos restantes por LED',
    fracao_economia: 0.3,
    payback_meses: 4,
  },
  'Iluminação': {
    sugestao: 'Substituir pontos restantes por LED',
    fracao_economia: 0.3,
    payback_meses: 4,
  },
}

export function calcularRoi(categoria: string, custoMensalBrl: number) {
  const regra = REGRAS[categoria]
  if (!regra || custoMensalBrl <= 0) return null
  return {
    sugestao: regra.sugestao,
    economia_mensal_brl: Number((custoMensalBrl * regra.fracao_economia).toFixed(2)),
    payback_meses: regra.payback_meses,
  }
}
