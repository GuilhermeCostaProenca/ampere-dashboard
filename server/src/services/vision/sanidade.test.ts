import { describe, expect, it } from 'vitest'
import {
  avisosDaFatura,
  calcularTarifaEfetiva,
  casarAssinaturas,
  type AssinaturaParaCasar,
} from './sanidade.js'

describe('calcularTarifaEfetiva', () => {
  it('divide o total pelo consumo', () => {
    // R$ 287,43 / 312 kWh = R$ 0,92125/kWh, arredondado para 4 casas
    expect(calcularTarifaEfetiva(287.43, 312)).toBe(0.9213)
    expect(calcularTarifaEfetiva(180, 200)).toBe(0.9)
  })

  it('devolve null quando falta um dos dois números', () => {
    expect(calcularTarifaEfetiva(null, 312)).toBeNull()
    expect(calcularTarifaEfetiva(287.43, null)).toBeNull()
    expect(calcularTarifaEfetiva(null, null)).toBeNull()
  })

  it('não divide por zero nem aceita valor negativo', () => {
    expect(calcularTarifaEfetiva(287.43, 0)).toBeNull()
    expect(calcularTarifaEfetiva(0, 312)).toBeNull()
    expect(calcularTarifaEfetiva(-50, 312)).toBeNull()
  })
})

const faturaBase = {
  consumo_kwh: 312,
  valor_total: 287.43,
  leitura_anterior: 15230,
  leitura_atual: 15542,
}

describe('avisosDaFatura', () => {
  it('não avisa nada quando a conta é plausível', () => {
    const tarifa = calcularTarifaEfetiva(faturaBase.valor_total, faturaBase.consumo_kwh)
    expect(avisosDaFatura(faturaBase, tarifa)).toEqual([])
  })

  it('avisa consumo fora da faixa de 1 a 5000 kWh', () => {
    const alto = { ...faturaBase, consumo_kwh: 7200, leitura_atual: 22430 }
    const codigos = avisosDaFatura(alto, calcularTarifaEfetiva(alto.valor_total, alto.consumo_kwh))
      .map((a) => a.codigo)
    expect(codigos).toContain('consumo_fora_da_faixa')

    const zero = { ...faturaBase, consumo_kwh: 0.5, leitura_atual: 15230.5 }
    expect(avisosDaFatura(zero, 1.2).map((a) => a.codigo)).toContain('consumo_fora_da_faixa')
  })

  it('avisa tarifa efetiva fora de R$ 0,30–2,50 por kWh', () => {
    // 312 kWh custando R$ 1.400 ⇒ R$ 4,49/kWh
    const caro = { ...faturaBase, valor_total: 1400 }
    const codigos = avisosDaFatura(caro, calcularTarifaEfetiva(1400, 312)).map((a) => a.codigo)
    expect(codigos).toContain('tarifa_fora_da_faixa')

    const barato = { ...faturaBase, valor_total: 40 }
    expect(avisosDaFatura(barato, calcularTarifaEfetiva(40, 312)).map((a) => a.codigo)).toContain(
      'tarifa_fora_da_faixa',
    )
  })

  it('avisa quando as leituras do medidor divergem mais de 5% do consumo', () => {
    // 15.600 − 15.230 = 370 kWh contra 312 faturados ⇒ 18,6% de divergência
    const divergente = { ...faturaBase, leitura_atual: 15600 }
    const aviso = avisosDaFatura(divergente, 0.92).find((a) => a.codigo === 'leitura_divergente')
    expect(aviso).toBeDefined()
    expect(aviso?.campo).toBe('leitura_atual')
  })

  it('tolera divergência de até 5% nas leituras', () => {
    // 15.542 − 15.230 = 312; com 300 faturados ⇒ 4% de divergência
    const dentro = { ...faturaBase, consumo_kwh: 300 }
    const codigos = avisosDaFatura(dentro, 0.95).map((a) => a.codigo)
    expect(codigos).not.toContain('leitura_divergente')
  })

  it('avisa campo ausente em vez de travar a extração', () => {
    const semNada = {
      consumo_kwh: null,
      valor_total: null,
      leitura_anterior: null,
      leitura_atual: null,
    }
    const codigos = avisosDaFatura(semNada, null).map((a) => a.codigo)
    expect(codigos).toContain('consumo_ausente')
    expect(codigos).toContain('valor_ausente')
  })
})

// Catálogo do NILM na residência de referência (server/src/nilm/catalogo.ts).
const assinaturas: AssinaturaParaCasar[] = [
  { aparelho_id: 'a1', nome: 'Chuveiro', categoria: 'Aquecimento', potencia_nominal_w: 4113, potencia_media_w: 4180, horario_tipico_h: 19 },
  { aparelho_id: 'a2', nome: 'Ar-condicionado', categoria: 'Climatização', potencia_nominal_w: 1052, potencia_media_w: 1038, horario_tipico_h: 22 },
  { aparelho_id: 'a3', nome: 'Máquina de lavar', categoria: 'Lavanderia', potencia_nominal_w: 514, potencia_media_w: null, horario_tipico_h: null },
  { aparelho_id: 'a4', nome: 'Geladeira', categoria: 'Refrigeração', potencia_nominal_w: 89, potencia_media_w: 92, horario_tipico_h: 13 },
]

describe('casarAssinaturas', () => {
  it('casa a etiqueta com a assinatura de potência mais próxima', () => {
    const candidatas = casarAssinaturas(1050, assinaturas)
    expect(candidatas[0]?.aparelho_id).toBe('a2')
    expect(candidatas[0]?.horario_tipico_h).toBe(22)
  })

  it('usa a potência média observada quando existe', () => {
    // 4180 (média) está a 1,7% de 4250; a nominal 4113 estaria a 3,2%.
    const candidatas = casarAssinaturas(4250, assinaturas)
    expect(candidatas[0]?.aparelho_id).toBe('a1')
    expect(candidatas[0]?.divergencia_pct).toBeCloseTo(1.6, 0)
  })

  it('cai para a nominal quando a carga ainda não gerou eventos', () => {
    const candidatas = casarAssinaturas(500, assinaturas)
    expect(candidatas[0]?.aparelho_id).toBe('a3')
  })

  it('descarta quem está fora de ±20%', () => {
    const candidatas = casarAssinaturas(1050, assinaturas)
    expect(candidatas.map((c) => c.aparelho_id)).not.toContain('a1')
    expect(candidatas.map((c) => c.aparelho_id)).not.toContain('a4')
  })

  it('ordena da mais próxima para a mais distante', () => {
    const candidatas = casarAssinaturas(480, assinaturas)
    const divergencias = candidatas.map((c) => c.divergencia_pct)
    expect(divergencias).toEqual([...divergencias].sort((a, b) => a - b))
  })

  it('devolve lista vazia sem potência na etiqueta', () => {
    expect(casarAssinaturas(null, assinaturas)).toEqual([])
    expect(casarAssinaturas(0, assinaturas)).toEqual([])
  })

  it('devolve lista vazia quando nada está na faixa', () => {
    expect(casarAssinaturas(12000, assinaturas)).toEqual([])
  })
})
