// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Persistência da visão computacional
//
// Nada aqui grava imagem. O que entra no banco é número, rótulo técnico e
// telemetria — nunca o arquivo e nunca dado pessoal.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../../lib/supabase.js'
import { ApiError } from '../../lib/errors.js'
import type { AssinaturaParaCasar } from './sanidade.js'
import { TARIFA_FALLBACK_BRL_KWH } from './sanidade.js'
import type { Bandeira } from './schemas.js'

// ── Telemetria ───────────────────────────────────────────────────────────────

export interface LogExtracao {
  usuario_id: string
  tipo: 'bill' | 'label'
  etapa: 'extracao' | 'confirmacao'
  provider: string
  modelo: string
  latencia_ms: number
  tentativas_extra?: number
  campos_extraidos: Record<string, unknown>
  campos_confirmados?: Record<string, unknown> | null
  campos_corrigidos?: string[]
  campos_comparados?: number
}

/**
 * Grava a linha de telemetria.
 *
 * Falha de telemetria NÃO derruba a requisição: a pessoa está no meio de uma
 * demo, e perder o indicador é menos grave do que perder a leitura da conta.
 * O erro vai para o log do servidor.
 */
export async function registrarExtracao(entrada: LogExtracao): Promise<void> {
  const { error } = await db.from('log_extracao_visao').insert({
    usuario_id: entrada.usuario_id,
    tipo: entrada.tipo,
    etapa: entrada.etapa,
    provider: entrada.provider,
    modelo: entrada.modelo,
    latencia_ms: Math.max(0, Math.round(entrada.latencia_ms)),
    tentativas_extra: entrada.tentativas_extra ?? 0,
    campos_extraidos: entrada.campos_extraidos,
    campos_confirmados: entrada.campos_confirmados ?? null,
    campos_corrigidos: entrada.campos_corrigidos ?? [],
    campos_comparados: entrada.campos_comparados ?? 0,
  })

  if (error) {
    console.warn('[amperê/visão] não foi possível gravar log_extracao_visao:', error.message)
  }
}

// ── Assinaturas NILM (candidatas ao rótulo) ──────────────────────────────────

/** Janela usada para calcular potência média e horário típico das cargas. */
const DIAS_DE_HISTORICO = 30

/**
 * Assinaturas que o NILM já detectou para este usuário, com a potência média e
 * o horário típico observados.
 *
 * Uma consulta só, agregada em memória: são 6 cargas e algumas centenas de
 * eventos por mês — montar uma função SQL nova para isso seria peso sem ganho.
 */
export async function assinaturasNilm(usuarioId: string): Promise<AssinaturaParaCasar[]> {
  const { data: aparelhos, error } = await db
    .from('dim_aparelho')
    .select('id, nome, categoria, potencia_nominal_w')
    .eq('usuario_id', usuarioId)
    .order('potencia_nominal_w', { ascending: false })

  if (error) throw new ApiError(500, 'erro_interno', 'Falha ao ler as assinaturas do NILM')
  if (!aparelhos || aparelhos.length === 0) return []

  const desde = new Date(Date.now() - DIAS_DE_HISTORICO * 24 * 3600_000).toISOString()
  const { data: eventos } = await db
    .from('fato_evento_aparelho')
    .select('aparelho_id, potencia_w, registrado_em')
    .in(
      'aparelho_id',
      aparelhos.map((a) => a.id),
    )
    .eq('tipo_evento', 'ligou')
    .gte('registrado_em', desde)

  const acumulado = new Map<string, { soma: number; n: number; horas: number[] }>()
  for (const e of eventos ?? []) {
    const atual = acumulado.get(e.aparelho_id) ?? { soma: 0, n: 0, horas: Array(24).fill(0) }
    atual.soma += Number(e.potencia_w)
    atual.n += 1
    // Fuso de Brasília: o mesmo deslocamento usado nas agregações do dashboard.
    const hora = new Date(new Date(e.registrado_em).getTime() - 3 * 3600_000).getUTCHours()
    atual.horas[hora] += 1
    acumulado.set(e.aparelho_id, atual)
  }

  return aparelhos.map((a) => {
    const agg = acumulado.get(a.id)
    const media = agg && agg.n > 0 ? agg.soma / agg.n : null
    let horarioTipico: number | null = null
    if (agg) {
      const maior = Math.max(...agg.horas)
      horarioTipico = maior > 0 ? agg.horas.indexOf(maior) : null
    }
    return {
      aparelho_id: a.id,
      nome: a.nome,
      categoria: a.categoria,
      potencia_nominal_w: Number(a.potencia_nominal_w),
      potencia_media_w: media === null ? null : Number(media.toFixed(1)),
      horario_tipico_h: horarioTipico,
    }
  })
}

// ── Fatura ───────────────────────────────────────────────────────────────────

export interface FaturaParaSalvar {
  usuario_id: string
  distribuidora: string | null
  mes_referencia: string
  consumo_kwh: number
  valor_total: number
  tarifa_kwh_sem_tributos: number | null
  tarifa_efetiva: number
  bandeira: Bandeira | null
  leitura_anterior: number | null
  leitura_atual: number | null
  editado_pelo_usuario: boolean
}

export interface FaturaSalva extends FaturaParaSalvar {
  id: string
  origem: string
  created_at: string
}

/**
 * Grava a fatura confirmada.
 *
 * `upsert` na chave (usuario_id, mes_referencia): reescanear o mês corrige a
 * fatura em vez de criar uma segunda — que é o que acontece na demo quando a
 * primeira foto sai tremida.
 */
export async function salvarFatura(fatura: FaturaParaSalvar): Promise<FaturaSalva> {
  const { data, error } = await db
    .from('fato_fatura')
    .upsert(
      { ...fatura, origem: 'visao_computacional' },
      { onConflict: 'usuario_id,mes_referencia' },
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new ApiError(500, 'erro_interno', 'Falha ao gravar a fatura', error?.message)
  }
  return data as FaturaSalva
}

export interface TarifaDaFatura {
  tarifa_brl_kwh: number
  tarifa_estimada: boolean
  fatura: {
    mes_referencia: string
    distribuidora: string | null
    bandeira: Bandeira | null
    consumo_kwh: number
    valor_total: number
    confirmada_em: string
  } | null
}

/**
 * Tarifa que converte kWh em reais.
 *
 * Fatura confirmada manda; sem ela, cai no fallback de R$ 0,85/kWh com
 * `tarifa_estimada = true` — e a tela mostra isso em badge, porque "R$ 48 no
 * chuveiro" com tarifa chutada e com tarifa da conta não são o mesmo número.
 */
export async function tarifaDaFatura(usuarioId: string): Promise<TarifaDaFatura> {
  const { data, error } = await db.rpc('tarifa_da_fatura', { p_usuario: usuarioId })

  const linha = (data as any[] | null)?.[0]
  if (error || !linha) {
    return { tarifa_brl_kwh: TARIFA_FALLBACK_BRL_KWH, tarifa_estimada: true, fatura: null }
  }

  return {
    tarifa_brl_kwh: Number(linha.tarifa_efetiva),
    tarifa_estimada: false,
    fatura: {
      mes_referencia: linha.mes_referencia,
      distribuidora: linha.distribuidora ?? null,
      bandeira: (linha.bandeira ?? null) as Bandeira | null,
      consumo_kwh: Number(linha.consumo_kwh),
      valor_total: Number(linha.valor_total),
      confirmada_em: linha.confirmada_em,
    },
  }
}

// ── Etiqueta → assinatura NILM ───────────────────────────────────────────────

export interface RotuloParaAplicar {
  marca: string | null
  modelo: string | null
  potencia_etiqueta_w: number | null
  tensao_v: number | null
  classe_eficiencia: string | null
  consumo_kwh_mes_procel: number | null
  tipo_aparelho_visao: string
  /** Quando preenchido, renomeia a carga no inventário. */
  nome?: string
}

/**
 * Aplica o rótulo da etiqueta na linha de dim_aparelho — que É a assinatura
 * NILM. O filtro por usuario_id no update é o que impede rotular a carga de
 * outra pessoa com um id adivinhado.
 */
export async function rotularAssinatura(
  usuarioId: string,
  aparelhoId: string,
  rotulo: RotuloParaAplicar,
) {
  const { data, error } = await db
    .from('dim_aparelho')
    .update({ ...rotulo, rotulado_por_visao_em: new Date().toISOString() })
    .eq('id', aparelhoId)
    .eq('usuario_id', usuarioId)
    .select(
      'id, nome, categoria, potencia_nominal_w, marca, modelo, potencia_etiqueta_w, tensao_v, ' +
        'classe_eficiencia, consumo_kwh_mes_procel, tipo_aparelho_visao, rotulado_por_visao_em',
    )
    .maybeSingle()

  if (error) throw new ApiError(500, 'erro_interno', 'Falha ao vincular o rótulo', error.message)
  if (!data) throw new ApiError(404, 'nao_encontrado', 'Assinatura NILM não encontrada')
  return data
}

/** Indicador de acerto acumulado — alimenta o painel e o vídeo. */
export async function taxaDeAcerto(usuarioId?: string) {
  const { data, error } = await db.rpc('taxa_acerto_visao', {
    p_usuario: usuarioId ?? null,
    p_tipo: null,
  })
  if (error) return []
  return (data as any[] | null) ?? []
}
