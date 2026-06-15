import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Alerts } from './pages/Alerts'
import { Dashboard } from './pages/Dashboard'
import { DeviceDetail } from './pages/DeviceDetail'
import { Devices } from './pages/Devices'
import { Report } from './pages/Report'
import { Settings } from './pages/Settings'

export default function App() {
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
