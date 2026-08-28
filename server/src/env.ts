import 'dotenv/config'
import { z } from 'zod'

// Falha rápido e com mensagem clara se faltar credencial.
const schema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL ausente ou inválida'),
  SUPABASE_ANON_KEY: z.string().min(20, 'SUPABASE_ANON_KEY ausente'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY ausente'),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const faltando = parsed.error.issues.map((i) => `  · ${i.message}`).join('\n')
  console.error(
    `\n[amperê] Configuração inválida. Preencha server/.env (veja server/.env.example):\n${faltando}\n`,
  )
  process.exit(1)
}

export const env = parsed.data

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
