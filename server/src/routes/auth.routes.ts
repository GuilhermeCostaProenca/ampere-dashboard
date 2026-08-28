import { Router } from 'express'
import { z } from 'zod'
import { auth, db } from '../lib/supabase.js'
import { conflito, requisicaoInvalida } from '../lib/errors.js'
import { async_ } from '../middleware/erro.js'
import { exigirAutenticacao } from '../middleware/auth.js'

export const authRouter = Router()

const cadastroSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres'),
  tipo_imovel: z.enum(['apartamento', 'casa']),
})

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
})

// POST /auth/signup — cria usuário, perfil e o dispositivo Amperê Node
authRouter.post(
  '/signup',
  async_(async (req, res) => {
    const body = cadastroSchema.parse(req.body)

    const { data: criado, error: erroAuth } = await db.auth.admin.createUser({
      email: body.email,
      password: body.senha,
      email_confirm: true, // protótipo: sem fluxo de confirmação por e-mail
      user_metadata: { nome: body.nome },
    })

    if (erroAuth || !criado.user) {
      if (/already|registered|exists/i.test(erroAuth?.message ?? '')) {
        throw conflito('Já existe uma conta com este e-mail')
      }
      throw requisicaoInvalida(erroAuth?.message ?? 'Falha ao criar usuário')
    }

    const usuarioId = criado.user.id

    const { error: erroPerfil } = await db.from('dim_usuario').insert({
      id: usuarioId,
      nome: body.nome,
      email: body.email,
      tipo_imovel: body.tipo_imovel,
      plano: 'free',
    })

    if (erroPerfil) {
      // Não deixa usuário órfão no Auth se o perfil falhar.
      await db.auth.admin.deleteUser(usuarioId)
      throw requisicaoInvalida(`Falha ao criar perfil: ${erroPerfil.message}`)
    }

    const { data: dispositivo } = await db
      .from('dim_dispositivo')
      .insert({
        usuario_id: usuarioId,
        apelido: 'Amperê Node v1 (ESP32 + SCT-013-030)',
        status_conexao: 'offline',
        versao_firmware: 'fw 1.4.2',
        sinal_wifi: -54,
      })
      .select('id, chave_ingestao')
      .single()

    const { data: sessao } = await auth.auth.signInWithPassword({
      email: body.email,
      password: body.senha,
    })

    res.status(201).json({
      token: sessao?.session?.access_token ?? null,
      expira_em: sessao?.session?.expires_at ?? null,
      usuario: {
        id: usuarioId,
        nome: body.nome,
        email: body.email,
        tipo_imovel: body.tipo_imovel,
        plano: 'free',
      },
      dispositivo: dispositivo ?? null,
    })
  }),
)

// POST /auth/login — devolve o token de sessão
authRouter.post(
  '/login',
  async_(async (req, res) => {
    const body = loginSchema.parse(req.body)

    const { data, error } = await auth.auth.signInWithPassword({
      email: body.email,
      password: body.senha,
    })

    if (error || !data.session) throw requisicaoInvalida('E-mail ou senha incorretos')

    const { data: perfil } = await db
      .from('dim_usuario')
      .select('id, nome, email, tipo_imovel, plano')
      .eq('id', data.user!.id)
      .single()

    res.json({
      token: data.session.access_token,
      expira_em: data.session.expires_at,
      usuario: perfil,
    })
  }),
)

// GET /auth/me — usuário autenticado
authRouter.get(
  '/me',
  exigirAutenticacao,
  async_(async (req, res) => {
    res.json({ usuario: req.usuario })
  }),
)
