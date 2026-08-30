import { db } from '../lib/supabase.js'
import { detector } from '../nilm/index.js'
import type { AmostraAgregada } from '../nilm/index.js'
import { tarifaEfetiva, tarifaVigente } from './tarifa.js'
import { tempoIdPara } from './tempo.js'
import { garantirAparelhos } from './aparelhos.js'

export interface LeituraBruta {
  registrado_em: string
  potencia_w: number
}

const INTERVALO_PADRAO_MIN = 15

/**
 * Grava as leituras agregadas e roda o NILM sobre a janela recebida.
 * E o mesmo caminho usado pelo simulador e, no futuro, pelo ESP32 real.
 */
export async function registrarLeituras(
  dispositivoId: string,
  usuarioId: string,
  leituras: LeituraBruta[],
) {
  const tarifa = await tarifaVigente()
  const precoKwh = tarifaEfetiva(tarifa)

  const ordenadas = [...leituras].sort(
    (a, b) => Date.parse(a.registrado_em) - Date.parse(b.registrado_em),
  )

  // Leitura imediatamente anterior no banco: serve de base para o intervalo da
  // primeira amostra do lote e de contexto para o NILM na fronteira.
  const contexto = await janelaAnterior(dispositivoId, ordenadas[0]!.registrado_em)

  const linhas = []
  for (let i = 0; i < ordenadas.length; i++) {
    const l = ordenadas[i]!
    const instante = new Date(l.registrado_em)
    const anterior = i > 0 ? ordenadas[i - 1] : contexto[0]
    const minutos = anterior
      ? Math.min(60, Math.max(0.05, (instante.getTime() - Date.parse(anterior.registrado_em)) / 60000))
      : INTERVALO_PADRAO_MIN

    const energia = (l.potencia_w / 1000) * (minutos / 60)

    linhas.push({
      dispositivo_id: dispositivoId,
      tempo_id: await tempoIdPara(instante),
      tarifa_id: tarifa.id,
      potencia_instantanea_w: Number(l.potencia_w.toFixed(2)),
      energia_kwh: Number(energia.toFixed(6)),
      custo_estimado_brl: Number((energia * precoKwh).toFixed(4)),
      registrado_em: instante.toISOString(),
    })
  }

  // ignoreDuplicates + select devolve SO as linhas realmente inseridas.
  const { data: inseridas, error: erroLeituras } = await db
    .from('fato_leitura_agregada')
    .upsert(linhas, { onConflict: 'dispositivo_id,registrado_em', ignoreDuplicates: true })
    .select('registrado_em')

  if (erroLeituras) throw new Error(`Falha ao gravar leituras: ${erroLeituras.message}`)

  // Instantes que ainda nao existiam. So eles alimentam o NILM: rodar o
  // detector sobre leitura ja processada gera evento novo a cada reenvio,
  // porque o ruido do sensor desloca degraus e muda a atribuicao. O resultado
  // seria custo inflado a cada reprocessamento.
  const novosInstantes = new Set(
    (inseridas ?? []).map((l) => Date.parse(l.registrado_em as string)),
  )

  // ultimo_contato e QUANDO o dispositivo falou com a API, nao o instante da
  // leitura. Um backfill de dados antigos nao pode fazer um sensor que acabou
  // de reportar parecer offline.
  await db
    .from('dim_dispositivo')
    .update({ status_conexao: 'online', ultimo_contato: new Date().toISOString() })
    .eq('id', dispositivoId)

  if (novosInstantes.size === 0) {
    return {
      leituras_gravadas: 0,
      leituras_ignoradas: linhas.length,
      eventos_detectados: 0,
      eventos_novos: 0,
    }
  }

  // O contexto anterior entra na serie para o detector enxergar o degrau na
  // fronteira do lote, mas so vira evento o que cai num instante novo.
  const serie: AmostraAgregada[] = [
    ...contexto,
    ...ordenadas.map((l) => ({ registrado_em: l.registrado_em, potencia_w: l.potencia_w })),
  ]

  const detectados = detector
    .detectar(serie)
    .filter((e) => novosInstantes.has(Date.parse(e.registrado_em)))

  if (detectados.length === 0) {
    return {
      leituras_gravadas: novosInstantes.size,
      leituras_ignoradas: linhas.length - novosInstantes.size,
      eventos_detectados: 0,
      eventos_novos: 0,
    }
  }

  const mapa = await garantirAparelhos(usuarioId, [
    ...new Set(detectados.map((e) => e.chave_aparelho)),
  ])

  const eventos = []
  for (const e of detectados) {
    const aparelhoId = mapa.get(e.chave_aparelho)
    if (!aparelhoId) continue

    const instante = new Date(e.registrado_em)
    let duracaoMin = 0
    let energia = 0

    if (e.tipo_evento === 'desligou') {
      const { data: ligou } = await db
        .from('fato_evento_aparelho')
        .select('registrado_em, potencia_w')
        .eq('aparelho_id', aparelhoId)
        .eq('tipo_evento', 'ligou')
        .lt('registrado_em', instante.toISOString())
        .order('registrado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ligou) {
        duracaoMin = Math.max(0, (instante.getTime() - Date.parse(ligou.registrado_em)) / 60000)
        if (duracaoMin > 24 * 60) duracaoMin = 0
        energia = (Number(ligou.potencia_w) / 1000) * (duracaoMin / 60)
      }
    }

    eventos.push({
      aparelho_id: aparelhoId,
      dispositivo_id: dispositivoId,
      tempo_id: await tempoIdPara(instante),
      tipo_evento: e.tipo_evento,
      potencia_w: e.potencia_w,
      duracao_minutos: Number(duracaoMin.toFixed(2)),
      energia_kwh: Number(energia.toFixed(6)),
      custo_brl: Number((energia * precoKwh).toFixed(4)),
      confianca_deteccao: e.confianca,
      registrado_em: instante.toISOString(),
    })
  }

  // Idempotente: reprocessar a mesma janela (batch rodado duas vezes, ou buffer
  // reenviado pelo ESP32 apos queda de rede) nao duplica o evento -- o mesmo
  // aparelho, no mesmo instante, com a mesma transicao e o mesmo evento.
  const { data: gravados, error: erroEventos } = await db
    .from('fato_evento_aparelho')
    .upsert(eventos, {
      onConflict: 'aparelho_id,registrado_em,tipo_evento',
      ignoreDuplicates: true,
    })
    .select('id')

  if (erroEventos) throw new Error(`Falha ao gravar eventos: ${erroEventos.message}`)

  return {
    leituras_gravadas: novosInstantes.size,
    leituras_ignoradas: linhas.length - novosInstantes.size,
    eventos_detectados: eventos.length,
    eventos_novos: gravados?.length ?? 0,
  }
}

/** Ultima leitura antes do lote, para detectar degrau na fronteira. */
async function janelaAnterior(dispositivoId: string, desde: string): Promise<AmostraAgregada[]> {
  const { data } = await db
    .from('fato_leitura_agregada')
    .select('registrado_em, potencia_instantanea_w')
    .eq('dispositivo_id', dispositivoId)
    .lt('registrado_em', desde)
    .order('registrado_em', { ascending: false })
    .limit(1)

  return (data ?? []).map((l) => ({
    registrado_em: l.registrado_em,
    potencia_w: Number(l.potencia_instantanea_w),
  }))
}
