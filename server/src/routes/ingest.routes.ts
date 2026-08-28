import { Router } from 'express'
import { z } from 'zod'
import { db } from '../lib/supabase.js'
import { async_ } from '../middleware/erro.js'
import { exigirChaveDispositivo } from '../middleware/auth.js'
import { registrarLeituras } from '../services/ingestao.js'
import { naoAutorizado } from '../lib/errors.js'

export const ingestRouter = Router()

// Formato identico ao previsto para o firmware do ESP32 + SCT-013.
const leituraSchema = z.object({
  registrado_em: z.string().datetime({ offset: true }),
  potencia_w: z.number().min(0).max(30000),
})

const loteSchema = z.object({
  leituras: z.array(leituraSchema).min(1).max(500),
})

// POST /ingest/readings -- autenticado por X-Device-Key (nao por sessao)
ingestRouter.post(
  '/readings',
  exigirChaveDispositivo,
  async_(async (req, res) => {
    const body = loteSchema.parse(req.body)
    const dispositivoId = req.dispositivoId!

    const { data: dispositivo } = await db
      .from('dim_dispositivo')
      .select('usuario_id')
      .eq('id', dispositivoId)
      .single()

    if (!dispositivo) throw naoAutorizado('Dispositivo sem usuario vinculado')

    const resultado = await registrarLeituras(dispositivoId, dispositivo.usuario_id, body.leituras)

    res.status(202).json({ status: 'aceito', ...resultado })
  }),
)
