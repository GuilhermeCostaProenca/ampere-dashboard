// Função serverless da Vercel: recebe tudo sob /api/* e entrega para a mesma
// aplicação Express que roda localmente (server/src/app.ts).
//
// O nome [...path] é o catch-all da Vercel — sem ele, só /api exato chegaria
// aqui, e /api/auth/login daria 404 antes de tocar no Express.
export { default } from '../server/src/app.js'
