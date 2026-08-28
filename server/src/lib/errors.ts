// Erro de aplicação com status HTTP — capturado pelo middleware de erro.
export class ApiError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    message: string,
    public detalhes?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const naoAutorizado = (msg = 'Token ausente ou inválido') =>
  new ApiError(401, 'nao_autorizado', msg)

export const naoEncontrado = (msg = 'Recurso não encontrado') =>
  new ApiError(404, 'nao_encontrado', msg)

export const requisicaoInvalida = (msg: string, detalhes?: unknown) =>
  new ApiError(400, 'requisicao_invalida', msg, detalhes)

export const conflito = (msg: string) => new ApiError(409, 'conflito', msg)
