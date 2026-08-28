import { db } from '../lib/supabase.js'

export interface Plano {
  id: string
  nome: string
  preco_mensal: number
  recursos: string[]
}

// Fallback usado nos badges de upsell caso dim_plano ainda nao esteja carregada.
export const PLANO_PRO = { nome: 'Pro', preco_mensal: 19.9 }

export async function listarPlanos(): Promise<Plano[]> {
  const { data } = await db
    .from('dim_plano')
    .select('id, nome, preco_mensal, recursos')
    .order('preco_mensal')

  return ((data ?? []) as any[]).map((p) => ({
    ...p,
    preco_mensal: Number(p.preco_mensal),
    recursos: Array.isArray(p.recursos) ? p.recursos : [],
  }))
}

export async function planoPro(): Promise<{ nome: string; preco_mensal: number }> {
  const planos = await listarPlanos()
  const pro = planos.find((p) => p.nome.toLowerCase() === 'pro')
  return pro ? { nome: pro.nome, preco_mensal: pro.preco_mensal } : PLANO_PRO
}
