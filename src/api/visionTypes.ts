// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Tipos da visão computacional
// Espelham server/src/services/vision/schemas.ts e as respostas de
// server/src/routes/vision.routes.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type BandeiraFatura =
  | 'verde'
  | 'amarela'
  | 'vermelha_1'
  | 'vermelha_2'
  | 'escassez_hidrica'

export type TipoAparelhoVisao =
  | 'geladeira'
  | 'chuveiro'
  | 'ar_condicionado'
  | 'micro_ondas'
  | 'maquina_lavar'
  | 'tv'
  | 'airfryer'
  | 'ferro'
  | 'outro'

export type ClasseEficiencia = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

/** Confiança 0–1 por campo, do jeito que o modelo devolveu. */
export type Confianca = Record<string, number | undefined>

export interface Aviso {
  campo: string
  codigo: string
  mensagem: string
}

export interface MetaExtracao {
  provider: string
  modelo: string
  latencia_ms: number
  tentativas: number
  imagem: { largura: number; altura: number; kb: number; preparo_ms: number }
}

// ── Fatura ───────────────────────────────────────────────────────────────────

export interface CamposFatura {
  distribuidora: string | null
  mes_referencia: string | null
  consumo_kwh: number | null
  valor_total: number | null
  tarifa_kwh_sem_tributos: number | null
  bandeira: BandeiraFatura | null
  leitura_anterior: number | null
  leitura_atual: number | null
}

export interface ExtracaoFatura extends CamposFatura {
  confianca: Confianca
}

export interface RespostaFatura {
  extracao: ExtracaoFatura
  tarifa_efetiva: number | null
  warnings: Aviso[]
  meta: MetaExtracao
}

export interface Acerto {
  campos_comparados: number
  campos_corrigidos: string[]
  taxa_acerto_pct: number | null
}

export interface FaturaConfirmada {
  fatura: {
    id: string
    mes_referencia: string
    distribuidora: string | null
    consumo_kwh: number
    valor_total: number
    tarifa_efetiva: number
    bandeira: BandeiraFatura | null
    editado_pelo_usuario: boolean
  }
  acerto: Acerto
}

// ── Etiqueta ─────────────────────────────────────────────────────────────────

export interface CamposEtiqueta {
  tipo_aparelho: TipoAparelhoVisao
  marca: string | null
  modelo: string | null
  potencia_w: number | null
  tensao_v: number | null
  consumo_kwh_mes_procel: number | null
  classe_eficiencia: ClasseEficiencia | null
}

export interface ExtracaoEtiqueta extends CamposEtiqueta {
  confianca: Confianca
}

export interface AssinaturaNilm {
  aparelho_id: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  potencia_media_w: number | null
  horario_tipico_h: number | null
}

export interface AssinaturaCandidata extends AssinaturaNilm {
  divergencia_pct: number
}

export interface RespostaEtiqueta {
  extracao: ExtracaoEtiqueta
  assinaturas_candidatas: AssinaturaCandidata[]
  assinaturas: AssinaturaNilm[]
  warnings: Aviso[]
  meta: MetaExtracao
}

export interface EtiquetaConfirmada {
  aparelho: {
    id: string
    nome: string
    marca: string | null
    modelo: string | null
  }
  acerto: Acerto
}

// ── Custo em reais ───────────────────────────────────────────────────────────

export interface FonteTarifa {
  mes_referencia: string
  distribuidora: string | null
  bandeira: BandeiraFatura | null
  consumo_kwh: number
  valor_total: number
  confirmada_em: string
}

export interface AparelhoEmReais {
  id: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  energia_mes_kwh: number
  energia_acumulada_kwh: number
  custo_mes_brl: number
  custo_acumulado_brl: number
  horas_ativas_mes: number
}

export interface CustoPorAparelho {
  tarifa_brl_kwh: number
  /** true = fallback de R$ 0,85/kWh; false = tarifa da conta escaneada. */
  tarifa_estimada: boolean
  fonte_tarifa: FonteTarifa | null
  total_mes_brl: number
  total_mes_kwh: number
  aparelhos: AparelhoEmReais[]
}

// ── Rótulos para a interface ─────────────────────────────────────────────────

export const ROTULO_BANDEIRA: Record<BandeiraFatura, string> = {
  verde: 'Verde',
  amarela: 'Amarela',
  vermelha_1: 'Vermelha — patamar 1',
  vermelha_2: 'Vermelha — patamar 2',
  escassez_hidrica: 'Escassez hídrica',
}

export const ROTULO_TIPO: Record<TipoAparelhoVisao, string> = {
  geladeira: 'Geladeira',
  chuveiro: 'Chuveiro',
  ar_condicionado: 'Ar-condicionado',
  micro_ondas: 'Micro-ondas',
  maquina_lavar: 'Máquina de lavar',
  tv: 'TV',
  airfryer: 'Air fryer',
  ferro: 'Ferro de passar',
  outro: 'Outro',
}
