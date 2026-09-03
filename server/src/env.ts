import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL ausente ou inválida'),
  SUPABASE_ANON_KEY: z.string().min(20, 'SUPABASE_ANON_KEY ausente'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY ausente'),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = schema.safeParse(process.env)

/**
 * Configuração faltando não derruba o processo.
 *
 * Rodando local, sair com mensagem é bom. Rodando como função serverless, sair
 * vira um 500 opaco: quem publicou não descobre que só faltou uma variável de
 * ambiente. Então o erro é exposto aqui, e a aplicação responde 503 dizendo o
 * que falta — diagnosticável abrindo a própria URL.
 */
export const erroDeConfiguracao = parsed.success
  ? null
  : parsed.error.issues.map((i) => i.message).join(' · ')

export const env = parsed.success
  ? parsed.data
  : {
      // Valores inertes: nenhuma rota chega a usá-los enquanto houver erro.
      SUPABASE_URL: 'https://configuracao.invalida',
      SUPABASE_ANON_KEY: 'configuracao-invalida',
      SUPABASE_SERVICE_ROLE_KEY: 'configuracao-invalida',
      PORT: 3333,
      CORS_ORIGIN: 'http://localhost:5173',
    }

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
