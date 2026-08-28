import type { AssinaturaAparelho } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de assinaturas de carga.
// Potências nominais alinhadas às cargas validadas na pesquisa de campo.
// ─────────────────────────────────────────────────────────────────────────────
export const CATALOGO: AssinaturaAparelho[] = [
  { chave: 'chuveiro',        nome: 'Chuveiro',           categoria: 'Aquecimento',  potencia_nominal_w: 4500, faixa_w: [2800, 6500] },
  { chave: 'ar-condicionado', nome: 'Ar-condicionado',    categoria: 'Climatização', potencia_nominal_w: 850,  faixa_w: [600, 1600] },
  { chave: 'maquina-lavar',   nome: 'Máquina de lavar',   categoria: 'Lavanderia',   potencia_nominal_w: 500,  faixa_w: [340, 590] },
  { chave: 'tv-eletronicos',  nome: 'TV + eletrônicos',   categoria: 'Eletrônicos',  potencia_nominal_w: 180,  faixa_w: [150, 260] },
  { chave: 'iluminacao',      nome: 'Iluminação',         categoria: 'Iluminação',   potencia_nominal_w: 140,  faixa_w: [105, 149] },
  { chave: 'geladeira',       nome: 'Geladeira',          categoria: 'Refrigeração', potencia_nominal_w: 90,   faixa_w: [55, 104] },
]

export const porChave = (chave: string) => CATALOGO.find((a) => a.chave === chave)
