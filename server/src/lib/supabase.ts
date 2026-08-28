import { createClient } from '@supabase/supabase-js'
import { env } from '../env.js'

// Cliente administrativo: usado por todas as queries de dados do back-end.
// Contorna RLS por design — o escopo por usuário é aplicado nas queries
// (sempre filtrando por usuario_id vindo do middleware de autenticação).
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Cliente público: usado apenas para signup/login/validação de token.
export const auth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
