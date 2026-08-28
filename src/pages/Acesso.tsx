import { useState } from 'react'
import { CornerMarks } from '../components/Hud'
import { useAuth } from '../auth/AuthContext'
import { ErroApi } from '../api/types'
import { API_URL, USANDO_MOCK } from '../api/client'

type Aba = 'entrar' | 'cadastrar'

function Campo({
  rotulo,
  ...props
}: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="t-label">{rotulo}</span>
      <input
        {...props}
        className="clip-hud-sm mt-1.5 w-full border border-line bg-base px-3 py-2.5 text-sm text-term outline-none transition-colors placeholder:text-muted/60 focus:border-term/60 focus:shadow-glow"
      />
    </label>
  )
}

export function Acesso() {
  const { entrar, cadastrar } = useAuth()
  const [aba, setAba] = useState<Aba>('entrar')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [email, setEmail] = useState('demo@ampere.app')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [tipoImovel, setTipoImovel] = useState<'apartamento' | 'casa'>('apartamento')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      if (aba === 'entrar') await entrar(email, senha)
      else await cadastrar({ nome, email, senha, tipo_imovel: tipoImovel })
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof ErroApi
          ? erroCapturado.message
          : 'Não foi possível concluir. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-14 w-14 place-items-center border border-term/60 text-term shadow-glow">
            <span className="text-3xl font-extrabold leading-none">A</span>
          </span>
          <div className="text-center leading-none">
            <div className="text-xl font-extrabold tracking-[0.35em] text-term text-glow">
              AMPERÊ
            </div>
            <div className="mt-1 text-[9px] tracking-[0.35em] text-muted">NILM CONTROL</div>
          </div>
        </div>

        <section className="clip-hud relative border border-line bg-panel/80 backdrop-blur-sm">
          <CornerMarks />

          {/* Abas */}
          <div className="flex border-b border-line">
            {(['entrar', 'cadastrar'] as Aba[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setAba(a)
                  setErro(null)
                }}
                className={`flex-1 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors ${
                  aba === a
                    ? 'bg-term/10 text-term text-glow'
                    : 'text-muted hover:text-term'
                }`}
              >
                {a === 'entrar' ? '◂ Acessar' : 'Criar conta ▸'}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="space-y-4 p-5">
            {aba === 'cadastrar' && (
              <>
                <Campo
                  rotulo="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como devemos te chamar"
                  required
                  minLength={2}
                />
                <div>
                  <span className="t-label">Tipo de imóvel</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(['apartamento', 'casa'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoImovel(t)}
                        className={`clip-hud-sm border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          tipoImovel === t
                            ? 'border-term/60 bg-term/10 text-term text-glow'
                            : 'border-line text-muted hover:border-term/30 hover:text-term'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Campo
              rotulo="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
              autoComplete="email"
            />
            <Campo
              rotulo="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
            />

            {erro && (
              <div className="clip-hud-sm border border-danger/50 bg-danger/10 px-3 py-2 text-[11px] leading-relaxed text-danger">
                <span className="font-bold">⚠ </span>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="clip-hud w-full border border-term/60 bg-term/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-term transition-colors hover:bg-term/20 disabled:opacity-50"
            >
              {enviando ? (
                <span className="animate-blink">estabelecendo enlace…</span>
              ) : aba === 'entrar' ? (
                'Acessar painel ▸'
              ) : (
                'Criar conta e ativar sensor ▸'
              )}
            </button>
          </form>

          <footer className="border-t border-line px-5 py-3 text-[9px] leading-relaxed text-muted">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  USANDO_MOCK ? 'bg-amber shadow-glow-amber' : 'bg-term shadow-glow'
                } animate-blink`}
              />
              {USANDO_MOCK ? 'MODO OFFLINE — DADOS LOCAIS' : `API: ${API_URL}`}
            </div>
            <div className="mt-1 opacity-70">FIAP • Startup One • Fase 5 — MVP</div>
          </footer>
        </section>
      </div>
    </div>
  )
}
