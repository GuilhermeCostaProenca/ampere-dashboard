import type { NextFunction, Request, Response } from 'express'
import { auth, db } from '../lib/supabase.js'
import { naoAutorizado } from '../lib/errors.js'

export interface UsuarioAutenticado {
  id: string
  nome: string
  email: string
  tipo_imovel: string
  plano: 'free' | 'pro'
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado
      dispositivoId?: string
    }
  }
}

/** Exige um Bearer token válido do Supabase Auth. */
export async function exigirAutenticacao(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw naoAutorizado()

    const { data, error } = await auth.auth.getUser(token)
    if (error || !data.user) throw naoAutorizado('Sessão expirada ou token inválido')

    const { data: perfil, error: erroPerfil } = await db
      .from('dim_usuario')
      .select('id, nome, email, tipo_imovel, plano')
      .eq('id', data.user.id)
      .single()

    if (erroPerfil || !perfil) throw naoAutorizado('Usuário sem perfil cadastrado')

    req.usuario = perfil as UsuarioAutenticado
    next()
  } catch (e) {
    next(e)
  }
}

/**
 * Autenticação de dispositivo para POST /ingest/readings.
 * O ESP32 não faz login — envia a chave gravada no firmware em X-Device-Key.
 */
export async function exigirChaveDispositivo(req: Request, _res: Response, next: NextFunction) {
  try {
    const chave = req.header('x-device-key')
    if (!chave) throw naoAutorizado('Header X-Device-Key ausente')

    const { data, error } = await db
      .from('dim_dispositivo')
      .select('id')
      .eq('chave_ingestao', chave)
      .single()

    if (error || !data) throw naoAutorizado('Chave de dispositivo não reconhecida')

    req.dispositivoId = data.id
    next()
  } catch (e) {
    next(e)
  }
}
