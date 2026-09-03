// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Montagem da aplicação Express
//
// Separado de index.ts de propósito: aqui a aplicação é construída e exportada,
// sem escutar porta. Isso permite os dois modos sem duplicar nada —
// `npm run dev` chama listen() em index.ts, e a Vercel importa este módulo
// como função serverless (api/[...path].ts).
// ─────────────────────────────────────────────────────────────────────────────

import express, { Router } from 'express'
import cors from 'cors'
import { corsOrigins, erroDeConfiguracao } from './env.js'
import { rotaNaoEncontrada, tratadorDeErro } from './middleware/erro.js'
import { authRouter } from './routes/auth.routes.js'
import { ingestRouter } from './routes/ingest.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { devicesRouter } from './routes/devices.routes.js'
import { alertsRouter } from './routes/alerts.routes.js'
import { reportsRouter } from './routes/reports.routes.js'
import { settingsRouter } from './routes/settings.routes.js'
import { detector } from './nilm/index.js'

export function criarApp() {
  const app = express()

  app.use(express.json({ limit: '1mb' }))

  // CORS restrito à origem do front. Quando front e API saem na mesma origem
  // (o deploy da Vercel), nenhuma requisição é cross-origin e isto não atua.
  app.use(
    cors({
      origin(origin, callback) {
        // Sem Origin (curl, ESP32, health check) passa.
        if (!origin) return callback(null, true)
        if (corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`Origem nao autorizada pelo CORS: ${origin}`))
      },
      credentials: true,
    }),
  )

  const rotas = Router()

  rotas.get('/health', (_req, res) => {
    res.json({
      status: erroDeConfiguracao ? 'configuracao_invalida' : 'ok',
      servico: 'ampere-api',
      nilm: { detector: detector.nome, versao: detector.versao },
    })
  })

  // Configuração incompleta responde 503 legível em vez de derrubar a função.
  if (erroDeConfiguracao) {
    rotas.use((_req, res) => {
      res.status(503).json({
        erro: {
          codigo: 'configuracao_invalida',
          mensagem: 'A API está sem as variáveis de ambiente necessárias.',
          detalhes: erroDeConfiguracao,
        },
      })
    })
  } else {
    rotas.use('/auth', authRouter)
    rotas.use('/ingest', ingestRouter)
    rotas.use('/dashboard', dashboardRouter)
    rotas.use('/devices', devicesRouter)
    rotas.use('/alerts', alertsRouter)
    rotas.use('/reports', reportsRouter)
    rotas.use('/settings', settingsRouter)
  }

  // Montado nos dois prefixos: na raiz para o servidor local, e sob /api para
  // o deploy, onde a função serverless recebe o caminho com esse prefixo.
  app.use('/', rotas)
  app.use('/api', rotas)

  app.use(rotaNaoEncontrada)
  app.use(tratadorDeErro)

  return app
}

export const app = criarApp()
export default app
