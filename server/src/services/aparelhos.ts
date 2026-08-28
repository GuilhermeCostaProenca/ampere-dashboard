import { db } from '../lib/supabase.js'
import { CATALOGO, porChave } from '../nilm/index.js'

/**
 * Mapa chave-do-catalogo -> id em dim_aparelho, criando o registro na primeira
 * vez que o NILM reconhece aquela assinatura. E assim que a lista de
 * aparelhos identificados cresce sozinha conforme o sensor manda dados.
 */
export async function garantirAparelhos(
  usuarioId: string,
  chaves: string[],
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  if (chaves.length === 0) return mapa

  const nomes = chaves.map((c) => porChave(c)?.nome).filter(Boolean) as string[]

  const { data: existentes } = await db
    .from('dim_aparelho')
    .select('id, nome')
    .eq('usuario_id', usuarioId)
    .in('nome', nomes)

  const porNome = new Map((existentes ?? []).map((a) => [a.nome, a.id]))

  const aCriar = chaves.filter((c) => {
    const nome = porChave(c)?.nome
    return nome && !porNome.has(nome)
  })

  if (aCriar.length > 0) {
    const linhas = aCriar.map((c) => {
      const a = porChave(c)!
      return {
        usuario_id: usuarioId,
        nome: a.nome,
        categoria: a.categoria,
        potencia_nominal_w: a.potencia_nominal_w,
      }
    })
    const { data: criados } = await db.from('dim_aparelho').insert(linhas).select('id, nome')
    for (const c of criados ?? []) porNome.set(c.nome, c.id)
  }

  for (const chave of chaves) {
    const nome = porChave(chave)?.nome
    const id = nome ? porNome.get(nome) : undefined
    if (id) mapa.set(chave, id)
  }
  return mapa
}

/** Chave do catalogo a partir do nome gravado em dim_aparelho. */
export const chavePorNome = (nome: string) => CATALOGO.find((a) => a.nome === nome)?.chave ?? null
