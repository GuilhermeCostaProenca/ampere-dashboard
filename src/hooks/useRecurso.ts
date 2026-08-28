import { useCallback, useEffect, useRef, useState } from 'react'

interface Opcoes {
  /** Se definido, refaz a chamada nesse intervalo sem piscar a tela. */
  intervaloMs?: number
  /** Não dispara enquanto false (ex.: aguardando o id da rota). */
  habilitado?: boolean
}

export interface Recurso<T> {
  dados: T | null
  erro: unknown
  carregando: boolean
  /** true durante uma atualização periódica (dados antigos ainda na tela). */
  atualizando: boolean
  recarregar: () => void
}

/**
 * Carrega um recurso da API com estados de carregamento, erro e atualização
 * periódica. A primeira carga mostra o estado HUD; as seguintes são silenciosas
 * para o painel não piscar durante a demonstração ao vivo.
 */
export function useRecurso<T>(
  carregar: () => Promise<T>,
  deps: unknown[] = [],
  { intervaloMs, habilitado = true }: Opcoes = {},
): Recurso<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [carregando, setCarregando] = useState(habilitado)
  const [atualizando, setAtualizando] = useState(false)

  const fnRef = useRef(carregar)
  fnRef.current = carregar
  const montado = useRef(true)

  const executar = useCallback(
    async (silencioso: boolean) => {
      if (!habilitado) return
      silencioso ? setAtualizando(true) : setCarregando(true)
      try {
        const resultado = await fnRef.current()
        if (!montado.current) return
        setDados(resultado)
        setErro(null)
      } catch (e) {
        if (!montado.current) return
        // Numa atualização periódica, preserva o último dado bom na tela.
        if (!silencioso) setDados(null)
        setErro(e)
      } finally {
        if (!montado.current) return
        setCarregando(false)
        setAtualizando(false)
      }
    },
    [habilitado],
  )

  useEffect(() => {
    montado.current = true
    void executar(false)
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executar, ...deps])

  useEffect(() => {
    if (!intervaloMs || !habilitado) return
    const t = setInterval(() => void executar(true), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs, habilitado, executar])

  return { dados, erro, carregando, atualizando, recarregar: () => void executar(false) }
}
