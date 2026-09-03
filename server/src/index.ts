// Servidor local. A aplicação em si é montada em app.ts, que também é o que a
// função serverless da Vercel importa.
import { app } from './app.js'
import { corsOrigins, env, erroDeConfiguracao } from './env.js'
import { detector } from './nilm/index.js'

app.listen(env.PORT, () => {
  if (erroDeConfiguracao) {
    console.error(`\n[amperê] Configuração inválida — a API vai responder 503.`)
    console.error(`[amperê] ${erroDeConfiguracao}`)
    console.error(`[amperê] Preencha server/.env (veja server/.env.example).\n`)
  }
  console.log(`[amperê] API ouvindo em http://localhost:${env.PORT}`)
  console.log(`[amperê] CORS liberado para: ${corsOrigins.join(', ')}`)
  console.log(`[amperê] NILM: ${detector.nome}@${detector.versao}`)
})
