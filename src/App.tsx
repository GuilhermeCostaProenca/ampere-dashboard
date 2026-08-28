import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Alerts } from './pages/Alerts'
import { Dashboard } from './pages/Dashboard'
import { DeviceDetail } from './pages/DeviceDetail'
import { Devices } from './pages/Devices'
import { Report } from './pages/Report'
import { Settings } from './pages/Settings'
import { Acesso } from './pages/Acesso'
import { useAuth } from './auth/AuthContext'
import { HudLoading } from './components/HudState'

export default function App() {
  const { sessao, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <HudLoading
          titulo="Restabelecendo sessão"
          linhas={['validando token de acesso', 'consultando dim_usuario']}
        />
      </div>
    )
  }

  // Sem sessão, o app inteiro é a tela de acesso (cadastro real + login).
  if (!sessao) return <Acesso />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="aparelhos" element={<Devices />} />
        <Route path="aparelhos/:id" element={<DeviceDetail />} />
        <Route path="alertas" element={<Alerts />} />
        <Route path="relatorio" element={<Report />} />
        <Route path="config" element={<Settings />} />
      </Route>
    </Routes>
  )
}
