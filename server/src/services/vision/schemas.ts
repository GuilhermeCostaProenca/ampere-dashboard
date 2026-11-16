// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Contratos de extração da visão computacional
//
// O modelo multimodal devolve JSON. Aqui ele é validado e NORMALIZADO antes de
// chegar em qualquer outro lugar do sistema: número em formato brasileiro
// ("1.234,56"), mês como "11/2025", bandeira escrita por extenso. Tudo isso
// sai do modelo de um jeito e entra no banco de um só.
//
// LGPD: nenhum campo deste contrato guarda dado pessoal. Nome, CPF, endereço e
// número de instalação/cliente NÃO são extraídos (ver prompts.ts) e, se vierem
// na resposta do modelo, o `.strip()` do zod os descarta aqui.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// ── Normalizadores ───────────────────────────────────────────────────────────

/**
 * Número em qualquer formato que o modelo possa devolver.
 *
 * "1.234,56" (pt-BR), "1234.56" (en-US), "R$ 287,43", 287.43 ou null.
 *
 * O caso difícil é UM separador só: "4.113" é 4113 numa leitura de medidor e
 * 4,113 num número inglês. As duas regras que decidem:
 *
 *   • Dois separadores DIFERENTES ("1.234,56") → o último é o decimal, sem
 *     ambiguidade nenhuma.
 *   • Um tipo só → é milhar quando sobram exatamente 3 dígitos depois dele e a
 *     parte inteira não é "0": "4.113" → 4113, mas "0,862" → 0.862, porque
 *     ninguém escreve zero como grupo de milhar.
 *
 * Resta um caso que nenhuma heurística resolve: "1,234" pode ser 1234 ou
 * 1,234. Fica como 1234 (milhar), que é o uso numa conta brasileira — e, se
 * cair numa tarifa, o sanity check acusa o valor fora de faixa e o campo está
 * editável na tela.
 */
export function numeroFlexivel(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor !== 'string') return null

  const limpo = valor.replace(/[^\d.,-]/g, '').trim()
  if (!limpo || limpo === '-') return null

  const ultimaVirgula = limpo.lastIndexOf(',')
  const ultimoPonto = limpo.lastIndexOf('.')
  const posicao = Math.max(ultimaVirgula, ultimoPonto)

  let normalizado: string
  if (posicao === -1) {
    normalizado = limpo
  } else {
    const doisTipos = ultimaVirgula !== -1 && ultimoPonto !== -1
    const digitosDepois = limpo.length - posicao - 1
    const parteInteira = limpo.slice(0, posicao).replace(/[.,-]/g, '')
    const ehMilhar = !doisTipos && digitosDepois === 3 && parteInteira !== '' && parteInteira !== '0'

    normalizado = ehMilhar
      ? limpo.replace(/[.,]/g, '')
      : limpo.slice(0, posicao).replace(/[.,]/g, '') + '.' + limpo.slice(posicao + 1)
    if (limpo.startsWith('-')) normalizado = '-' + normalizado.replace(/-/g, '')
  }

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

/** "11/2025", "2025-11", "nov/2025" → "2025-11". */
export function mesReferenciaFlexivel(valor: unknown): string | null {
  if (typeof valor === 'number') return null
  if (typeof valor !== 'string' || !valor.trim()) return null
  const texto = valor.trim().toLowerCase()

  const iso = texto.match(/^(\d{4})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}`

  const barra = texto.match(/^(\d{1,2})[/\-.](\d{4})$/)
  if (barra) return `${barra[2]}-${String(Number(barra[1])).padStart(2, '0')}`

  const MESES: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  }
  const extenso = texto.match(/([a-zç]{3})[a-zç]*[/\s.\-]+(\d{4})/)
  if (extenso) {
    const mes = MESES[extenso[1]]
    if (mes) return `${extenso[2]}-${String(mes).padStart(2, '0')}`
  }
  return null
}

export const BANDEIRAS = [
  'verde',
  'amarela',
  'vermelha_1',
  'vermelha_2',
  'escassez_hidrica',
] as const
export type Bandeira = (typeof BANDEIRAS)[number]

/** "Vermelha - Patamar 1", "bandeira verde", "escassez hídrica" → chave. */
export function bandeiraFlexivel(valor: unknown): Bandeira | null {
  if (typeof valor !== 'string' || !valor.trim()) return null
  const t = valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  if (t.includes('escassez')) return 'escassez_hidrica'
  if (t.includes('verde')) return 'verde'
  if (t.includes('amarel')) return 'amarela'
  if (t.includes('vermelh')) {
    // Patamar 2 só quando dito; o padrão da vermelha é o patamar 1.
    return /(^|[^\d])2([^\d]|$)|patamar\s*2|p2/.test(t) ? 'vermelha_2' : 'vermelha_1'
  }
  return null
}

export const TIPOS_APARELHO = [
  'geladeira',
  'chuveiro',
  'ar_condicionado',
  'micro_ondas',
  'maquina_lavar',
  'tv',
  'airfryer',
  'ferro',
  'outro',
] as const
export type TipoAparelho = (typeof TIPOS_APARELHO)[number]

/** "Ar Condicionado Split", "freezer/refrigerador", "micro-ondas" → chave. */
export function tipoAparelhoFlexivel(valor: unknown): TipoAparelho {
  if (typeof valor !== 'string' || !valor.trim()) return 'outro'
  const t = valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_-]+/g, ' ')

  if (/(geladeira|refrigerador|frigobar|freezer)/.test(t)) return 'geladeira'
  if (/(chuveiro|ducha|aquecedor de agua)/.test(t)) return 'chuveiro'
  if (/(ar condicionado|split|climatizad)/.test(t)) return 'ar_condicionado'
  if (/(micro ?ondas|microondas)/.test(t)) return 'micro_ondas'
  if (/(maquina de lavar|lava e seca|lavadora|lava roupas)/.test(t)) return 'maquina_lavar'
  if (/(televis|\btv\b|smart tv|monitor)/.test(t)) return 'tv'
  if (/(air ?fryer|fritadeira)/.test(t)) return 'airfryer'
  if (/(ferro de passar|\bferro\b)/.test(t)) return 'ferro'
  return 'outro'
}

export const CLASSES_EFICIENCIA = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type ClasseEficiencia = (typeof CLASSES_EFICIENCIA)[number]

/**
 * "Classe A", "a+", "A++" → "A". Fora de A–G, null.
 *
 * A letra tem de estar isolada (`\b`): sem isso, "CLASSE A" devolvia o "C" de
 * "CLASSE" — que é uma classe válida, e por isso o erro passaria calado.
 */
export function classeEficienciaFlexivel(valor: unknown): ClasseEficiencia | null {
  if (typeof valor !== 'string') return null
  const achado = valor.trim().toUpperCase().match(/\b([A-G])\b/)?.[1]
  return achado && (CLASSES_EFICIENCIA as readonly string[]).includes(achado)
    ? (achado as ClasseEficiencia)
    : null
}

// ── Tipos auxiliares de schema ───────────────────────────────────────────────

const numero = z.preprocess(numeroFlexivel, z.number().nullable())
const texto = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
  z.string().nullable(),
)

/**
 * Confiança por campo, 0–1.
 *
 * Dicionário aberto de propósito: se o modelo mandar confiança de um campo que
 * o schema não pede, isso não invalida a extração inteira. Valores fora de
 * 0–1 e não numéricos são descartados.
 */
const confianca = z.preprocess((v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const saida: Record<string, number> = {}
  for (const [campo, bruto] of Object.entries(v as Record<string, unknown>)) {
    const n = numeroFlexivel(bruto)
    if (n === null) continue
    // Modelo às vezes responde em porcentagem ("95") em vez de 0–1.
    const normalizado = n > 1 && n <= 100 ? n / 100 : n
    if (normalizado >= 0 && normalizado <= 1) saida[campo] = Number(normalizado.toFixed(3))
  }
  return saida
}, z.record(z.string(), z.number().min(0).max(1)))

// ── BillExtraction ───────────────────────────────────────────────────────────

/** Só os campos — usado onde se precisa de `.partial()` (corpo de confirmação). */
export const billCamposSchema = z.object({
  distribuidora: texto,
  mes_referencia: z.preprocess(mesReferenciaFlexivel, z.string().regex(/^\d{4}-\d{2}$/).nullable()),
  consumo_kwh: numero,
  valor_total: numero,
  tarifa_kwh_sem_tributos: numero,
  bandeira: z.preprocess(bandeiraFlexivel, z.enum(BANDEIRAS).nullable()),
  leitura_anterior: numero,
  leitura_atual: numero,
  confianca,
})

/**
 * Como todo campo é opcional/anulável, um JSON qualquer — inclusive um
 * `{"erro": "não consegui ler"}` — passaria como "extração com tudo nulo", e a
 * tela abriria um formulário vazio como se tivesse dado certo. Exigir pelo
 * menos UM campo lido é o que faz o retry (e depois o 422) acontecer de fato.
 */
export const billExtractionSchema = billCamposSchema.refine(
  (d) =>
    d.consumo_kwh !== null ||
    d.valor_total !== null ||
    d.distribuidora !== null ||
    d.mes_referencia !== null ||
    d.tarifa_kwh_sem_tributos !== null ||
    d.leitura_atual !== null,
  { message: 'nenhum campo da fatura foi lido' },
)

export type BillExtraction = z.infer<typeof billExtractionSchema>

// ── LabelExtraction ──────────────────────────────────────────────────────────

export const labelCamposSchema = z.object({
  tipo_aparelho: z.preprocess(tipoAparelhoFlexivel, z.enum(TIPOS_APARELHO)),
  marca: texto,
  modelo: texto,
  potencia_w: numero,
  tensao_v: numero,
  consumo_kwh_mes_procel: numero,
  classe_eficiencia: z.preprocess(classeEficienciaFlexivel, z.enum(CLASSES_EFICIENCIA).nullable()),
  confianca,
})

/**
 * Mesma razão do schema da fatura. `tipo_aparelho` não serve de critério aqui:
 * ele sempre resolve (cai em "outro"), então um JSON vazio passaria só com ele.
 */
export const labelExtractionSchema = labelCamposSchema.refine(
  (d) =>
    d.potencia_w !== null ||
    d.marca !== null ||
    d.modelo !== null ||
    d.tensao_v !== null ||
    d.consumo_kwh_mes_procel !== null ||
    d.classe_eficiencia !== null ||
    d.tipo_aparelho !== 'outro',
  { message: 'nenhum campo da etiqueta foi lido' },
)

export type LabelExtraction = z.infer<typeof labelExtractionSchema>
