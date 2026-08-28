import { db } from '../lib/supabase.js'

export interface Tarifa {
  id: string
  concessionaria: string
  uf: string
  tarifa_kwh: number
  bandeira: 'verde' | 'amarela' | 'vermelha_1' | 'vermelha_2'
  adicional_bandeira: number
}

const ROTULO: Record<Tarifa['bandeira'], string> = {
  verde: 'VERDE',
  amarela: 'AMARELA',
  vermelha_1: 'VERMELHA P1',
  vermelha_2: 'VERMELHA P2',
}

let cache: { tarifa: Tarifa; expiraEm: number } | null = null

/** Tarifa vigente (cache de 5 min — muda no máximo uma vez por mês). */
export async function tarifaVigente(): Promise<Tarifa> {
  if (cache && cache.expiraEm > Date.now()) return cache.tarifa

  const { data, error } = await db
    .from('dim_tarifa')
    .select('id, concessionaria, uf, tarifa_kwh, bandeira, adicional_bandeira')
    .is('vigencia_fim', null)
    .order('vigencia_inicio', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error('Nenhuma tarifa vigente cadastrada em dim_tarifa')

  const tarifa: Tarifa = {
    ...data,
    tarifa_kwh: Number(data.tarifa_kwh),
    adicional_bandeira: Number(data.adicional_bandeira),
  }
  cache = { tarifa, expiraEm: Date.now() + 5 * 60_000 }
  return tarifa
}

/** Tarifa efetiva = tarifa base + adicional da bandeira vigente. */
export const tarifaEfetiva = (t: Tarifa) => t.tarifa_kwh + t.adicional_bandeira

export const bandeiraApresentavel = (t: Tarifa) => ({
  cor: t.bandeira,
  rotulo: ROTULO[t.bandeira],
  adicional_por_kwh: t.adicional_bandeira,
  tarifa_kwh: t.tarifa_kwh,
  concessionaria: t.concessionaria,
})
