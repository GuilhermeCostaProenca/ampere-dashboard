import type { AssinaturaAparelho } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de assinaturas de carga.
//
// As potências nominais são as que o sensor realmente enxerga na residência de
// referência (perfil calibrado em src/simulator/perfil.ts contra os valores
// validados em campo), não as de catálogo do fabricante. É isso que faz o
// casamento de degrau funcionar.
// ─────────────────────────────────────────────────────────────────────────────
export const CATALOGO: AssinaturaAparelho[] = [
  { chave: 'chuveiro',        nome: 'Chuveiro',         categoria: 'Aquecimento',  potencia_nominal_w: 4113, faixa_w: [2800, 6500] },
  { chave: 'ar-condicionado', nome: 'Ar-condicionado',  categoria: 'Climatização', potencia_nominal_w: 1052, faixa_w: [600, 1600] },
  { chave: 'maquina-lavar',   nome: 'Máquina de lavar', categoria: 'Lavanderia',   potencia_nominal_w: 514,  faixa_w: [340, 590] },
  { chave: 'tv-eletronicos',  nome: 'TV + eletrônicos', categoria: 'Eletrônicos',  potencia_nominal_w: 171,  faixa_w: [150, 260] },
  { chave: 'iluminacao',      nome: 'Iluminação',       categoria: 'Iluminação',   potencia_nominal_w: 127,  faixa_w: [105, 149] },
  { chave: 'geladeira',       nome: 'Geladeira',        categoria: 'Refrigeração', potencia_nominal_w: 89,   faixa_w: [55, 104] },
]

export const porChave = (chave: string) => CATALOGO.find((a) => a.chave === chave)
