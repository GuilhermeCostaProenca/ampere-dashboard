// ─────────────────────────────────────────────────────────────────────────────
// Rotas de visão com o provedor MOCKADO.
//
// Nada aqui fala com a API do modelo nem com o Supabase: o provedor é injetado
// por definirProvedorDeVisao() e o cliente do banco é substituído por uma
// cadeia falsa. O que está sob teste é o contrato das rotas — status, envelope
// de erro, derivação da tarifa, avisos e casamento de assinatura.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'

const USUARIO = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Teste',
  email: 'teste@ampere.local',
  tipo_imovel: 'apartamento' as const,
  plano: 'free' as const,
}

// ── Cliente do Supabase falso ────────────────────────────────────────────────

const falso = vi.hoisted(() => {
  const respostas = new Map<string, unknown>()
  const chamadas: Array<{ chave: string; payload: unknown }> = []

  /** Cadeia encadeável: qualquer método devolve a própria cadeia; o await resolve. */
  function cadeia(chave: string) {
    const resolver = () => respostas.get(chave) ?? { data: null, error: null }
    const alvo: Record<string, unknown> = {}
    const proxy: any = new Proxy(alvo, {
      get(_t, prop) {
        if (prop === 'then') {
          return (ok: any, err: any) => Promise.resolve(resolver()).then(ok, err)
        }
        if (prop === 'catch') return (f: any) => Promise.resolve(resolver()).catch(f)
        if (prop === 'finally') return (f: any) => Promise.resolve(resolver()).finally(f)
        return () => proxy
      },
    })
    return proxy
  }

  const db = {
    from(tabela: string) {
      return new Proxy(
        {},
        {
          get(_t, operacao: string) {
            return (...args: unknown[]) => {
              const chave = `${tabela}:${operacao}`
              chamadas.push({ chave, payload: args[0] })
              return cadeia(chave)
            }
          },
        },
      )
    },
    rpc(nome: string, args: unknown) {
      const chave = `rpc:${nome}`
      chamadas.push({ chave, payload: args })
      return cadeia(chave)
    },
  }

  return {
    db,
    auth: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } },
    responder: (chave: string, valor: unknown) => respostas.set(chave, valor),
    chamadas,
    limpar: () => {
      respostas.clear()
      chamadas.length = 0
    },
  }
})

vi.mock('../lib/supabase.js', () => ({ db: falso.db, auth: falso.auth }))

vi.mock('../middleware/auth.js', () => ({
  exigirAutenticacao: (req: any, _res: unknown, next: () => void) => {
    req.usuario = USUARIO
    next()
  },
  exigirChaveDispositivo: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

const { app } = await import('../app.js')
const { definirProvedorDeVisao } = await import('../services/vision/index.js')

// ── Provedor de visão falso ──────────────────────────────────────────────────

const FATURA = {
  distribuidora: 'Enel SP',
  mes_referencia: '2026-10',
  consumo_kwh: 312,
  valor_total: 287.43,
  tarifa_kwh_sem_tributos: 0.62,
  bandeira: 'vermelha_1' as const,
  leitura_anterior: 15230,
  leitura_atual: 15542,
  confianca: { consumo_kwh: 0.97, valor_total: 0.95 },
}

const ETIQUETA = {
  tipo_aparelho: 'ar_condicionado' as const,
  marca: 'Electrolux',
  modelo: 'VI12F',
  potencia_w: 1050,
  tensao_v: 220,
  consumo_kwh_mes_procel: 39.5,
  classe_eficiencia: 'A' as const,
  confianca: { potencia_w: 0.91 },
}

function provedorFalso(sobrescreve: { fatura?: unknown; etiqueta?: unknown } = {}) {
  return {
    nome: 'falso',
    modelo: 'modelo-de-teste',
    extractBill: vi.fn(async () => ({
      dados: (sobrescreve.fatura ?? FATURA) as typeof FATURA,
      latencia_ms: 1234,
      tentativas: 0,
    })),
    extractLabel: vi.fn(async () => ({
      dados: (sobrescreve.etiqueta ?? ETIQUETA) as typeof ETIQUETA,
      latencia_ms: 980,
      tentativas: 0,
    })),
  }
}

let fotoJpeg: Buffer

beforeEach(async () => {
  falso.limpar()
  definirProvedorDeVisao(provedorFalso() as never)
  falso.responder('log_extracao_visao:insert', { data: null, error: null })
  fotoJpeg = await sharp({
    create: { width: 60, height: 40, channels: 3, background: '#ffffff' },
  })
    .jpeg()
    .toBuffer()
})

afterEach(() => {
  definirProvedorDeVisao(null)
})

// ── POST /vision/bill ────────────────────────────────────────────────────────

describe('POST /vision/bill', () => {
  it('devolve os campos, a tarifa efetiva derivada e a telemetria', async () => {
    const r = await request(app)
      .post('/vision/bill')
      .attach('foto', fotoJpeg, { filename: 'conta.jpg', contentType: 'image/jpeg' })

    expect(r.status).toBe(200)
    expect(r.body.extracao.consumo_kwh).toBe(312)
    // 287,43 / 312 = 0,92125 — calculado pelo back-end, não pelo modelo
    expect(r.body.tarifa_efetiva).toBeCloseTo(0.9213, 4)
    expect(r.body.warnings).toEqual([])
    expect(r.body.meta).toMatchObject({ provider: 'falso', modelo: 'modelo-de-teste' })
    // A imagem de teste é minúscula, então kb arredonda para 0; o que importa
    // aqui é que o pipeline mediu e devolveu as dimensões do JPEG preparado.
    expect(r.body.meta.imagem).toMatchObject({ largura: 60, altura: 40 })
    expect(r.body.meta.imagem.preparo_ms).toBeGreaterThan(0)
  })

  it('grava o log de extração sem imagem e sem dado pessoal', async () => {
    await request(app)
      .post('/vision/bill')
      .attach('foto', fotoJpeg, { filename: 'conta.jpg', contentType: 'image/jpeg' })

    const log = falso.chamadas.find((c) => c.chave === 'log_extracao_visao:insert')
    expect(log).toBeDefined()
    const payload = log!.payload as Record<string, unknown>
    expect(payload.tipo).toBe('bill')
    expect(payload.etapa).toBe('extracao')
    expect(JSON.stringify(payload)).not.toContain('base64')
    expect(Object.keys(payload)).not.toContain('imagem')
  })

  it('sinaliza avisos sem bloquear a resposta', async () => {
    definirProvedorDeVisao(
      provedorFalso({ fatura: { ...FATURA, consumo_kwh: 7200, valor_total: 300 } }) as never,
    )

    const r = await request(app)
      .post('/vision/bill')
      .attach('foto', fotoJpeg, { filename: 'conta.jpg', contentType: 'image/jpeg' })

    expect(r.status).toBe(200)
    const codigos = r.body.warnings.map((a: { codigo: string }) => a.codigo)
    expect(codigos).toContain('consumo_fora_da_faixa')
    expect(codigos).toContain('tarifa_fora_da_faixa')
  })

  it('recusa requisição sem arquivo', async () => {
    const r = await request(app).post('/vision/bill')
    expect(r.status).toBe(400)
    expect(r.body.erro.codigo).toBe('requisicao_invalida')
  })

  it('recusa formato que não é imagem aceita', async () => {
    const r = await request(app)
      .post('/vision/bill')
      .attach('foto', Buffer.from('não sou imagem'), {
        filename: 'conta.txt',
        contentType: 'text/plain',
      })

    expect(r.status).toBe(415)
    expect(r.body.erro.codigo).toBe('formato_nao_aceito')
  })

  it('recusa imagem acima do limite de 8 MB', async () => {
    const r = await request(app)
      .post('/vision/bill')
      .attach('foto', Buffer.alloc(9 * 1024 * 1024, 1), {
        filename: 'grande.jpg',
        contentType: 'image/jpeg',
      })

    expect(r.status).toBe(413)
    expect(r.body.erro.codigo).toBe('imagem_grande')
  })

  it('devolve 422 legível quando a extração não valida', async () => {
    definirProvedorDeVisao({
      nome: 'falso',
      modelo: 'modelo-de-teste',
      extractBill: async () => {
        const { ErroVisao } = await import('../services/vision/types.js')
        throw new ErroVisao(422, 'extracao_invalida', 'Não foi possível ler a foto.')
      },
      extractLabel: async () => {
        throw new Error('não usado')
      },
    } as never)

    const r = await request(app)
      .post('/vision/bill')
      .attach('foto', fotoJpeg, { filename: 'conta.jpg', contentType: 'image/jpeg' })

    expect(r.status).toBe(422)
    expect(r.body.erro.codigo).toBe('extracao_invalida')
    expect(r.body.erro.mensagem).toMatch(/foto/i)
  })
})

// ── POST /vision/label ───────────────────────────────────────────────────────

const ASSINATURAS = [
  { id: 'a1', nome: 'Chuveiro', categoria: 'Aquecimento', potencia_nominal_w: 4113 },
  { id: 'a2', nome: 'Ar-condicionado', categoria: 'Climatização', potencia_nominal_w: 1052 },
  { id: 'a3', nome: 'Geladeira', categoria: 'Refrigeração', potencia_nominal_w: 89 },
]

describe('POST /vision/label', () => {
  beforeEach(() => {
    falso.responder('dim_aparelho:select', { data: ASSINATURAS, error: null })
    falso.responder('fato_evento_aparelho:select', { data: [], error: null })
  })

  it('sugere a assinatura NILM com potência mais próxima', async () => {
    const r = await request(app)
      .post('/vision/label')
      .attach('foto', fotoJpeg, { filename: 'etiqueta.jpg', contentType: 'image/jpeg' })

    expect(r.status).toBe(200)
    expect(r.body.extracao.potencia_w).toBe(1050)
    expect(r.body.assinaturas_candidatas[0]).toMatchObject({
      aparelho_id: 'a2',
      nome: 'Ar-condicionado',
    })
    // Chuveiro e geladeira estão fora de ±20%.
    expect(r.body.assinaturas_candidatas).toHaveLength(1)
    // A lista completa vem junto para a escolha manual.
    expect(r.body.assinaturas).toHaveLength(3)
  })

  it('avisa quando a etiqueta não trouxe potência', async () => {
    definirProvedorDeVisao(
      provedorFalso({ etiqueta: { ...ETIQUETA, potencia_w: null } }) as never,
    )

    const r = await request(app)
      .post('/vision/label')
      .attach('foto', fotoJpeg, { filename: 'etiqueta.jpg', contentType: 'image/jpeg' })

    expect(r.status).toBe(200)
    expect(r.body.assinaturas_candidatas).toEqual([])
    expect(r.body.warnings[0].codigo).toBe('potencia_ausente')
  })

  it('avisa quando nenhuma assinatura está na faixa', async () => {
    definirProvedorDeVisao(
      provedorFalso({ etiqueta: { ...ETIQUETA, potencia_w: 12000 } }) as never,
    )

    const r = await request(app)
      .post('/vision/label')
      .attach('foto', fotoJpeg, { filename: 'etiqueta.jpg', contentType: 'image/jpeg' })

    expect(r.body.warnings[0].codigo).toBe('sem_candidata')
  })
})

// ── POST /vision/bill/confirm ───────────────────────────────────────────────

describe('POST /vision/bill/confirm', () => {
  beforeEach(() => {
    falso.responder('fato_fatura:upsert', {
      data: {
        id: 'f1',
        mes_referencia: '2026-10',
        distribuidora: 'Enel SP',
        consumo_kwh: 312,
        valor_total: 287.43,
        tarifa_efetiva: 0.9213,
        bandeira: 'vermelha_1',
        editado_pelo_usuario: false,
      },
      error: null,
    })
  })

  it('grava a fatura e recalcula a tarifa pelos valores confirmados', async () => {
    const r = await request(app)
      .post('/vision/bill/confirm')
      .send({
        extraido: FATURA,
        confirmado: {
          distribuidora: 'Enel SP',
          mes_referencia: '2026-10',
          consumo_kwh: 312,
          valor_total: 287.43,
          tarifa_kwh_sem_tributos: 0.62,
          bandeira: 'vermelha_1',
          leitura_anterior: 15230,
          leitura_atual: 15542,
        },
        meta: { provider: 'falso', modelo: 'modelo-de-teste', latencia_ms: 1234, tentativas: 0 },
      })

    expect(r.status).toBe(201)
    expect(r.body.acerto.taxa_acerto_pct).toBe(100)

    const gravado = falso.chamadas.find((c) => c.chave === 'fato_fatura:upsert')!
      .payload as Record<string, unknown>
    expect(gravado.tarifa_efetiva).toBeCloseTo(0.9213, 4)
    expect(gravado.origem).toBe('visao_computacional')
    expect(gravado.editado_pelo_usuario).toBe(false)
  })

  it('ignora a tarifa que vier do cliente e marca a edição da pessoa', async () => {
    const r = await request(app)
      .post('/vision/bill/confirm')
      .send({
        extraido: FATURA,
        confirmado: {
          distribuidora: 'Enel SP',
          mes_referencia: '2026-10',
          consumo_kwh: 300, // corrigido pela pessoa
          valor_total: 287.43,
          bandeira: 'vermelha_1',
          tarifa_efetiva: 99, // campo malicioso: não existe no schema
        },
        meta: { provider: 'falso', modelo: 'modelo-de-teste', latencia_ms: 1, tentativas: 0 },
      })

    expect(r.status).toBe(201)
    const gravado = falso.chamadas.find((c) => c.chave === 'fato_fatura:upsert')!
      .payload as Record<string, unknown>
    // 287,43 / 300 = 0,9581 — e nunca o 99 enviado
    expect(gravado.tarifa_efetiva).toBeCloseTo(0.9581, 4)
    expect(gravado.editado_pelo_usuario).toBe(true)
    expect(r.body.acerto.campos_corrigidos).toContain('consumo_kwh')
  })

  it('recusa mês de referência fora do formato', async () => {
    const r = await request(app)
      .post('/vision/bill/confirm')
      .send({
        confirmado: { mes_referencia: 'outubro', consumo_kwh: 312, valor_total: 287.43 },
      })

    expect(r.status).toBe(400)
    expect(r.body.erro.codigo).toBe('requisicao_invalida')
  })

  it('recusa consumo zerado', async () => {
    const r = await request(app)
      .post('/vision/bill/confirm')
      .send({
        confirmado: { mes_referencia: '2026-10', consumo_kwh: 0, valor_total: 287.43 },
      })

    expect(r.status).toBe(400)
  })
})

// ── POST /vision/label/confirm ──────────────────────────────────────────────

describe('POST /vision/label/confirm', () => {
  beforeEach(() => {
    falso.responder('dim_aparelho:update', {
      data: { id: 'a2', nome: 'Ar-condicionado', marca: 'Electrolux', modelo: 'VI12F' },
      error: null,
    })
  })

  it('vincula o rótulo à assinatura escolhida', async () => {
    const r = await request(app)
      .post('/vision/label/confirm')
      .send({
        aparelho_id: '22222222-2222-4222-8222-222222222222',
        extraido: ETIQUETA,
        confirmado: {
          tipo_aparelho: 'ar_condicionado',
          marca: 'Electrolux',
          modelo: 'VI12F',
          potencia_w: 1050,
          tensao_v: 220,
          consumo_kwh_mes_procel: 39.5,
          classe_eficiencia: 'A',
        },
        meta: { provider: 'falso', modelo: 'modelo-de-teste', latencia_ms: 980, tentativas: 0 },
      })

    expect(r.status).toBe(201)
    const gravado = falso.chamadas.find((c) => c.chave === 'dim_aparelho:update')!
      .payload as Record<string, unknown>
    expect(gravado.potencia_etiqueta_w).toBe(1050)
    expect(gravado.tipo_aparelho_visao).toBe('ar_condicionado')
    expect(gravado.rotulado_por_visao_em).toBeTruthy()
    // Sem renomear=true, o nome da carga no inventário não é tocado.
    expect(gravado).not.toHaveProperty('nome')
    expect(r.body.acerto.taxa_acerto_pct).toBe(100)
  })

  it('renomeia a carga quando pedido', async () => {
    await request(app)
      .post('/vision/label/confirm')
      .send({
        aparelho_id: '22222222-2222-4222-8222-222222222222',
        confirmado: { tipo_aparelho: 'ar_condicionado', marca: 'Electrolux', modelo: 'VI12F' },
        renomear: true,
      })

    const gravado = falso.chamadas.find((c) => c.chave === 'dim_aparelho:update')!
      .payload as Record<string, unknown>
    expect(gravado.nome).toBe('Electrolux VI12F (ar condicionado)')
  })

  it('recusa aparelho_id que não é uuid', async () => {
    const r = await request(app)
      .post('/vision/label/confirm')
      .send({ aparelho_id: 'a2', confirmado: { tipo_aparelho: 'ar_condicionado' } })

    expect(r.status).toBe(400)
  })
})

// ── GET /vision/custo-aparelhos ─────────────────────────────────────────────

describe('GET /vision/custo-aparelhos', () => {
  const aparelhos = [
    {
      aparelho_id: 'a1',
      nome: 'Chuveiro',
      categoria: 'Aquecimento',
      potencia_nominal_w: 4113,
      custo_brl: 40,
      energia_kwh: 45,
      horas_ativas: 11,
    },
    {
      aparelho_id: 'a2',
      nome: 'Ar-condicionado',
      categoria: 'Climatização',
      potencia_nominal_w: 1052,
      custo_brl: 25,
      energia_kwh: 30,
      horas_ativas: 29,
    },
  ]

  it('converte kWh em R$ pela tarifa da fatura confirmada', async () => {
    falso.responder('rpc:custo_por_aparelho', { data: aparelhos, error: null })
    falso.responder('rpc:tarifa_da_fatura', {
      data: [
        {
          tarifa_efetiva: 0.9213,
          mes_referencia: '2026-10',
          distribuidora: 'Enel SP',
          bandeira: 'vermelha_1',
          consumo_kwh: 312,
          valor_total: 287.43,
          confirmada_em: '2026-11-16T12:00:00Z',
        },
      ],
      error: null,
    })

    const r = await request(app).get('/vision/custo-aparelhos')

    expect(r.status).toBe(200)
    expect(r.body.tarifa_estimada).toBe(false)
    expect(r.body.tarifa_brl_kwh).toBeCloseTo(0.9213, 4)
    expect(r.body.fonte_tarifa.mes_referencia).toBe('2026-10')
    expect(r.body.aparelhos[0].nome).toBe('Chuveiro')
    // custo = energia projetada x tarifa da conta
    const chuveiro = r.body.aparelhos[0]
    expect(chuveiro.custo_mes_brl).toBeCloseTo(chuveiro.energia_mes_kwh * 0.9213, 1)
    expect(r.body.aparelhos[0].custo_mes_brl).toBeGreaterThan(r.body.aparelhos[1].custo_mes_brl)
  })

  it('cai no fallback de R$ 0,85/kWh marcando tarifa_estimada', async () => {
    falso.responder('rpc:custo_por_aparelho', { data: aparelhos, error: null })
    falso.responder('rpc:tarifa_da_fatura', { data: [], error: null })

    const r = await request(app).get('/vision/custo-aparelhos')

    expect(r.status).toBe(200)
    expect(r.body.tarifa_estimada).toBe(true)
    expect(r.body.tarifa_brl_kwh).toBe(0.85)
    expect(r.body.fonte_tarifa).toBeNull()
  })
})

// ── /health ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('informa o provedor de visão configurado', async () => {
    const r = await request(app).get('/health')
    expect(r.status).toBe(200)
    expect(r.body.visao).toMatchObject({ configurado: true, provider: 'anthropic' })
  })
})
