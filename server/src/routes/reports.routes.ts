import { Router } from 'express'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { dispositivoDoUsuario } from '../services/dispositivo.js'
import { MESES_PT, janelaMes, projetarMes } from '../services/periodos.js'
import { bandeiraApresentavel, tarifaVigente } from '../services/tarifa.js'

export const reportsRouter = Router()

const brl = (v: number) => `R$${v.toFixed(2).replace('.', ',')}`

// GET /reports/monthly -- consolidacao do ciclo + economia acumulada
reportsRouter.get(
  '/monthly',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const dispositivo = await dispositivoDoUsuario(usuario.id)
    const mes = janelaMes()

    const [resumo, aparelhos, historico, tarifa] = await Promise.all([
      db.rpc('resumo_periodo', {
        p_dispositivo: dispositivo.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_mensal', { p_dispositivo: dispositivo.id, p_meses: 6 }),
      tarifaVigente(),
    ])

    const totalBrl = Number(Number(resumo.data?.[0]?.total_brl ?? 0).toFixed(2))
    const totalKwh = Number(Number(resumo.data?.[0]?.total_kwh ?? 0).toFixed(2))

    // ── Distribuicao por aparelho (top 3 + "Outros") ──────────────────────────
    const ordenados = ((aparelhos.data ?? []) as any[])
      .map((a) => ({ nome: a.nome as string, custo_brl: Number(Number(a.custo_brl).toFixed(2)) }))
      .filter((a) => a.custo_brl > 0)

    const principais = ordenados.slice(0, 3)
    const restante = ordenados.slice(3).reduce((acc, a) => acc + a.custo_brl, 0)
    const fatias = restante > 0.005
      ? [...principais, { nome: 'Outros', custo_brl: Number(restante.toFixed(2)) }]
      : principais

    // ── Historico e economia acumulada ────────────────────────────────────────
    const serieHistorico = ((historico.data ?? []) as any[]).map((m) => ({
      rotulo: MESES_PT[Number(m.mes) - 1] ?? String(m.mes),
      ano: Number(m.ano),
      mes: Number(m.mes),
      custo_brl: Number(m.total_brl),
      energia_kwh: Number(m.total_kwh),
    }))

    // Meses fechados anteriores ao atual servem de linha de base.
    const anteriores = serieHistorico.slice(0, -1)
    const mediaAnterior =
      anteriores.length > 0
        ? anteriores.reduce((acc, m) => acc + m.custo_brl, 0) / anteriores.length
        : 0

    // O ciclo corrente ainda esta aberto: comparar o acumulado parcial contra
    // meses fechados inflaria a economia. A comparacao usa a projecao do mes.
    const projecao = projetarMes(totalBrl)
    const economia = mediaAnterior > 0 ? mediaAnterior - projecao : 0
    const economiaPct = mediaAnterior > 0 ? (economia / mediaAnterior) * 100 : 0

    // ── Dica personalizada a partir do maior ofensor ───────────────────────────
    const maior = principais[0]
    const dica = maior
      ? `${maior.nome} responde por ${Math.round(
          (maior.custo_brl / Math.max(totalBrl, 0.01)) * 100,
        )}% da conta (${brl(maior.custo_brl)}). Concentrar o uso fora do pico (18h-21h) e o ajuste com maior efeito neste ciclo.`
      : 'Ainda nao ha leituras suficientes neste ciclo para gerar uma recomendacao.'

    res.json({
      periodo: {
        inicio: mes.inicio.toISOString(),
        fim: mes.fim.toISOString(),
        rotulo: `${MESES_PT[new Date(mes.inicio.getTime() + 3600_000).getUTCMonth()]}`,
      },
      total_brl: totalBrl,
      total_kwh: totalKwh,
      projecao_brl: Number(projecao.toFixed(2)),
      tarifa_media_brl_kwh: totalKwh > 0 ? Number((totalBrl / totalKwh).toFixed(4)) : 0,
      distribuicao: fatias,
      historico: serieHistorico,
      economia_acumulada: {
        valor_brl: Number(economia.toFixed(2)),
        variacao_pct: Number(economiaPct.toFixed(1)),
        media_meses_anteriores_brl: Number(mediaAnterior.toFixed(2)),
        meses_comparados: anteriores.length,
      },
      bandeira: bandeiraApresentavel(tarifa),
      dica,
    })
  }),
)
