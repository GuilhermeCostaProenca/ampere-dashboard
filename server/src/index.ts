import express from 'express'
import cors from 'cors'
import { corsOrigins, env } from './env.js'
import { rotaNaoEncontrada, tratadorDeErro } from './middleware/erro.js'
import { authRouter } from './routes/auth.routes.js'
import { ingestRouter } from './routes/ingest.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { devicesRouter } from './routes/devices.routes.js'
import { alertsRouter } from './routes/alerts.routes.js'
import { reportsRouter } from './routes/reports.routes.js'
import { settingsRouter } from './routes/settings.routes.js'
import { detector } from './nilm/index.js'

const app = express()

app.use(express.json({ limit: '1mb' }))

// CORS restrito a origem do front (config por CORS_ORIGIN).
app.use(
  cors({
    origin(origin, callback) {
      // Requisicoes sem Origin (curl, ESP32, health check) sao liberadas.
      if (!origin) return callback(null, true)
      if (corsOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`Origem nao autorizada pelo CORS: ${origin}`))
    },
    credentials: true,
  }),
)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    servico: 'ampere-api',
    nilm: { detector: detector.nome, versao: detector.versao },
  })
})

app.use('/auth', authRouter)
app.use('/ingest', ingestRouter)
app.use('/dashboard', dashboardRouter)
app.use('/devices', devicesRouter)
app.use('/alerts', alertsRouter)
app.use('/reports', reportsRouter)
app.use('/settings', settingsRouter)

app.use(rotaNaoEncontrada)
app.use(tratadorDeErro)

app.listen(env.PORT, () => {
  console.log(`[amperê] API ouvindo em http://localhost:${env.PORT}`)
  console.log(`[amperê] CORS liberado para: ${corsOrigins.join(', ')}`)
  console.log(`[amperê] NILM: ${detector.nome}@${detector.versao}`)
})
