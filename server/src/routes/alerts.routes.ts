import { Router } from 'express'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { dispositivoDoUsuario, estadoAparelhos } from '../services/dispositivo.js'
import { janelaMes, janelaMesAnterior } from '../services/periodos.js'
import { mediaDaCategoria } from '../services/referencias.js'

export const alertsRouter = Router()

type Tipo = 'over-average' | 'no-signal' | 'achievement'

interface Alerta {
  id: string
  tipo: Tipo
  titulo: string
  detalhe: string
  em: string | null
  aparelho_id?: string
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return '--'
  const ms = Date.now() - Date.parse(iso)
  const min = Math.floor(ms / 60000)
  if (min < 2) return 'agora'
  if (min < 60) return `ha ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `ha ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `ha ${d} dias`
}

const brl = (v: number) => `R$${v.toFixed(2).replace('.', ',')}`

// GET /alerts -- alertas derivados do estado atual e do historico
alertsRouter.get(
  '/',
  exigirAutenticacao,
  async_(async (req, res) => {
    const usuario = req.usuario!
    const mes = janelaMes()
    const anterior = janelaMesAnterior()

    const [atual, passado, estado, saude] = await Promise.all([
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: mes.inicio.toISOString(),
        p_fim: mes.fim.toISOString(),
      }),
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: anterior.inicio.toISOString(),
        p_fim: anterior.fim.toISOString(),
      }),
      estadoAparelhos(usuario.id),
      db.rpc('saude_aparelhos', { p_usuario: usuario.id }),
    ])

    // Ritmo próprio de cada aparelho (p90 do intervalo entre eventos, 14 dias).
    const ritmo = new Map(
      ((saude.data ?? []) as any[]).map((s) => [
        s.aparelho_id as string,
        {
          ultimo: s.ultimo_evento_em as string | null,
          gapP90Min: Number(s.gap_p90_min ?? 0),
          eventos14d: Number(s.eventos_14d ?? 0),
        },
      ]),
    )

    const custoAnterior = new Map(
      ((passado.data ?? []) as any[]).map((a) => [a.aparelho_id, Number(a.custo_brl)]),
    )

    const alertas: Alerta[] = []

    for (const a of (atual.data ?? []) as any[]) {
      const custo = Number(a.custo_brl)
      const est = estado.get(a.aparelho_id)
      const media = mediaDaCategoria(a.categoria)
      const anteriorCusto = custoAnterior.get(a.aparelho_id) ?? 0

      // 1. Carga ligada agora e acima da media da categoria
      if (est?.status === 'on' && media > 0 && custo > media) {
        const pct = Math.round(((custo - media) / media) * 100)
        alertas.push({
          id: `acima-${a.aparelho_id}`,
          tipo: 'over-average',
          titulo: `${a.nome} ${pct}% acima da media`,
          detalhe: `Custo no mes ${brl(custo)} contra ${brl(media)} em residencias equivalentes.`,
          em: est.registrado_em,
          aparelho_id: a.aparelho_id,
        })
      }

      // 2. Assinatura perdida — silencio muito acima do ritmo do proprio aparelho.
      const r = ritmo.get(a.aparelho_id)
      if (r && r.eventos14d >= 4 && r.ultimo) {
        const silencioMin = (Date.now() - Date.parse(r.ultimo)) / 60_000
        // Tolera 1,5x o maior intervalo habitual, com piso de 90 min.
        const limite = Math.max(90, r.gapP90Min * 1.5)
        if (silencioMin > limite) {
          const horas = Math.floor(silencioMin / 60)
          alertas.push({
            id: `sem-sinal-${a.aparelho_id}`,
            tipo: 'no-signal',
            titulo: `${a.nome} sem leitura ha ${horas >= 1 ? horas + 'h' : Math.floor(silencioMin) + ' min'}`,
            detalhe:
              `O NILM nao detecta a assinatura deste aparelho ha ${Math.floor(silencioMin)} min, ` +
              `bem acima do ritmo habitual (${Math.round(r.gapP90Min)} min). Verifique o sensor.`,
            em: r.ultimo,
            aparelho_id: a.aparelho_id,
          })
        }
      }

      // 3. Conquista: reducao real contra o mes anterior
      if (anteriorCusto > 0 && custo > 0 && custo < anteriorCusto * 0.95) {
        const pct = Math.round(((anteriorCusto - custo) / anteriorCusto) * 100)
        alertas.push({
          id: `conquista-${a.aparelho_id}`,
          tipo: 'achievement',
          titulo: `Reducao conquistada: -${pct}% em ${a.nome}`,
          detalhe: `Gasto abaixo do mes anterior (${brl(anteriorCusto)} -> ${brl(custo)}). Continue assim.`,
          em: est?.registrado_em ?? null,
          aparelho_id: a.aparelho_id,
        })
      }
    }

    // 4. Sensor mudo: o proprio Amperê Node parou de reportar.
    const dispositivo = await dispositivoDoUsuario(usuario.id)
    const minutosMudo = dispositivo.ultimo_contato
      ? (Date.now() - Date.parse(dispositivo.ultimo_contato)) / 60_000
      : Infinity
    if (minutosMudo > 30) {
      alertas.unshift({
        id: 'sensor-mudo',
        tipo: 'no-signal',
        titulo: 'Sensor sem comunicacao',
        detalhe: Number.isFinite(minutosMudo)
          ? `O Amperê Node nao envia leituras ha ${Math.floor(minutosMudo)} min. Sem isso o NILM para de identificar cargas.`
          : 'O Amperê Node nunca reportou. Rode o simulador ou ligue o dispositivo.',
        em: dispositivo.ultimo_contato,
      })
    }

    const ordem: Record<Tipo, number> = { 'no-signal': 0, 'over-average': 1, achievement: 2 }
    alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo])

    res.json({
      alertas: alertas.map((a) => ({ ...a, ha: tempoRelativo(a.em) })),
      total: alertas.length,
    })
  }),
)
