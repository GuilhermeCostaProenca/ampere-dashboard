import { db } from '../lib/supabase.js'

// Cache em memória: "2026-08-28T14" -> tempo_id
const cache = new Map<string, number>()

const chave = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}T${d.getUTCHours()}`

/**
 * Resolve (ou cria) a linha de dim_tempo no grão horário para um instante.
 * O instante exato de 15 min fica em fato.registrado_em.
 */
export async function tempoIdPara(instante: Date): Promise<number> {
  const k = chave(instante)
  const emCache = cache.get(k)
  if (emCache) return emCache

  const data = k.slice(0, 10)
  const hora = instante.getUTCHours()

  const { data: existente } = await db
    .from('dim_tempo')
    .select('id')
    .eq('data', data)
    .eq('hora', hora)
    .maybeSingle()

  if (existente) {
    cache.set(k, existente.id)
    return existente.id
  }

  const diaSemana = instante.getUTCDay()
  const { data: criado, error } = await db
    .from('dim_tempo')
    .insert({
      data,
      ano: instante.getUTCFullYear(),
      mes: instante.getUTCMonth() + 1,
      dia: instante.getUTCDate(),
      hora,
      dia_semana: diaSemana,
      eh_fim_de_semana: diaSemana === 0 || diaSemana === 6,
    })
    .select('id')
    .single()

  // Corrida entre dois inserts simultâneos: relê a linha vencedora.
  if (error) {
    const { data: relido } = await db
      .from('dim_tempo')
      .select('id')
      .eq('data', data)
      .eq('hora', hora)
      .single()
    if (!relido) throw error
    cache.set(k, relido.id)
    return relido.id
  }

  cache.set(k, criado.id)
  return criado.id
}

/** Pré-carrega o cache de dim_tempo — usado pelo seed para evitar N queries. */
export async function precarregarTempo(dataInicio: string, dataFim: string) {
  const { data } = await db
    .from('dim_tempo')
    .select('id, data, hora')
    .gte('data', dataInicio)
    .lte('data', dataFim)

  for (const linha of data ?? []) {
    cache.set(`${linha.data}T${linha.hora}`, linha.id)
  }
  return cache.size
}
