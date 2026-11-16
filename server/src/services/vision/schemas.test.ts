import { describe, expect, it } from 'vitest'
import {
  bandeiraFlexivel,
  billExtractionSchema,
  classeEficienciaFlexivel,
  labelExtractionSchema,
  mesReferenciaFlexivel,
  numeroFlexivel,
  tipoAparelhoFlexivel,
} from './schemas.js'

describe('numeroFlexivel', () => {
  it('lê número em formato brasileiro', () => {
    expect(numeroFlexivel('1.234,56')).toBe(1234.56)
    expect(numeroFlexivel('287,43')).toBe(287.43)
    expect(numeroFlexivel('R$ 1.098,07')).toBe(1098.07)
  })

  it('lê número em formato americano', () => {
    expect(numeroFlexivel('1234.56')).toBe(1234.56)
    expect(numeroFlexivel('0.92')).toBe(0.92)
  })

  it('mantém número que já veio numérico', () => {
    expect(numeroFlexivel(187.4)).toBe(187.4)
    expect(numeroFlexivel(0)).toBe(0)
  })

  it('trata milhar sem decimal', () => {
    expect(numeroFlexivel('4.113')).toBe(4113)
    expect(numeroFlexivel('1,500')).toBe(1500)
  })

  it('devolve null para o que não é número', () => {
    expect(numeroFlexivel(null)).toBeNull()
    expect(numeroFlexivel('')).toBeNull()
    expect(numeroFlexivel('não informado')).toBeNull()
    expect(numeroFlexivel(undefined)).toBeNull()
    expect(numeroFlexivel(Number.NaN)).toBeNull()
  })
})

describe('mesReferenciaFlexivel', () => {
  it('normaliza os formatos que o modelo costuma devolver', () => {
    expect(mesReferenciaFlexivel('2026-11')).toBe('2026-11')
    expect(mesReferenciaFlexivel('11/2026')).toBe('2026-11')
    expect(mesReferenciaFlexivel('3/2026')).toBe('2026-03')
    expect(mesReferenciaFlexivel('NOV/2026')).toBe('2026-11')
    expect(mesReferenciaFlexivel('2026-3')).toBe('2026-03')
  })

  it('devolve null quando não dá para saber o mês', () => {
    expect(mesReferenciaFlexivel('novembro')).toBeNull()
    expect(mesReferenciaFlexivel(null)).toBeNull()
  })
})

describe('bandeiraFlexivel', () => {
  it('reconhece a bandeira escrita por extenso', () => {
    expect(bandeiraFlexivel('Verde')).toBe('verde')
    expect(bandeiraFlexivel('bandeira amarela')).toBe('amarela')
    expect(bandeiraFlexivel('Escassez Hídrica')).toBe('escassez_hidrica')
  })

  it('separa os dois patamares da vermelha', () => {
    expect(bandeiraFlexivel('Vermelha')).toBe('vermelha_1')
    expect(bandeiraFlexivel('Vermelha - Patamar 1')).toBe('vermelha_1')
    expect(bandeiraFlexivel('Vermelha Patamar 2')).toBe('vermelha_2')
    expect(bandeiraFlexivel('vermelha_2')).toBe('vermelha_2')
  })

  it('devolve null para texto irreconhecível', () => {
    expect(bandeiraFlexivel('azul')).toBeNull()
    expect(bandeiraFlexivel(null)).toBeNull()
  })
})

describe('tipoAparelhoFlexivel', () => {
  it('normaliza para o vocabulário fechado', () => {
    expect(tipoAparelhoFlexivel('Ar Condicionado Split')).toBe('ar_condicionado')
    expect(tipoAparelhoFlexivel('Refrigerador Frost Free')).toBe('geladeira')
    expect(tipoAparelhoFlexivel('micro-ondas')).toBe('micro_ondas')
    expect(tipoAparelhoFlexivel('Lavadora de roupas')).toBe('maquina_lavar')
    expect(tipoAparelhoFlexivel('Smart TV 50"')).toBe('tv')
    expect(tipoAparelhoFlexivel('Air Fryer')).toBe('airfryer')
    expect(tipoAparelhoFlexivel('Ferro de passar')).toBe('ferro')
    expect(tipoAparelhoFlexivel('ducha eletrônica')).toBe('chuveiro')
  })

  it('nunca devolve nulo — cai em "outro"', () => {
    expect(tipoAparelhoFlexivel('aspirador de pó')).toBe('outro')
    expect(tipoAparelhoFlexivel(null)).toBe('outro')
  })
})

describe('classeEficienciaFlexivel', () => {
  it('extrai só a letra', () => {
    expect(classeEficienciaFlexivel('Classe A')).toBe('A')
    expect(classeEficienciaFlexivel('a')).toBe('A')
    expect(classeEficienciaFlexivel('C')).toBe('C')
  })

  it('rejeita letra fora de A–G', () => {
    expect(classeEficienciaFlexivel('H')).toBeNull()
    expect(classeEficienciaFlexivel('')).toBeNull()
    expect(classeEficienciaFlexivel(null)).toBeNull()
  })
})

describe('billExtractionSchema', () => {
  it('valida e normaliza a resposta bagunçada do modelo', () => {
    const extraido = billExtractionSchema.parse({
      distribuidora: '  Enel SP  ',
      mes_referencia: '10/2026',
      consumo_kwh: '312',
      valor_total: 'R$ 287,43',
      tarifa_kwh_sem_tributos: '0,62',
      bandeira: 'Vermelha - Patamar 1',
      leitura_anterior: '15.230',
      leitura_atual: '15.542',
      confianca: { consumo_kwh: 0.97, valor_total: '95', bandeira: 0.8 },
    })

    expect(extraido).toMatchObject({
      distribuidora: 'Enel SP',
      mes_referencia: '2026-10',
      consumo_kwh: 312,
      valor_total: 287.43,
      tarifa_kwh_sem_tributos: 0.62,
      bandeira: 'vermelha_1',
      leitura_anterior: 15230,
      leitura_atual: 15542,
    })
    // Confiança em porcentagem é convertida para 0–1.
    expect(extraido.confianca.valor_total).toBe(0.95)
  })

  it('aceita extração parcial — um campo lido basta', () => {
    const parcial = billExtractionSchema.parse({
      distribuidora: null,
      mes_referencia: null,
      consumo_kwh: 312,
      valor_total: null,
      tarifa_kwh_sem_tributos: null,
      bandeira: null,
      leitura_anterior: null,
      leitura_atual: null,
      confianca: {},
    })
    expect(parcial.consumo_kwh).toBe(312)
    expect(parcial.valor_total).toBeNull()
    expect(parcial.confianca).toEqual({})
  })

  it('reprova extração com tudo nulo — senão a tela abriria vazia como sucesso', () => {
    expect(() =>
      billExtractionSchema.parse({
        distribuidora: null,
        mes_referencia: null,
        consumo_kwh: null,
        valor_total: null,
        tarifa_kwh_sem_tributos: null,
        bandeira: null,
        leitura_anterior: null,
        leitura_atual: null,
        confianca: {},
      }),
    ).toThrow()
  })

  it('descarta campo pessoal que o modelo mande por engano (LGPD)', () => {
    const extraido = billExtractionSchema.parse({
      distribuidora: 'CPFL',
      mes_referencia: '2026-10',
      consumo_kwh: 200,
      valor_total: 180,
      tarifa_kwh_sem_tributos: null,
      bandeira: 'verde',
      leitura_anterior: null,
      leitura_atual: null,
      confianca: {},
      nome_titular: 'Maria da Silva',
      cpf: '123.456.789-00',
      endereco: 'Rua X, 123',
      numero_instalacao: '998877',
    })

    expect(extraido).not.toHaveProperty('nome_titular')
    expect(extraido).not.toHaveProperty('cpf')
    expect(extraido).not.toHaveProperty('endereco')
    expect(extraido).not.toHaveProperty('numero_instalacao')
    expect(JSON.stringify(extraido)).not.toContain('Maria')
  })

  it('reprova JSON que não tem nada a ver com uma fatura', () => {
    expect(() => billExtractionSchema.parse({ foo: 'bar' })).toThrow()
    expect(() => billExtractionSchema.parse({ erro: 'não consegui ler a imagem' })).toThrow()
    expect(() => billExtractionSchema.parse('não é objeto')).toThrow()
  })

  it('reprova confiança fora de 0–1', () => {
    const extraido = billExtractionSchema.parse({
      distribuidora: null,
      mes_referencia: null,
      consumo_kwh: 312,
      valor_total: null,
      tarifa_kwh_sem_tributos: null,
      bandeira: null,
      leitura_anterior: null,
      leitura_atual: null,
      confianca: { consumo_kwh: 1200 },
    })
    expect(extraido.confianca).toEqual({})
  })
})

describe('labelExtractionSchema', () => {
  it('converte potência e normaliza o tipo', () => {
    const extraido = labelExtractionSchema.parse({
      tipo_aparelho: 'Ar Condicionado Split',
      marca: 'Electrolux',
      modelo: ' VI12F ',
      potencia_w: '1.050',
      tensao_v: '220',
      consumo_kwh_mes_procel: '39,5',
      classe_eficiencia: 'Classe A',
      confianca: { potencia_w: 0.91 },
    })

    expect(extraido).toMatchObject({
      tipo_aparelho: 'ar_condicionado',
      marca: 'Electrolux',
      modelo: 'VI12F',
      potencia_w: 1050,
      tensao_v: 220,
      consumo_kwh_mes_procel: 39.5,
      classe_eficiencia: 'A',
    })
  })

  it('cai em "outro" quando o tipo não dá para saber, mas há outro campo lido', () => {
    const extraido = labelExtractionSchema.parse({
      tipo_aparelho: 'aspirador de pó',
      marca: null,
      modelo: null,
      potencia_w: 1400,
      tensao_v: null,
      consumo_kwh_mes_procel: null,
      classe_eficiencia: null,
      confianca: {},
    })
    expect(extraido.tipo_aparelho).toBe('outro')
    expect(extraido.potencia_w).toBe(1400)
  })

  it('reprova etiqueta sem nenhum campo lido', () => {
    expect(() =>
      labelExtractionSchema.parse({
        tipo_aparelho: null,
        marca: null,
        modelo: null,
        potencia_w: null,
        tensao_v: null,
        consumo_kwh_mes_procel: null,
        classe_eficiencia: null,
        confianca: {},
      }),
    ).toThrow()
  })
})
