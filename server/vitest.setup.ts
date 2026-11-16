// ─────────────────────────────────────────────────────────────────────────────
// Ambiente dos testes.
//
// Valores FALSOS, atribuídos antes de qualquer import de src/env.ts: a suíte
// nunca fala com o Supabase (o cliente é mockado) nem com a API do modelo (o
// provedor é injetado). Definir aqui também garante que o dotenv não sobrescreva
// com as credenciais reais de server/.env — ele não substitui chave já presente.
// ─────────────────────────────────────────────────────────────────────────────

process.env.SUPABASE_URL = 'https://testes.supabase.co'
process.env.SUPABASE_ANON_KEY = 'anon-key-de-teste-0000000000'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-de-teste-0000000000'
process.env.CORS_ORIGIN = 'http://localhost:5173'

process.env.VISION_PROVIDER = 'anthropic'
process.env.ANTHROPIC_API_KEY = 'sk-ant-chave-de-teste-0000000000'
process.env.VISION_MODEL = 'modelo-de-teste'
