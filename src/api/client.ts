// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Cliente HTTP tipado
//
// Todo dado da interface passa por aqui. Com VITE_USE_MOCK=true o cliente
// devolve os dados de src/data/mock.ts no MESMO formato da API — é o modo
// offline de desenvolvimento, mantido de propósito.
// ─────────────────────────────────────────────────────────────────────────────

import { ErroApi } from './types'
import type {
  Configuracoes,
  DetalheAparelho,
  ListaAlertas,
  ListaAparelhos,
  RelatorioMensal,
  ResumoDashboard,
  Sessao,
  Usuario,
} from './types'
import { limparSessao, tokenAtual } from './session'
import * as mock from './mockAdapter'

export const USANDO_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// Em desenvolvimento a API roda num processo separado; publicada, ela sai na
// MESMA origem do front, sob /api (função serverless). Ter o padrão certo dos
// dois lados evita que o deploy dependa de acertar uma variável de ambiente —
// e, saindo na mesma origem, não há requisição cross-origin nenhuma.
const API_PADRAO = import.meta.env.DEV ? 'http://localhost:3333' : '/api'
export const API_URL = (import.meta.env.VITE_API_URL || API_PADRAO).replace(/\/$/, '')

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = tokenAtual()

  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new ErroApi(
      0,
      'sem_conexao',
      `Sem resposta do back-end em ${API_URL}. Verifique se a API está no ar.`,
    )
  }

  const corpo = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    const erro = (corpo as any)?.erro
    if (resposta.status === 401) limparSessao()
    throw new ErroApi(
      resposta.status,
      erro?.codigo ?? 'erro_desconhecido',
      erro?.mensagem ?? `Falha na requisição (HTTP ${resposta.status})`,
      erro?.detalhes,
    )
  }

  return corpo as T
}

// ── Autenticação ─────────────────────────────────────────────────────────────

export interface DadosCadastro {
  nome: string
  email: string
  senha: string
  tipo_imovel: 'apartamento' | 'casa'
}

export const api = {
  async cadastrar(dados: DadosCadastro): Promise<Sessao> {
    if (USANDO_MOCK) return mock.sessao()
    const r = await requisitar<{ token: string; expira_em: number; usuario: Usuario }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify(dados) },
    )
    return { token: r.token, expira_em: r.expira_em, usuario: r.usuario }
  },

  async entrar(email: string, senha: string): Promise<Sessao> {
    if (USANDO_MOCK) return mock.sessao()
    const r = await requisitar<{ token: string; expira_em: number; usuario: Usuario }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, senha }) },
    )
    return { token: r.token, expira_em: r.expira_em, usuario: r.usuario }
  },

  async eu(): Promise<Usuario> {
    if (USANDO_MOCK) return mock.sessao().usuario
    const r = await requisitar<{ usuario: Usuario }>('/auth/me')
    return r.usuario
  },

  // ── Telas ──────────────────────────────────────────────────────────────────

  dashboard: (): Promise<ResumoDashboard> =>
    USANDO_MOCK ? mock.dashboard() : requisitar('/dashboard/summary'),

  aparelhos: (): Promise<ListaAparelhos> =>
    USANDO_MOCK ? mock.aparelhos() : requisitar('/devices'),

  aparelho: (id: string): Promise<DetalheAparelho> =>
    USANDO_MOCK ? mock.aparelho(id) : requisitar(`/devices/${id}`),

  alertas: (): Promise<ListaAlertas> => (USANDO_MOCK ? mock.alertas() : requisitar('/alerts')),

  relatorio: (): Promise<RelatorioMensal> =>
    USANDO_MOCK ? mock.relatorio() : requisitar('/reports/monthly'),

  configuracoes: (): Promise<Configuracoes> =>
    USANDO_MOCK ? mock.configuracoes() : requisitar('/settings'),

  salvarConfiguracoes: (dados: {
    nome?: string
    tipo_imovel?: 'apartamento' | 'casa'
    plano?: 'free' | 'pro'
    apelido_dispositivo?: string
  }): Promise<Configuracoes> =>
    USANDO_MOCK
      ? mock.configuracoes()
      : requisitar('/settings', { method: 'PUT', body: JSON.stringify(dados) }),
}

// ── Formatadores compartilhados ──────────────────────────────────────────────

export const BRL = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const WATTS = (v: number) => `${Math.round(v).toLocaleString('pt-BR')} W`
