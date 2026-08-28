import type { Sessao, Usuario } from './types'

const CHAVE = 'ampere.sessao'

export function salvarSessao(sessao: Sessao) {
  localStorage.setItem(CHAVE, JSON.stringify(sessao))
}

export function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const sessao = JSON.parse(bruto) as Sessao
    if (!sessao?.token) return null
    // expira_em vem em segundos (epoch) do Supabase Auth.
    if (sessao.expira_em && sessao.expira_em * 1000 < Date.now()) {
      localStorage.removeItem(CHAVE)
      return null
    }
    return sessao
  } catch {
    return null
  }
}

export function limparSessao() {
  localStorage.removeItem(CHAVE)
}

export function atualizarUsuario(usuario: Usuario) {
  const atual = lerSessao()
  if (!atual) return
  salvarSessao({ ...atual, usuario })
}

export const tokenAtual = () => lerSessao()?.token ?? null
