import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Alerts } from './pages/Alerts'
import { Dashboard } from './pages/Dashboard'
import { DeviceDetail } from './pages/DeviceDetail'
import { Devices } from './pages/Devices'
import { Landing } from './pages/Landing'
import { Report } from './pages/Report'
import { Settings } from './pages/Settings'
import { Acesso } from './pages/Acesso'
import { useAuth } from './auth/AuthContext'
import { HudLoading } from './components/HudState'

function Restabelecendo() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <HudLoading
        titulo="Restabelecendo sessão"
        linhas={['validando token de acesso', 'consultando dim_usuario']}
      />
    </div>
  )
}

/** Tudo abaixo de /painel exige sessão; sem ela, manda para o acesso. */
function ExigeSessao() {
  const { sessao, carregando } = useAuth()
  const local = useLocation()

  if (carregando) return <Restabelecendo />
  // `state` guarda de onde a pessoa veio para o login devolver ao lugar certo.
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <Outlet />
}

export default function App() {
  const { sessao, carregando } = useAuth()

  return (
    <Routes>
      {/* Página pública: é o que o visitante vê antes de qualquer login. */}
      <Route path="/" element={<Landing />} />

      <Route
        path="/entrar"
        element={
          carregando ? <Restabelecendo /> : sessao ? <Navigate to="/painel" replace /> : <Acesso />
        }
      />

      <Route element={<ExigeSessao />}>
        <Route path="/painel" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="aparelhos" element={<Devices />} />
          <Route path="aparelhos/:id" element={<DeviceDetail />} />
          <Route path="alertas" element={<Alerts />} />
          <Route path="relatorio" element={<Report />} />
          <Route path="config" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
