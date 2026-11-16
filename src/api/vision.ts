// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Cliente da visão computacional
//
// Arquivo separado de api/client.ts de propósito: o cliente principal fixa
// 'content-type: application/json' em toda requisição, e upload multipart
// precisa que o navegador monte o Content-Type com o boundary. Forçar o
// cabeçalho ali quebraria o parse do multer do outro lado.
// ─────────────────────────────────────────────────────────────────────────────

import { API_URL } from './client'
import { tokenAtual, limparSessao } from './session'
import { ErroApi } from './types'
import type {
  CustoPorAparelho,
  EtiquetaConfirmada,
  FaturaConfirmada,
  RespostaEtiqueta,
  RespostaFatura,
} from './visionTypes'

async function tratar<T>(resposta: Response): Promise<T> {
  const corpo = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    const erro = (corpo as { erro?: { codigo?: string; mensagem?: string; detalhes?: unknown } })
      ?.erro
    if (resposta.status === 401) limparSessao()
    throw new ErroApi(
      resposta.status,
      erro?.codigo ?? 'erro_desconhecido',
      erro?.mensagem ?? `Falha na leitura da imagem (HTTP ${resposta.status})`,
      erro?.detalhes,
    )
  }
  return corpo as T
}

function cabecalhoAutenticado(): HeadersInit {
  const token = tokenAtual()
  return token ? { authorization: `Bearer ${token}` } : {}
}

/** Envia a foto como multipart. Sem content-type manual: o boundary é do browser. */
async function enviarFoto<T>(caminho: string, arquivo: File | Blob): Promise<T> {
  const corpo = new FormData()
  corpo.append('foto', arquivo)

  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: 'POST',
      headers: cabecalhoAutenticado(),
      body: corpo,
    })
  } catch {
    throw new ErroApi(
      0,
      'sem_conexao',
      `Sem resposta do back-end em ${API_URL}. Verifique se a API está no ar.`,
    )
  }
  return tratar<T>(resposta)
}

async function enviarJson<T>(caminho: string, dados: unknown): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...cabecalhoAutenticado() },
      body: JSON.stringify(dados),
    })
  } catch {
    throw new ErroApi(0, 'sem_conexao', `Sem resposta do back-end em ${API_URL}.`)
  }
  return tratar<T>(resposta)
}

async function buscar<T>(caminho: string): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { headers: cabecalhoAutenticado() })
  } catch {
    throw new ErroApi(0, 'sem_conexao', `Sem resposta do back-end em ${API_URL}.`)
  }
  return tratar<T>(resposta)
}

export const visao = {
  lerConta: (foto: File | Blob) => enviarFoto<RespostaFatura>('/vision/bill', foto),

  lerEtiqueta: (foto: File | Blob) => enviarFoto<RespostaEtiqueta>('/vision/label', foto),

  confirmarConta: (corpo: unknown) =>
    enviarJson<FaturaConfirmada>('/vision/bill/confirm', corpo),

  confirmarEtiqueta: (corpo: unknown) =>
    enviarJson<EtiquetaConfirmada>('/vision/label/confirm', corpo),

  custoPorAparelho: () => buscar<CustoPorAparelho>('/vision/custo-aparelhos'),
}
