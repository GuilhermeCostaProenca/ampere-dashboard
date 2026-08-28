import { CATALOGO } from './catalogo.js'
import type { AmostraAgregada, DetectorNILM, EventoDetectado } from './types.js'

/** Degrau mínimo (W) para não confundir ruído de medição com um evento real. */
const LIMIAR_DEGRAU_W = 50

/** Erro relativo máximo aceito ao casar um degrau com uma assinatura. */
const TOLERANCIA = 0.22

export interface Atribuicao {
  chaves: string[]
  confianca: number
}

/**
 * Detector heurístico por degraus de potência.
 *
 * O SCT-013 mede só o agregado da casa. Quando uma carga liga, a potência dá um
 * salto do tamanho dessa carga; quando desliga, cai o mesmo tanto. Casando o
 * tamanho do degrau com a faixa de potência conhecida de cada aparelho dá para
 * atribuir o evento sem sensor por tomada.
 *
 * Cargas que chaveiam na mesma janela de 15 min (ar-condicionado e TV quando
 * alguém chega em casa, por exemplo) produzem UM degrau com a soma das duas.
 * Por isso o casamento testa também pares de assinaturas e emite os dois
 * eventos quando o par explica o degrau nitidamente melhor que uma carga só.
 *
 * Limite conhecido: três ou mais cargas simultâneas, e cargas que ligam no mesmo
 * instante em que outra desliga (degrau de sinais trocados), continuam sem
 * separação. Isso é desagregação de verdade — Fase 6, com modelo treinado.
 */
export class DetectorDegraus implements DetectorNILM {
  readonly nome = 'detector-degraus'
  readonly versao = '1.1.0'

  detectar(amostras: AmostraAgregada[]): EventoDetectado[] {
    if (amostras.length < 2) return []

    const ordenadas = [...amostras].sort(
      (a, b) => Date.parse(a.registrado_em) - Date.parse(b.registrado_em),
    )

    const eventos: EventoDetectado[] = []

    for (let i = 1; i < ordenadas.length; i++) {
      const anterior = ordenadas[i - 1]!
      const atual = ordenadas[i]!
      const delta = atual.potencia_w - anterior.potencia_w
      const magnitude = Math.abs(delta)

      if (magnitude < LIMIAR_DEGRAU_W) continue

      const atribuicao = this.atribuirDegrau(magnitude)
      if (!atribuicao) continue

      for (const chave of atribuicao.chaves) {
        const assinatura = CATALOGO.find((a) => a.chave === chave)!
        eventos.push({
          chave_aparelho: chave,
          tipo_evento: delta > 0 ? 'ligou' : 'desligou',
          // Num degrau composto, cada carga leva a própria potência nominal.
          potencia_w:
            atribuicao.chaves.length === 1
              ? Math.round(magnitude)
              : assinatura.potencia_nominal_w,
          registrado_em: atual.registrado_em,
          confianca: atribuicao.confianca,
        })
      }
    }

    return eventos
  }

  /**
   * Casa a magnitude do degrau com a melhor explicação do catálogo: uma carga
   * só, ou um par de cargas que chavearam juntas.
   */
  atribuirDegrau(magnitude: number): Atribuicao | null {
    const individual = this.melhorIndividual(magnitude)
    const par = this.melhorPar(magnitude)

    // O par só vence se explicar o degrau nitidamente melhor (erro < 40% do
    // erro da carga isolada). Sem essa margem, qualquer degrau viraria dois.
    if (par && (!individual || par.erro < individual.erro * 0.4)) {
      return { chaves: par.chaves, confianca: par.confianca }
    }
    if (individual) return { chaves: [individual.chave], confianca: individual.confianca }
    return null
  }

  private melhorIndividual(magnitude: number) {
    const candidatos = CATALOGO.filter(
      (a) => magnitude >= a.faixa_w[0] && magnitude <= a.faixa_w[1],
    )
    if (candidatos.length === 0) return null

    const escolhido = candidatos.reduce((melhor, a) =>
      Math.abs(magnitude - a.potencia_nominal_w) < Math.abs(magnitude - melhor.potencia_nominal_w)
        ? a
        : melhor,
    )

    const meiaFaixa = Math.max(
      escolhido.potencia_nominal_w - escolhido.faixa_w[0],
      escolhido.faixa_w[1] - escolhido.potencia_nominal_w,
      1,
    )
    const erro = Math.abs(magnitude - escolhido.potencia_nominal_w)
    const bruta = 1 - (erro / meiaFaixa) * 0.55
    const penalidade = candidatos.length > 1 ? 0.12 * (candidatos.length - 1) : 0

    return {
      chave: escolhido.chave,
      erro,
      confianca: Number(Math.min(0.99, Math.max(0.4, bruta - penalidade)).toFixed(3)),
    }
  }

  private melhorPar(magnitude: number) {
    let melhor: { chaves: string[]; erro: number; confianca: number } | null = null

    for (let i = 0; i < CATALOGO.length; i++) {
      for (let j = i + 1; j < CATALOGO.length; j++) {
        const a = CATALOGO[i]!
        const b = CATALOGO[j]!
        const soma = a.potencia_nominal_w + b.potencia_nominal_w
        const erro = Math.abs(magnitude - soma)
        if (erro / soma > TOLERANCIA) continue
        if (melhor && erro >= melhor.erro) continue

        // Um par é sempre mais especulativo que uma carga isolada.
        const confianca = Number(
          Math.min(0.92, Math.max(0.4, 0.92 - (erro / soma) * 2)).toFixed(3),
        )
        melhor = { chaves: [a.chave, b.chave], erro, confianca }
      }
    }
    return melhor
  }
}
