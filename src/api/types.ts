// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Tipos da API
// Espelham as respostas do back-end (server/src/routes) e, por consequência,
// o Star Schema em supabase/migrations. Fonte única de tipos do front.
// ─────────────────────────────────────────────────────────────────────────────

export type StatusAparelho = 'on' | 'off' | 'no-signal'
export type CorBandeira = 'verde' | 'amarela' | 'vermelha_1' | 'vermelha_2'
export type TipoAlerta = 'over-average' | 'no-signal' | 'achievement'

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo_imovel: 'apartamento' | 'casa'
  plano: 'free' | 'pro'
  criado_em?: string
}

export interface Bandeira {
  cor: CorBandeira
  rotulo: string
  adicional_por_kwh: number
  tarifa_kwh: number
  concessionaria: string
}

export interface PontoSerie {
  hora: string // "00h" … "23h"
  watts: number
}

export interface TopAparelho {
  id: string
  nome: string
  categoria: string
  custo_brl: number
  potencia_atual_w: number
  status: StatusAparelho
}

export interface ResumoDashboard {
  gasto_mes: { valor_brl: number; acumulado_brl: number; variacao_pct: number }
  consumo_agora_w: number
  ultima_leitura_em: string | null
  hoje: { gasto_brl: number; energia_kwh: number; horas_ativas: number }
  top_aparelhos: TopAparelho[]
  bandeira: Bandeira
  serie_24h: PontoSerie[]
}

export interface Aparelho {
  id: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  status: StatusAparelho
  potencia_atual_w: number
  custo_mes_brl: number
  energia_mes_kwh: number
  horas_ativas_mes: number
  media_categoria_brl: number
}

export interface ListaAparelhos {
  aparelhos: Aparelho[]
  total_ativo_w: number
  ligados: number
}

export interface Roi {
  sugestao: string
  economia_mensal_brl: number
  payback_meses: number
}

export interface PlanoResumo {
  nome: string
  preco_mensal: number
}

export interface DetalheAparelho {
  aparelho: Aparelho & { identificado_em: string }
  serie_24h: PontoSerie[]
  roi: Roi | null
  /** true quando existe recomendação, mas o plano do usuário não libera. */
  roi_bloqueado: boolean
  plano_requerido: PlanoResumo | null
}

export interface Alerta {
  id: string
  tipo: TipoAlerta
  titulo: string
  detalhe: string
  em: string | null
  ha: string
  aparelho_id?: string
}

export interface ListaAlertas {
  alertas: Alerta[]
  total: number
}

export interface FatiaRelatorio {
  nome: string
  custo_brl: number
}

export interface PontoHistorico {
  rotulo: string
  ano: number
  mes: number
  custo_brl: number
  energia_kwh: number
}

export interface EconomiaAcumulada {
  valor_brl: number
  variacao_pct: number
  media_meses_anteriores_brl: number
  meses_comparados: number
}

export interface RelatorioMensal {
  periodo: { inicio: string; fim: string; rotulo: string }
  total_brl: number
  total_kwh: number
  projecao_brl: number
  tarifa_media_brl_kwh: number
  distribuicao: FatiaRelatorio[]
  historico: PontoHistorico[]
  economia_acumulada: EconomiaAcumulada
  bandeira: Bandeira
  dica: string
}

export interface Plano {
  id: string
  nome: string
  preco_mensal: number
  recursos: string[]
}

export interface Sensor {
  id: string
  apelido: string
  status: 'online' | 'offline'
  versao_firmware: string
  sinal_wifi_dbm: number | null
  ultimo_contato: string | null
  minutos_sem_contato: number | null
}

export interface Configuracoes {
  usuario: Usuario
  plano_ativo: Plano | null
  planos: Plano[]
  sensor: Sensor
  tarifa: Bandeira
}

export interface Sessao {
  token: string
  expira_em: number | null
  usuario: Usuario
}

/** Erro normalizado devolvido pela API. */
export class ErroApi extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
    public detalhes?: unknown,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}
