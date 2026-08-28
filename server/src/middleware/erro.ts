import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../lib/errors.js'

/** Resposta de erro padronizada: { erro: { codigo, mensagem, detalhes? } } */
export function tratadorDeErro(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: {
        codigo: 'requisicao_invalida',
        mensagem: 'Payload inválido',
        detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), problema: i.message })),
      },
    })
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      erro: { codigo: err.codigo, mensagem: err.message, detalhes: err.detalhes },
    })
  }

  console.error('[amperê] erro não tratado:', err)
  return res.status(500).json({
    erro: { codigo: 'erro_interno', mensagem: 'Erro interno no servidor' },
  })
}

export function rotaNaoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ erro: { codigo: 'rota_nao_encontrada', mensagem: 'Rota inexistente' } })
}

/** Envolve handlers async para que rejeições cheguem ao tratador de erro. */
export const async_ =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
