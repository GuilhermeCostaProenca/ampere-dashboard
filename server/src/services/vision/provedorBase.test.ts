import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { extrairComValidacao, recortarJson } from './provedorBase.js'
import { ErroVisao } from './types.js'
import type { ImagemProcessada } from './types.js'

const imagemFalsa: ImagemProcessada = {
  buffer: Buffer.from('x'),
  mime: 'image/jpeg',
  largura: 100,
  altura: 100,
  bytes: 1,
  duracoes: { leitura_ms: 1, preparo_ms: 1 },
}

const schema = z.object({ consumo_kwh: z.number() })

describe('recortarJson', () => {
  it('lê o JSON puro', () => {
    expect(recortarJson('{"consumo_kwh": 312}')).toEqual({ consumo_kwh: 312 })
  })

  it('tira a cerca de código', () => {
    expect(recortarJson('```json\n{"consumo_kwh": 312}\n```')).toEqual({ consumo_kwh: 312 })
  })

  it('tira o texto que o modelo escreve antes e depois', () => {
    const resposta = 'Claro! Aqui está:\n{"consumo_kwh": 312}\nEspero ter ajudado.'
    expect(recortarJson(resposta)).toEqual({ consumo_kwh: 312 })
  })

  it('falha quando não há objeto nenhum', () => {
    expect(() => recortarJson('não consegui ler a imagem')).toThrow()
  })
})

describe('extrairComValidacao', () => {
  it('não repete a chamada quando o JSON vem válido', async () => {
    const chamar = vi.fn().mockResolvedValue('{"consumo_kwh": 312}')
    const r = await extrairComValidacao(schema, chamar, imagemFalsa, 'prompt', 'fatura')

    expect(chamar).toHaveBeenCalledTimes(1)
    expect(r.dados).toEqual({ consumo_kwh: 312 })
    expect(r.tentativas).toBe(0)
    expect(r.latencia_ms).toBeGreaterThanOrEqual(0)
  })

  it('tenta mais uma vez, com prompt reforçado, quando o JSON é inválido', async () => {
    const chamar = vi
      .fn()
      .mockResolvedValueOnce('desculpe, não consegui')
      .mockResolvedValueOnce('{"consumo_kwh": 312}')

    const r = await extrairComValidacao(schema, chamar, imagemFalsa, 'prompt', 'fatura')

    expect(chamar).toHaveBeenCalledTimes(2)
    expect(r.tentativas).toBe(1)
    expect(chamar.mock.calls[1]?.[1]).toContain('ATENÇÃO')
  })

  it('devolve 422 depois da segunda falha, sem tentar uma terceira', async () => {
    const chamar = vi.fn().mockResolvedValue('{"consumo_kwh": "não sei"}')

    await expect(
      extrairComValidacao(schema, chamar, imagemFalsa, 'prompt', 'fatura'),
    ).rejects.toMatchObject({ status: 422, codigo: 'extracao_invalida' })

    expect(chamar).toHaveBeenCalledTimes(2)
  })

  it('não gasta retry em falha de rede — propaga na hora', async () => {
    const chamar = vi.fn().mockRejectedValue(new Error('ECONNRESET'))

    await expect(
      extrairComValidacao(schema, chamar, imagemFalsa, 'prompt', 'fatura'),
    ).rejects.toMatchObject({ status: 502, codigo: 'provedor_indisponivel' })

    expect(chamar).toHaveBeenCalledTimes(1)
  })

  it('preserva o ErroVisao que o provedor já traduziu', async () => {
    const chamar = vi
      .fn()
      .mockRejectedValue(new ErroVisao(429, 'provedor_limite', 'Limite atingido'))

    await expect(
      extrairComValidacao(schema, chamar, imagemFalsa, 'prompt', 'fatura'),
    ).rejects.toMatchObject({ status: 429, codigo: 'provedor_limite' })

    expect(chamar).toHaveBeenCalledTimes(1)
  })
})
