import { Router } from 'express'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { dispositivoDoUsuario, estadoAparelhos, ultimaLeitura } from '../services/dispositivo.js'
import {
  estimarMes,
  janela24h,
  janela30d,
  janelaHoje,
  janelaMes,
  janelaMesAnterior,
} from '../services/periodos.js'
import { bandeiraApresentavel, tarifaVigente } from '../services/tarifa.js'

export const dashboardRouter = Router()

const rotuloHora = (h: number) => `${String(h).padStart(2, '0')}h`

// GET /dashboard/summary
dashboardRouter.get(
  '/summary',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const dispositivo = await dispositivoDoUsuario(usuario.id)
    const agora = new Date()

    const mes = janelaMes(agora)
    const mesAnterior = janelaMesAnterior(agora)
    const hoje = janelaHoje(agora)
    const ultimas24h = janela24h(agora)
    const ultimos30d = janela30d(agora)

    const [
      resMes,
      resMesAnterior,
      resHoje,
      serie,
      aparelhos,
      estado,
      tarifa,
      leitura,
      res30d,
      aparelhos30d,
    ] = await Promise.all([
        db.rpc('resumo_periodo', {
          p_dispositivo: dispositivo.id,
          p_inicio: mes.inicio.toISOString(),
          p_fim: mes.fim.toISOString(),
        }),
        db.rpc('resumo_periodo', {
          p_dispositivo: dispositivo.id,
          p_inicio: mesAnterior.inicio.toISOString(),
          p_fim: mesAnterior.fim.toISOString(),
        }),
        db.rpc('resumo_periodo', {
          p_dispositivo: dispositivo.id,
          p_inicio: hoje.inicio.toISOString(),
          p_fim: hoje.fim.toISOString(),
        }),
        db.rpc('serie_por_hora', {
          p_dispositivo: dispositivo.id,
          p_inicio: ultimas24h.inicio.toISOString(),
          p_fim: ultimas24h.fim.toISOString(),
        }),
        db.rpc('custo_por_aparelho', {
          p_usuario: usuario.id,
          p_inicio: mes.inicio.toISOString(),
          p_fim: mes.fim.toISOString(),
        }),
        estadoAparelhos(usuario.id),
        tarifaVigente(),
        ultimaLeitura(dispositivo.id),
        db.rpc('resumo_periodo', {
          p_dispositivo: dispositivo.id,
          p_inicio: ultimos30d.inicio.toISOString(),
          p_fim: ultimos30d.fim.toISOString(),
        }),
        db.rpc('custo_por_aparelho', {
          p_usuario: usuario.id,
          p_inicio: ultimos30d.inicio.toISOString(),
          p_fim: ultimos30d.fim.toISOString(),
        }),
      ])

    const gastoMesAteAgora = Number(resMes.data?.[0]?.total_brl ?? 0)
    const gastoMesAnterior = Number(resMesAnterior.data?.[0]?.total_brl ?? 0)
    const total30d = Number(res30d.data?.[0]?.total_brl ?? 0)
    const projecao = estimarMes(gastoMesAteAgora, total30d, agora)
    const variacao =
      gastoMesAnterior > 0 ? ((projecao - gastoMesAnterior) / gastoMesAnterior) * 100 : 0

    const [resHojeAparelhos] = await Promise.all([
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: hoje.inicio.toISOString(),
        p_fim: hoje.fim.toISOString(),
      }),
    ])

    const horasAtivasHoje = ((resHojeAparelhos.data ?? []) as any[]).reduce(
      (acc, a) => acc + Number(a.horas_ativas ?? 0),
      0,
    )

    // O ranking usa a MESMA estimativa do total do mes: mostrar "gasto estimado
    // R$187" ao lado de um acumulado parcial por aparelho faria os numeros da
    // tela nao fecharem entre si.
    const custo30dPorAparelho = new Map(
      ((aparelhos30d.data ?? []) as any[]).map((a) => [
        a.aparelho_id as string,
        Number(a.custo_brl),
      ]),
    )

    const comEstimativa = ((aparelhos.data ?? []) as any[]).map((a) => ({
      linha: a,
      estimado: estimarMes(
        Number(a.custo_brl),
        custo30dPorAparelho.get(a.aparelho_id) ?? 0,
        agora,
      ),
    }))

    const top = comEstimativa
      .filter((a) => a.estimado > 0)
      .sort((x, y) => y.estimado - x.estimado)
      .slice(0, 3)
      .map(({ linha: a, estimado }) => {
        const est = estado.get(a.aparelho_id)
        return {
          id: a.aparelho_id,
          nome: a.nome,
          categoria: a.categoria,
          custo_brl: Number(estimado.toFixed(2)),
          custo_acumulado_brl: Number(Number(a.custo_brl).toFixed(2)),
          potencia_atual_w: est?.potencia_w ?? 0,
          status: est?.status ?? 'no-signal',
        }
      })

    // Serie de 24h alinhada a hora atual, com buracos preenchidos com 0.
    const porHora = new Map(
      ((serie.data ?? []) as any[]).map((l) => [Number(l.hora), Number(l.potencia_media_w)]),
    )
    const horaAtual = new Date(agora.getTime() - 3 * 3600_000).getUTCHours()
    const serie24h = Array.from({ length: 24 }, (_, i) => {
      const h = (horaAtual + 1 + i) % 24
      return { hora: rotuloHora(h), watts: Math.round(porHora.get(h) ?? 0) }
    })

    res.json({
      gasto_mes: {
        valor_brl: Number(projecao.toFixed(2)),
        acumulado_brl: Number(gastoMesAteAgora.toFixed(2)),
        variacao_pct: Number(variacao.toFixed(1)),
      },
      consumo_agora_w: Math.round(leitura.potencia_w),
      ultima_leitura_em: leitura.registrado_em,
      hoje: {
        gasto_brl: Number(Number(resHoje.data?.[0]?.total_brl ?? 0).toFixed(2)),
        energia_kwh: Number(Number(resHoje.data?.[0]?.total_kwh ?? 0).toFixed(2)),
        horas_ativas: Number(horasAtivasHoje.toFixed(1)),
      },
      top_aparelhos: top,
      bandeira: bandeiraApresentavel(tarifa),
      serie_24h: serie24h,
    })
  }),
)
