import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { CoastGuard } from './pages/CoastGuard'
import { Tour } from './pages/Tour'
import { Stops } from './pages/Stops'
import { Settings } from './pages/Settings'
import { Sms } from './pages/Sms'
import { SmsHistory } from './pages/SmsHistory'
import { Feedback } from './pages/Feedback'
import { Users } from './pages/Users'
import { MarketingSettings } from './pages/MarketingSettings'
import { PreReservations } from './pages/PreReservations'
import { MarketingSales } from './pages/MarketingSales'
import { BiletKes } from './pages/BiletKes'
import { Biletler } from './pages/Biletler'
import { AcentaKaydi } from './pages/AcentaKaydi'
import { Acentalar } from './pages/Acentalar'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="coastguard" element={<CoastGuard />} />
        <Route path="tour" element={<Tour />} />
        <Route path="stops" element={<Stops />} />
        <Route path="sms" element={<Sms />} />
        <Route path="sms-history" element={<SmsHistory />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="users" element={<Users />} />
        <Route path="pre-reservations" element={<PreReservations />} />
        <Route path="marketing-sales" element={<MarketingSales />} />
        <Route path="bilet-kes" element={<BiletKes />} />
        <Route path="biletler" element={<Biletler />} />
        <Route path="acenta-kaydi" element={<AcentaKaydi />} />
        <Route path="acentalar" element={<Acentalar />} />
        <Route path="marketing-settings" element={<MarketingSettings />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
