// Media de custo mensal por categoria em residencias equivalentes.
// Valores de referencia levantados na pesquisa de campo das fases anteriores.
// Usados apenas para o comparativo "vs media da categoria".
export const MEDIA_CATEGORIA_BRL: Record<string, number> = {
  'Climatização': 76,
  'Aquecimento': 38,
  'Refrigeração': 21,
  'Lavanderia': 16,
  'Eletrônicos': 13,
  'Iluminação': 9,
}

export const mediaDaCategoria = (categoria: string) => MEDIA_CATEGORIA_BRL[categoria] ?? 0
