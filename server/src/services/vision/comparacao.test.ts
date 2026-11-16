import { describe, expect, it } from 'vitest'
import { CAMPOS_FATURA, compararCampos, valoresBatem } from './comparacao.js'

describe('valoresBatem', () => {
  it('aceita número dentro da tolerância de 1%', () => {
    expect(valoresBatem(312, 312)).toBe(true)
    expect(valoresBatem(312, 314)).toBe(true) // 0,64%
    expect(valoresBatem(312, 330)).toBe(false) // 5,45%
  })

  it('compara string sem olhar caixa, acento ou espaço extra', () => {
    expect(valoresBatem('Enel SP', 'enel sp')).toBe(true)
    expect(valoresBatem('CPFL  Paulista', 'cpfl paulista')).toBe(true)
    expect(valoresBatem('Light', 'Enel RJ')).toBe(false)
  })

  it('trata nulo dos dois lados como acerto', () => {
    expect(valoresBatem(null, null)).toBe(true)
    expect(valoresBatem(null, undefined)).toBe(true)
  })

  it('trata nulo de um lado só como erro', () => {
    expect(valoresBatem(null, 312)).toBe(false)
    expect(valoresBatem(312, null)).toBe(false)
  })

  it('não divide por zero', () => {
    expect(valoresBatem(0, 0)).toBe(true)
    expect(valoresBatem(5, 0)).toBe(false)
  })
})

const extraido = {
  distribuidora: 'Enel SP',
  mes_referencia: '2026-10',
  consumo_kwh: 312,
  valor_total: 287.43,
  tarifa_kwh_sem_tributos: 0.62,
  bandeira: 'vermelha_1',
  leitura_anterior: 15230,
  leitura_atual: 15542,
}

describe('compararCampos', () => {
  it('dá 100% quando a pessoa não corrige nada', () => {
    const r = compararCampos(extraido, { ...extraido }, CAMPOS_FATURA)
    expect(r.campos_comparados).toBe(8)
    expect(r.campos_corrigidos).toEqual([])
    expect(r.taxa_acerto_pct).toBe(100)
  })

  it('aponta quais campos foram corrigidos', () => {
    const r = compararCampos(
      extraido,
      { ...extraido, consumo_kwh: 345, bandeira: 'amarela' },
      CAMPOS_FATURA,
    )
    expect(r.campos_corrigidos.sort()).toEqual(['bandeira', 'consumo_kwh'])
    expect(r.taxa_acerto_pct).toBe(75)
  })

  it('não conta campo que estava nulo dos dois lados', () => {
    const semLeitura = { ...extraido, leitura_anterior: null, leitura_atual: null }
    const r = compararCampos(semLeitura, { ...semLeitura }, CAMPOS_FATURA)
    expect(r.campos_comparados).toBe(6)
    expect(r.taxa_acerto_pct).toBe(100)
  })

  it('conta como erro o campo que o modelo deixou nulo e a pessoa digitou', () => {
    const semBandeira = { ...extraido, bandeira: null }
    const r = compararCampos(semBandeira, { ...extraido }, CAMPOS_FATURA)
    expect(r.campos_corrigidos).toEqual(['bandeira'])
    expect(r.campos_comparados).toBe(8)
  })

  it('devolve taxa nula quando não havia nada para comparar', () => {
    const r = compararCampos({}, {}, CAMPOS_FATURA)
    expect(r.campos_comparados).toBe(0)
    expect(r.taxa_acerto_pct).toBeNull()
  })

  it('tolera arredondamento de 1% em valor monetário', () => {
    const r = compararCampos(extraido, { ...extraido, valor_total: 287.4 }, CAMPOS_FATURA)
    expect(r.campos_corrigidos).toEqual([])
  })
})
