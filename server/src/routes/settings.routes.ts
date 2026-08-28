import { Router } from 'express'
import { z } from 'zod'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'
import { requisicaoInvalida } from '../lib/errors.js'
import { dispositivoDoUsuario } from '../services/dispositivo.js'
import { listarPlanos } from '../services/planos.js'
import { bandeiraApresentavel, tarifaVigente } from '../services/tarifa.js'

export const settingsRouter = Router()

const atualizacaoSchema = z
  .object({
    nome: z.string().min(2).optional(),
    tipo_imovel: z.enum(['apartamento', 'casa']).optional(),
    plano: z.enum(['free', 'pro']).optional(),
    apelido_dispositivo: z.string().min(2).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nenhum campo para atualizar' })

async function montarSettings(usuarioId: string) {
  const [dispositivo, planos, tarifa, perfil] = await Promise.all([
    dispositivoDoUsuario(usuarioId),
    listarPlanos(),
    tarifaVigente(),
    db
      .from('dim_usuario')
      .select('id, nome, email, tipo_imovel, plano, criado_em')
      .eq('id', usuarioId)
      .single(),
  ])

  const minutosSemContato = dispositivo.ultimo_contato
    ? (Date.now() - Date.parse(dispositivo.ultimo_contato)) / 60000
    : null

  return {
    usuario: perfil.data,
    plano_ativo: planos.find(
      (p) => p.nome.toLowerCase() === (perfil.data?.plano ?? 'free').toLowerCase(),
    ) ?? null,
    planos,
    sensor: {
      id: dispositivo.id,
      apelido: dispositivo.apelido,
      status: minutosSemContato === null || minutosSemContato > 15 ? 'offline' : 'online',
      versao_firmware: dispositivo.versao_firmware,
      sinal_wifi_dbm: dispositivo.sinal_wifi,
      ultimo_contato: dispositivo.ultimo_contato,
      minutos_sem_contato:
        minutosSemContato === null ? null : Number(minutosSemContato.toFixed(1)),
    },
    tarifa: bandeiraApresentavel(tarifa),
  }
}

// GET /settings
settingsRouter.get(
  '/',
  exigirAutenticacao,
  async_(async (req, res) => {
    res.json(await montarSettings(req.usuario!.id))
  }),
)

// PUT /settings
settingsRouter.put(
  '/',
  exigirAutenticacao,
  async_(async (req, res) => {
    const body = atualizacaoSchema.parse(req.body)
    const usuarioId = req.usuario!.id

    const camposUsuario: Record<string, unknown> = {}
    if (body.nome) camposUsuario.nome = body.nome
    if (body.tipo_imovel) camposUsuario.tipo_imovel = body.tipo_imovel
    if (body.plano) camposUsuario.plano = body.plano

    if (Object.keys(camposUsuario).length > 0) {
      const { error } = await db.from('dim_usuario').update(camposUsuario).eq('id', usuarioId)
      if (error) throw requisicaoInvalida(`Falha ao atualizar perfil: ${error.message}`)
    }

    if (body.apelido_dispositivo) {
      const dispositivo = await dispositivoDoUsuario(usuarioId)
      const { error } = await db
        .from('dim_dispositivo')
        .update({ apelido: body.apelido_dispositivo })
        .eq('id', dispositivo.id)
      if (error) throw requisicaoInvalida(`Falha ao atualizar sensor: ${error.message}`)
    }

    res.json(await montarSettings(usuarioId))
  }),
)
