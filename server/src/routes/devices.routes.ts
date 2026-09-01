import { Router } from 'express'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { naoEncontrado } from '../lib/errors.js'
import { dispositivoDoUsuario, estadoAparelhos } from '../services/dispositivo.js'
import { estimarMes, janela24h, janela30d, janelaMes } from '../services/periodos.js'
import { mediaDaCategoria } from '../services/referencias.js'
import { calcularRoi } from '../services/roi.js'
import { PLANO_PRO } from '../services/planos.js'

export const devicesRouter = Router()

const rotuloHora = (h: number) => `${String(h).padStart(2, '0')}h`

// GET /devices -- inventario de cargas identificadas pelo NILM
devicesRouter.get(
  '/',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const mes = janelaMes()
    const ultimos30d = janela30d()

    const [aparelhos, aparelhos30d, estado] = await Promise.all([
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: ultimos30d.inicio.toISOString(),
        p_fim: ultimos30d.fim.toISOString(),
      }),
      estadoAparelhos(usuario.id),
    ])

    const em30d = new Map(
      ((aparelhos30d.data ?? []) as any[]).map((a) => [
        a.aparelho_id as string,
        { custo: Number(a.custo_brl), energia: Number(a.energia_kwh) },
      ]),
    )

    // Mesma base do dashboard: estimativa de fechamento do mes.
    const lista = ((aparelhos.data ?? []) as any[])
      .map((a) => {
        const est = estado.get(a.aparelho_id)
        const ref = em30d.get(a.aparelho_id) ?? { custo: 0, energia: 0 }
        return {
          id: a.aparelho_id,
          nome: a.nome,
          categoria: a.categoria,
          potencia_nominal_w: a.potencia_nominal_w,
          status: est?.status ?? 'no-signal',
          potencia_atual_w: est?.potencia_w ?? 0,
          custo_mes_brl: Number(estimarMes(Number(a.custo_brl), ref.custo).toFixed(2)),
          custo_acumulado_brl: Number(Number(a.custo_brl).toFixed(2)),
          energia_mes_kwh: Number(estimarMes(Number(a.energia_kwh), ref.energia).toFixed(2)),
          horas_ativas_mes: Number(a.horas_ativas ?? 0),
          media_categoria_brl: mediaDaCategoria(a.categoria),
        }
      })
      .sort((x, y) => y.custo_mes_brl - x.custo_mes_brl)

    res.json({
      aparelhos: lista,
      total_ativo_w: lista.reduce((acc, a) => acc + a.potencia_atual_w, 0),
      ligados: lista.filter((a) => a.status === 'on').length,
    })
  }),
)

// GET /devices/:id -- detalhe, curva de 24h e recomendacao de ROI
devicesRouter.get(
  '/:id',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const { id } = req.params

    const { data: aparelho } = await db
      .from('dim_aparelho')
      .select('id, nome, categoria, potencia_nominal_w, identificado_em')
      .eq('id', id)
      .eq('usuario_id', usuario.id)
      .maybeSingle()

    if (!aparelho) throw naoEncontrado('Aparelho não encontrado no inventário')

    const mes = janelaMes()
    const ultimas24h = janela24h()
    const ultimos30d = janela30d()
    await dispositivoDoUsuario(usuario.id)

    const [custos, custos30d, serie, estado] = await Promise.all([
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: ultimos30d.inicio.toISOString(),
        p_fim: ultimos30d.fim.toISOString(),
      }),
      db.rpc('serie_aparelho_por_hora', {
        p_aparelho: id,
        p_inicio: ultimas24h.inicio.toISOString(),
        p_fim: ultimas24h.fim.toISOString(),
      }),
      estadoAparelhos(usuario.id),
    ])

    const linha = ((custos.data ?? []) as any[]).find((a) => a.aparelho_id === id)
    const linha30d = ((custos30d.data ?? []) as any[]).find((a) => a.aparelho_id === id)
    const acumulado = Number(Number(linha?.custo_brl ?? 0).toFixed(2))
    const custoMes = Number(estimarMes(acumulado, Number(linha30d?.custo_brl ?? 0)).toFixed(2))
    const est = estado.get(String(id))

    const porHora = new Map(
      ((serie.data ?? []) as any[]).map((l) => [Number(l.hora), Number(l.potencia_media_w)]),
    )
    const horaAtual = new Date(Date.now() - 3 * 3600_000).getUTCHours()
    const serie24h = Array.from({ length: 24 }, (_, i) => {
      const h = (horaAtual + 1 + i) % 24
      return { hora: rotuloHora(h), watts: Math.round(porHora.get(h) ?? 0) }
    })

    const ehPro = usuario.plano === 'pro'
    const roi = calcularRoi(aparelho.categoria, custoMes)

    res.json({
      aparelho: {
        id: aparelho.id,
        nome: aparelho.nome,
        categoria: aparelho.categoria,
        potencia_nominal_w: aparelho.potencia_nominal_w,
        identificado_em: aparelho.identificado_em,
        status: est?.status ?? 'no-signal',
        potencia_atual_w: est?.potencia_w ?? 0,
        custo_mes_brl: custoMes,
        custo_acumulado_brl: acumulado,
        energia_mes_kwh: Number(
          estimarMes(Number(linha?.energia_kwh ?? 0), Number(linha30d?.energia_kwh ?? 0)).toFixed(2),
        ),
        horas_ativas_mes: Number(linha?.horas_ativas ?? 0),
        media_categoria_brl: mediaDaCategoria(aparelho.categoria),
      },
      serie_24h: serie24h,
      // Recomendacao de ROI e recurso do plano Pro.
      roi: ehPro ? roi : null,
      roi_bloqueado: !ehPro && roi !== null,
      plano_requerido: ehPro ? null : PLANO_PRO,
    })
  }),
)
