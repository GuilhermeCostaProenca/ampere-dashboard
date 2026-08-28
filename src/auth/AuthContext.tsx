import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { DadosCadastro } from '../api/client'
import { USANDO_MOCK } from '../api/client'
import { atualizarUsuario, lerSessao, limparSessao, salvarSessao } from '../api/session'
import * as mockAdapter from '../api/mockAdapter'
import type { Sessao, Usuario } from '../api/types'

interface ContextoAuth {
  sessao: Sessao | null
  usuario: Usuario | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (dados: DadosCadastro) => Promise<void>
  sair: () => void
  definirUsuario: (u: Usuario) => void
}

const Ctx = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() =>
    USANDO_MOCK ? mockAdapter.sessao() : lerSessao(),
  )
  const [carregando, setCarregando] = useState(!USANDO_MOCK)

  // Revalida o token guardado contra /auth/me ao abrir o app.
  useEffect(() => {
    if (USANDO_MOCK) {
      setCarregando(false)
      return
    }
    const guardada = lerSessao()
    if (!guardada) {
      setCarregando(false)
      return
    }
    api
      .eu()
      .then((usuario) => {
        const atualizada = { ...guardada, usuario }
        salvarSessao(atualizada)
        setSessao(atualizada)
      })
      .catch(() => {
        limparSessao()
        setSessao(null)
      })
      .finally(() => setCarregando(false))
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const nova = await api.entrar(email, senha)
    salvarSessao(nova)
    setSessao(nova)
  }, [])

  const cadastrar = useCallback(async (dados: DadosCadastro) => {
    const nova = await api.cadastrar(dados)
    salvarSessao(nova)
    setSessao(nova)
  }, [])

  const sair = useCallback(() => {
    limparSessao()
    setSessao(null)
  }, [])

  const definirUsuario = useCallback((u: Usuario) => {
    atualizarUsuario(u)
    setSessao((s) => (s ? { ...s, usuario: u } : s))
  }, [])

  const valor = useMemo<ContextoAuth>(
    () => ({
      sessao,
      usuario: sessao?.usuario ?? null,
      carregando,
      entrar,
      cadastrar,
      sair,
      definirUsuario,
    }),
    [sessao, carregando, entrar, cadastrar, sair, definirUsuario],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
