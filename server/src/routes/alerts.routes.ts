import { Router } from 'express'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { dispositivoDoUsuario, estadoAparelhos } from '../services/dispositivo.js'
import { estimarMes, janela30d, janelaMes, janelaMesAnterior } from '../services/periodos.js'
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
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
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
    const ultimos30d = janela30d()

    const [atual, passado, trinta, estado, saude] = await Promise.all([
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
      db.rpc('custo_por_aparelho', {
        p_usuario: usuario.id,
        p_inicio: ultimos30d.inicio.toISOString(),
        p_fim: ultimos30d.fim.toISOString(),
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

    const custo30d = new Map(
      ((trinta.data ?? []) as any[]).map((a) => [a.aparelho_id as string, Number(a.custo_brl)]),
    )
    const alertas: Alerta[] = []

    for (const a of (atual.data ?? []) as any[]) {
      const custo = Number(a.custo_brl)
      const custoProjetado = estimarMes(custo, custo30d.get(a.aparelho_id) ?? 0)
      const est = estado.get(a.aparelho_id)
      const media = mediaDaCategoria(a.categoria)
      const anteriorCusto = custoAnterior.get(a.aparelho_id) ?? 0

      // 1. Gasto do mes acima da media da categoria.
      // Nao exige a carga ligada AGORA: e uma afirmacao sobre o mes, nao sobre
      // o instante. Exigir 'on' fazia o alerta sumir sempre que o aparelho
      // estivesse desligado, que e a maior parte do dia.
      if (media > 0 && custoProjetado > media) {
        const pct = Math.round(((custoProjetado - media) / media) * 100)
        alertas.push({
          id: `acima-${a.aparelho_id}`,
          tipo: 'over-average',
          titulo: `${a.nome} ${pct}% acima da média`,
          detalhe: `Custo estimado do mês ${brl(custoProjetado)} contra ${brl(media)} em residências equivalentes.`,
          em: est?.registrado_em ?? null,
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
            titulo: `${a.nome} sem leitura há ${horas >= 1 ? horas + 'h' : Math.floor(silencioMin) + ' min'}`,
            detalhe:
              `O NILM não detecta a assinatura deste aparelho há ${Math.floor(silencioMin)} min, ` +
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
          titulo: `Redução conquistada: -${pct}% em ${a.nome}`,
          detalhe: `Gasto abaixo do mês anterior (${brl(anteriorCusto)} → ${brl(custo)}). Continue assim.`,
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
        titulo: 'Sensor sem comunicação',
        detalhe: Number.isFinite(minutosMudo)
          ? `O Amperê Node não envia leituras há ${Math.floor(minutosMudo)} min. Sem isso o NILM para de identificar cargas.`
          : 'O Amperê Node nunca reportou. Rode o simulador ou ligue o dispositivo.',
        em: dispositivo.ultimo_contato,
      })
    }

    const ordem: Record<Tipo, number> = { 'no-signal': 0, 'over-average': 1, achievement: 2 }
    alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo])

    // Uma conquista por aparelho vira seis cards identicos e afoga o que
    // importa. Mantem so as duas maiores reducoes.
    const conquistas = alertas.filter((a) => a.tipo === 'achievement').slice(0, 2)
    const relevantes = [...alertas.filter((a) => a.tipo !== 'achievement'), ...conquistas]

    res.json({
      alertas: relevantes.map((a) => ({ ...a, ha: tempoRelativo(a.em) })),
      total: relevantes.length,
    })
  }),
)
