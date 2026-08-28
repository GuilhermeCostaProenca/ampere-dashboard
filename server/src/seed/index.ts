// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Seed do banco em nuvem
//
// Popula 90 dias de histórico com granularidade de 15 min, calibrado para
// reproduzir os valores validados nas pesquisas de campo.
//
//   npm run seed                      -- 90 dias, conta demo
//   npm run seed -- --dias=30         -- janela menor
//   npm run seed -- --email=x@y.com --senha=segredo
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../lib/supabase.js'
import { CATALOGO, DetectorDegraus } from '../nilm/index.js'
import type { AmostraAgregada } from '../nilm/index.js'
import {
  MINUTOS_POR_FATIA,
  POTENCIAS,
  STANDBY_W,
  alinharNaFatia,
  consumoNoInstante,
} from '../simulator/perfil.js'

// ── Alvos validados em campo (R$/mês) ────────────────────────────────────────
const ALVO_MENSAL_BRL: Record<string, number> = {
  'ar-condicionado': 89,
  chuveiro: 42,
  geladeira: 23,
  'maquina-lavar': 10,
  'tv-eletronicos': 9,
  iluminacao: 5,
}
const ALVO_TOTAL_BRL = 187 // aparelhos (178) + consumo de base (~9)

// Meses anteriores foram mais caros — é o que dá sentido à economia acumulada.
const MULTIPLICADOR_MES = [1.0, 1.05, 1.1, 1.12]

const arg = (nome: string, padrao: string) => {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.split('=').slice(1).join('=') : padrao
}

const EMAIL = arg('email', 'demo@ampere.app')
const SENHA = arg('senha', 'ampere2026')
const NOME = arg('nome', 'Guilherme Proença')
const DIAS = Number(arg('dias', '90'))

const MS_FATIA = MINUTOS_POR_FATIA * 60_000
const log = (m: string) => console.log(`[seed] ${m}`)
const brl = (v: number) => `R$${v.toFixed(2)}`
const detectorRef = new DetectorDegraus()

interface LinhaLeitura {
  dispositivo_id: string
  tempo_id: number
  tarifa_id: string
  potencia_instantanea_w: number
  energia_kwh: number
  custo_estimado_brl: number
  registrado_em: string
}

interface LinhaEvento {
  aparelho_id: string
  dispositivo_id: string
  tempo_id: number
  tipo_evento: 'ligou' | 'desligou'
  potencia_w: number
  duracao_minutos: number
  energia_kwh: number
  custo_brl: number
  confianca_deteccao: number
  registrado_em: string
}

// ── Tarifa / conta / aparelhos ───────────────────────────────────────────────

async function carregarTarifa() {
  const { data } = await db
    .from('dim_tarifa')
    .select('id, tarifa_kwh, adicional_bandeira, bandeira')
    .is('vigencia_fim', null)
    .order('vigencia_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    throw new Error(
      'Nenhuma tarifa em dim_tarifa. Rode as migrations de supabase/migrations/ antes do seed.',
    )
  }
  return {
    id: data.id as string,
    tarifa_kwh: Number(data.tarifa_kwh),
    adicional_bandeira: Number(data.adicional_bandeira),
    bandeira: data.bandeira as string,
  }
}

async function garantirConta() {
  const { data: perfilExistente } = await db
    .from('dim_usuario')
    .select('id')
    .eq('email', EMAIL)
    .maybeSingle()

  let usuarioId = perfilExistente?.id as string | undefined

  if (!usuarioId) {
    const { data: criado, error } = await db.auth.admin.createUser({
      email: EMAIL,
      password: SENHA,
      email_confirm: true,
      user_metadata: { nome: NOME },
    })
    if (error || !criado.user) throw new Error(`Falha ao criar usuário: ${error?.message}`)
    usuarioId = criado.user.id

    const { error: erroPerfil } = await db.from('dim_usuario').insert({
      id: usuarioId,
      nome: NOME,
      email: EMAIL,
      tipo_imovel: 'apartamento',
      plano: 'free',
    })
    if (erroPerfil) throw new Error(`Falha ao criar perfil: ${erroPerfil.message}`)
    log(`usuário criado: ${EMAIL}`)
  } else {
    log(`usuário já existente: ${EMAIL}`)
  }

  const { data: dispositivo } = await db
    .from('dim_dispositivo')
    .select('id, chave_ingestao')
    .eq('usuario_id', usuarioId)
    .limit(1)
    .maybeSingle()

  if (dispositivo) {
    log(`sensor: ${dispositivo.id}`)
    log(`chave de ingestão (X-Device-Key): ${dispositivo.chave_ingestao}`)
    return { usuarioId: usuarioId!, dispositivoId: dispositivo.id as string }
  }

  const { data: novo, error } = await db
    .from('dim_dispositivo')
    .insert({
      usuario_id: usuarioId,
      apelido: 'Amperê Node v1 (ESP32 + SCT-013-030)',
      status_conexao: 'online',
      versao_firmware: 'fw 1.4.2',
      sinal_wifi: -54,
    })
    .select('id, chave_ingestao')
    .single()

  if (error || !novo) throw new Error(`Falha ao criar dispositivo: ${error?.message}`)
  log(`sensor criado: ${novo.id}`)
  log(`chave de ingestão (X-Device-Key): ${novo.chave_ingestao}`)
  return { usuarioId: usuarioId!, dispositivoId: novo.id as string }
}

async function garantirAparelhosDoPerfil(usuarioId: string) {
  const mapa = new Map<string, string>()

  for (const assinatura of CATALOGO) {
    const { data: existente } = await db
      .from('dim_aparelho')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('nome', assinatura.nome)
      .maybeSingle()

    if (existente) {
      mapa.set(assinatura.chave, existente.id)
      continue
    }

    const { data: criado, error } = await db
      .from('dim_aparelho')
      .insert({
        usuario_id: usuarioId,
        nome: assinatura.nome,
        categoria: assinatura.categoria,
        potencia_nominal_w: assinatura.potencia_nominal_w,
      })
      .select('id')
      .single()

    if (error || !criado) throw new Error(`Falha ao criar aparelho: ${error?.message}`)
    mapa.set(assinatura.chave, criado.id)
  }

  log(`aparelhos no inventário: ${mapa.size}`)
  return mapa
}

async function limparFatos(dispositivoId: string) {
  await db.from('fato_evento_aparelho').delete().eq('dispositivo_id', dispositivoId)
  await db.from('fato_leitura_agregada').delete().eq('dispositivo_id', dispositivoId)
  log('fatos anteriores removidos (seed é idempotente)')
}

// ── Calibração ───────────────────────────────────────────────────────────────

/** Multiplicador do mês: quanto mais antigo, mais caro era o consumo. */
function multiplicadorMes(instante: Date, referencia: Date) {
  const meses =
    (referencia.getUTCFullYear() - instante.getUTCFullYear()) * 12 +
    (referencia.getUTCMonth() - instante.getUTCMonth())
  return MULTIPLICADOR_MES[Math.min(Math.max(meses, 0), MULTIPLICADOR_MES.length - 1)]!
}

const inicioDoMes = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 3, 0, 0))
const fimDoMes = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 3, 0, 0))

/**
 * Ajusta a potência de cada carga para que a PROJEÇÃO do mês corrente caia
 * nos alvos validados. Como energia é linear na potência, um fator por carga basta.
 */
function calibrar(agora: Date, precoKwh: number): Record<string, number> {
  const inicioMes = inicioDoMes(agora)
  const fimMes = fimDoMes(agora)

  const kwh: Record<string, number> = {}
  for (const chave of Object.keys(POTENCIAS)) kwh[chave] = 0

  for (let t = inicioMes.getTime(); t < agora.getTime(); t += MS_FATIA) {
    const { cargas } = consumoNoInstante(new Date(t))
    for (const c of cargas) {
      kwh[c.chave] = (kwh[c.chave] ?? 0) + (c.potencia_w / 1000) * (MINUTOS_POR_FATIA / 60)
    }
  }

  const fatorProjecao =
    (fimMes.getTime() - inicioMes.getTime()) / Math.max(1, agora.getTime() - inicioMes.getTime())

  const escalas: Record<string, number> = {}
  for (const chave of Object.keys(POTENCIAS)) {
    const custoProjetado = kwh[chave]! * fatorProjecao * precoKwh
    const alvo = ALVO_MENSAL_BRL[chave]!
    const bruto = custoProjetado > 0 ? alvo / custoProjetado : 1
    escalas[chave] = Number(Math.min(1.6, Math.max(0.5, bruto)).toFixed(4))
  }
  return escalas
}

// ── Geração ──────────────────────────────────────────────────────────────────

function confiancaDe(potencia: number) {
  return detectorRef.atribuirDegrau(potencia)?.confianca ?? 0.85
}

function gerar(
  inicio: Date,
  fim: Date,
  dispositivoId: string,
  tarifaId: string,
  precoKwh: number,
  escalas: Record<string, number>,
  aparelhos: Map<string, string>,
  tempoIds: Map<string, number>,
) {
  const leituras: LinhaLeitura[] = []
  const eventos: LinhaEvento[] = []
  const serie: AmostraAgregada[] = []
  const ligadoDesde = new Map<string, { desde: Date; potencia: number }>()

  const chaveTempo = (d: Date) => `${d.toISOString().slice(0, 10)}T${d.getUTCHours()}`

  const tempoIdDe = (d: Date) => {
    const id = tempoIds.get(chaveTempo(d))
    if (!id) throw new Error(`dim_tempo sem linha para ${chaveTempo(d)}`)
    return id
  }

  const fecharCiclo = (chave: string, fimCiclo: Date) => {
    const aberto = ligadoDesde.get(chave)
    if (!aberto) return
    ligadoDesde.delete(chave)

    const minutos = (fimCiclo.getTime() - aberto.desde.getTime()) / 60_000
    const energia = (aberto.potencia / 1000) * (minutos / 60)
    const aparelhoId = aparelhos.get(chave)
    if (!aparelhoId) return

    eventos.push({
      aparelho_id: aparelhoId,
      dispositivo_id: dispositivoId,
      tempo_id: tempoIdDe(fimCiclo),
      tipo_evento: 'desligou',
      potencia_w: Number(aberto.potencia.toFixed(2)),
      duracao_minutos: Number(minutos.toFixed(2)),
      energia_kwh: Number(energia.toFixed(6)),
      custo_brl: Number((energia * precoKwh).toFixed(4)),
      confianca_deteccao: confiancaDe(aberto.potencia),
      registrado_em: fimCiclo.toISOString(),
    })
  }

  for (let t = inicio.getTime(); t < fim.getTime(); t += MS_FATIA) {
    const instante = new Date(t)
    const mult = multiplicadorMes(instante, fim)

    const escalasDoMes: Record<string, number> = {}
    for (const [k, v] of Object.entries(escalas)) escalasDoMes[k] = v * mult

    const { agregado_w, cargas } = consumoNoInstante(instante, escalasDoMes)
    const energia = (agregado_w / 1000) * (MINUTOS_POR_FATIA / 60)

    leituras.push({
      dispositivo_id: dispositivoId,
      tempo_id: tempoIdDe(instante),
      tarifa_id: tarifaId,
      potencia_instantanea_w: Number(agregado_w.toFixed(2)),
      energia_kwh: Number(energia.toFixed(6)),
      custo_estimado_brl: Number((energia * precoKwh).toFixed(4)),
      registrado_em: instante.toISOString(),
    })
    serie.push({ registrado_em: instante.toISOString(), potencia_w: agregado_w })

    const ativas = new Map(cargas.map((c) => [c.chave, c.potencia_w]))

    for (const chave of [...ligadoDesde.keys()]) {
      if (!ativas.has(chave)) fecharCiclo(chave, instante)
    }

    for (const [chave, potencia] of ativas) {
      if (ligadoDesde.has(chave)) continue
      const aparelhoId = aparelhos.get(chave)
      if (!aparelhoId) continue

      ligadoDesde.set(chave, { desde: instante, potencia })
      eventos.push({
        aparelho_id: aparelhoId,
        dispositivo_id: dispositivoId,
        tempo_id: tempoIdDe(instante),
        tipo_evento: 'ligou',
        potencia_w: Number(potencia.toFixed(2)),
        duracao_minutos: 0,
        energia_kwh: 0,
        custo_brl: 0,
        confianca_deteccao: confiancaDe(potencia),
        registrado_em: instante.toISOString(),
      })
    }
  }

  for (const chave of [...ligadoDesde.keys()]) {
    fecharCiclo(chave, new Date(fim.getTime() - MS_FATIA))
  }

  return { leituras, eventos, serie }
}

// ── dim_tempo ────────────────────────────────────────────────────────────────

async function carregarDimTempo(inicio: Date, fim: Date) {
  const linhas: any[] = []
  const umaHora = 3600_000
  const primeiro = new Date(Math.floor(inicio.getTime() / umaHora) * umaHora)

  for (let t = primeiro.getTime(); t <= fim.getTime() + umaHora; t += umaHora) {
    const d = new Date(t)
    const diaSemana = d.getUTCDay()
    linhas.push({
      data: d.toISOString().slice(0, 10),
      ano: d.getUTCFullYear(),
      mes: d.getUTCMonth() + 1,
      dia: d.getUTCDate(),
      hora: d.getUTCHours(),
      dia_semana: diaSemana,
      eh_fim_de_semana: diaSemana === 0 || diaSemana === 6,
    })
  }

  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await db
      .from('dim_tempo')
      .upsert(linhas.slice(i, i + 500), { onConflict: 'data,hora', ignoreDuplicates: true })
    if (error) throw new Error(`Falha ao popular dim_tempo: ${error.message}`)
  }

  // Relê com paginação — o PostgREST limita o tamanho da página.
  const mapa = new Map<string, number>()
  const dataInicio = primeiro.toISOString().slice(0, 10)
  const dataFim = new Date(fim.getTime() + umaHora).toISOString().slice(0, 10)

  for (let pagina = 0; ; pagina++) {
    const de = pagina * 1000
    const { data, error } = await db
      .from('dim_tempo')
      .select('id, data, hora')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('id')
      .range(de, de + 999)

    if (error) throw new Error(`Falha ao ler dim_tempo: ${error.message}`)
    for (const l of data ?? []) mapa.set(`${l.data}T${l.hora}`, l.id)
    if (!data || data.length < 1000) break
  }

  return mapa
}

// ── Escrita e conferência ────────────────────────────────────────────────────

async function inserirEmLotes(tabela: string, linhas: any[], tamanho: number) {
  for (let i = 0; i < linhas.length; i += tamanho) {
    const { error } = await db.from(tabela).insert(linhas.slice(i, i + tamanho))
    if (error) throw new Error(`Falha ao inserir em ${tabela}: ${error.message}`)
    process.stdout.write(
      `\r[seed] ${tabela}: ${Math.min(i + tamanho, linhas.length)}/${linhas.length}`,
    )
  }
  process.stdout.write('\n')
}

async function conferir(
  agora: Date,
  precoKwh: number,
  serie: AmostraAgregada[],
  dispositivoId: string,
  usuarioId: string,
) {
  const inicioMes = inicioDoMes(agora)
  const fimMes = fimDoMes(agora)
  const fatorProjecao =
    (fimMes.getTime() - inicioMes.getTime()) / Math.max(1, agora.getTime() - inicioMes.getTime())

  const { data: resumo } = await db.rpc('resumo_periodo', {
    p_dispositivo: dispositivoId,
    p_inicio: inicioMes.toISOString(),
    p_fim: fimMes.toISOString(),
  })
  const { data: porAparelho } = await db.rpc('custo_por_aparelho', {
    p_usuario: usuarioId,
    p_inicio: inicioMes.toISOString(),
    p_fim: fimMes.toISOString(),
  })

  const acumulado = Number((resumo as any[])?.[0]?.total_brl ?? 0)
  const projecao = acumulado * fatorProjecao
  const somaEventos = ((porAparelho ?? []) as any[]).reduce((a, x) => a + Number(x.custo_brl), 0)

  log('')
  log('── conferência dos valores validados ───────────────────────────')
  log(`gasto do mês (projeção) ... ${brl(projecao)}   [alvo ${brl(ALVO_TOTAL_BRL)}]`)
  for (const a of ((porAparelho ?? []) as any[]).slice(0, 6)) {
    const chave = CATALOGO.find((c) => c.nome === a.nome)?.chave
    const alvo = chave ? ALVO_MENSAL_BRL[chave] : undefined
    const proj = Number(a.custo_brl) * fatorProjecao
    log(
      `  ${String(a.nome).padEnd(20)} ${brl(proj).padStart(9)}` +
        (alvo !== undefined ? `   [alvo ${brl(alvo)}]` : ''),
    )
  }
  log(
    `soma dos eventos (${brl(somaEventos)}) <= agregado (${brl(acumulado)}): ` +
      (somaEventos <= acumulado + 0.01 ? 'OK' : 'FALHOU'),
  )

  const pico = serie.filter((s) => {
    const h = new Date(Date.parse(s.registrado_em) - 3 * 3600_000).getUTCHours()
    return h >= 20 && h <= 22
  })
  const medioPico = pico.reduce((a, s) => a + s.potencia_w, 0) / Math.max(1, pico.length)
  log(`consumo típico no pico ..... ${Math.round(medioPico)} W   [alvo 1.340 W]`)

  const detectados = detectorRef.detectar(serie)
  log(
    `NILM (${detectorRef.nome}@${detectorRef.versao}): ${detectados.length} degraus detectados ` +
      `em ${serie.length} amostras`,
  )
  log(`tarifa efetiva: R$${precoKwh.toFixed(5)}/kWh · consumo de base ${STANDBY_W} W`)
  log('────────────────────────────────────────────────────────────────')
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const agora = alinharNaFatia(new Date())
  const inicio = new Date(agora.getTime() - DIAS * 86400_000)

  log(
    `janela: ${inicio.toISOString().slice(0, 10)} -> ${agora
      .toISOString()
      .slice(0, 10)} (${DIAS} dias)`,
  )

  const tarifa = await carregarTarifa()
  const precoKwh = tarifa.tarifa_kwh + tarifa.adicional_bandeira
  log(
    `tarifa: R$${tarifa.tarifa_kwh.toFixed(2)}/kWh + bandeira ${tarifa.bandeira} ` +
      `(R$${tarifa.adicional_bandeira.toFixed(5)}) = R$${precoKwh.toFixed(5)}/kWh`,
  )

  const { usuarioId, dispositivoId } = await garantirConta()
  const aparelhos = await garantirAparelhosDoPerfil(usuarioId)
  await limparFatos(dispositivoId)

  const escalas = calibrar(agora, precoKwh)
  log(
    'calibração: ' +
      Object.entries(escalas)
        .map(([k, v]) => `${k} x${v.toFixed(3)}`)
        .join(' · '),
  )

  const tempoIds = await carregarDimTempo(inicio, agora)
  log(`dim_tempo: ${tempoIds.size} horas disponíveis`)

  const { leituras, eventos, serie } = gerar(
    inicio,
    agora,
    dispositivoId,
    tarifa.id,
    precoKwh,
    escalas,
    aparelhos,
    tempoIds,
  )
  log(`gerado: ${leituras.length} leituras · ${eventos.length} eventos`)

  await inserirEmLotes('fato_leitura_agregada', leituras, 500)
  await inserirEmLotes('fato_evento_aparelho', eventos, 500)

  await db
    .from('dim_dispositivo')
    .update({ status_conexao: 'online', ultimo_contato: agora.toISOString(), sinal_wifi: -54 })
    .eq('id', dispositivoId)

  await conferir(agora, precoKwh, serie, dispositivoId, usuarioId)

  log('')
  log('acesso ao protótipo:')
  log(`  e-mail: ${EMAIL}`)
  log(`  senha:  ${SENHA}`)
  log('')
}

main().catch((e) => {
  console.error('\n[seed] falhou:', e instanceof Error ? e.message : e)
  process.exit(1)
})
