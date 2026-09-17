// Função serverless da Vercel: recebe tudo sob /api/* e entrega para a mesma
// aplicação Express que roda localmente (server/src/app.ts).
//
// O roteamento é explícito no vercel.json (`/api/(.*)` → `/api`) em vez de
// depender do catch-all `[...path]`: essa convenção é de framework e, num
// projeto sem framework, casava apenas UM segmento — /api/health chegava aqui
// e /api/auth/login morria no roteador da Vercel com 404.
export { default } from '../server/src/app.js'
