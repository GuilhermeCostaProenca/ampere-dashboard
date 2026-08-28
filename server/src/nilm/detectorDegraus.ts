import { CATALOGO } from './catalogo.js'
import type { AmostraAgregada, DetectorNILM, EventoDetectado } from './types.js'

/** Degrau mínimo (W) para não confundir ruído de medição com um evento real. */
const LIMIAR_DEGRAU_W = 50

/**
 * Detector heurístico por degraus de potência.
 *
 * Ideia: o SCT-013 mede só o agregado da casa. Quando uma carga liga, a
 * potência agregada dá um salto do tamanho da potência dessa carga; quando
 * desliga, cai o mesmo tanto. Comparando amostras consecutivas e casando o
 * tamanho do degrau com a faixa de potência conhecida de cada aparelho,
 * dá para atribuir o evento sem sensor por tomada.
 *
 * Limite conhecido: degraus simultâneos (duas cargas ligando na mesma janela
 * de 15 min) viram um degrau só e são atribuídos a um aparelho apenas. Resolver
 * isso exige desagregação por modelo — Fase 6.
 */
export class DetectorDegraus implements DetectorNILM {
  readonly nome = 'detector-degraus'
  readonly versao = '1.0.0'

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

      eventos.push({
        chave_aparelho: atribuicao.chave,
        tipo_evento: delta > 0 ? 'ligou' : 'desligou',
        potencia_w: Math.round(magnitude),
        registrado_em: atual.registrado_em,
        confianca: atribuicao.confianca,
      })
    }

    return eventos
  }

  /** Casa a magnitude do degrau com a assinatura mais próxima do catálogo. */
  atribuirDegrau(magnitude: number): { chave: string; confianca: number } | null {
    const candidatos = CATALOGO.filter(
      (a) => magnitude >= a.faixa_w[0] && magnitude <= a.faixa_w[1],
    )
    if (candidatos.length === 0) return null

    // Mais próximo da potência nominal vence.
    const escolhido = candidatos.reduce((melhor, a) =>
      Math.abs(magnitude - a.potencia_nominal_w) < Math.abs(magnitude - melhor.potencia_nominal_w)
        ? a
        : melhor,
    )

    // Confiança cai conforme o degrau se afasta do nominal dentro da faixa.
    const meiaFaixa = Math.max(
      escolhido.potencia_nominal_w - escolhido.faixa_w[0],
      escolhido.faixa_w[1] - escolhido.potencia_nominal_w,
      1,
    )
    const desvio = Math.abs(magnitude - escolhido.potencia_nominal_w) / meiaFaixa
    const bruta = 1 - desvio * 0.55
    // Ambiguidade entre assinaturas sobrepostas reduz a confiança.
    const penalidade = candidatos.length > 1 ? 0.12 * (candidatos.length - 1) : 0
    const confianca = Math.min(0.99, Math.max(0.4, bruta - penalidade))

    return { chave: escolhido.chave, confianca: Number(confianca.toFixed(3)) }
  }
}
