// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Contratos da camada NILM
// Fronteira estável entre "como detectamos" e "o resto do sistema".
// A Fase 6 troca a implementação (modelo de ML) sem alterar estas interfaces.
// ─────────────────────────────────────────────────────────────────────────────

/** Uma amostra da leitura agregada da casa (o que o SCT-013 mede). */
export interface AmostraAgregada {
  registrado_em: string // ISO 8601
  potencia_w: number
}

/** Assinatura conhecida de um tipo de carga. */
export interface AssinaturaAparelho {
  chave: string
  nome: string
  categoria: string
  potencia_nominal_w: number
  /** Faixa [mín, máx] de degrau de potência aceita como este aparelho. */
  faixa_w: [number, number]
}

/** Degrau de potência atribuído a um aparelho. */
export interface EventoDetectado {
  chave_aparelho: string
  tipo_evento: 'ligou' | 'desligou'
  potencia_w: number
  registrado_em: string
  confianca: number // 0..1
}

/**
 * Detector NILM. Recebe a série agregada e devolve os eventos liga/desliga.
 * Implementação atual: heurística de degraus (CP5).
 * Implementação futura: modelo treinado (Fase 6) — mesma interface.
 */
export interface DetectorNILM {
  readonly nome: string
  readonly versao: string
  detectar(amostras: AmostraAgregada[]): EventoDetectado[]
}
