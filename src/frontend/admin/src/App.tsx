import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { Reservations } from './pages/Reservations'
import { CoastGuard } from './pages/CoastGuard'
import { Tour } from './pages/Tour'
import { Stops } from './pages/Stops'
import { Settings } from './pages/Settings'
import { Sms } from './pages/Sms'
import { SmsHistory } from './pages/SmsHistory'
import { Feedback } from './pages/Feedback'
import { Users } from './pages/Users'
import { MarketingSettings } from './pages/MarketingSettings'
import { OtherActivities } from './pages/OtherActivities'
import { PreReservations } from './pages/PreReservations'
import { MarketingSales } from './pages/MarketingSales'
import { BiletKes } from './pages/BiletKes'
import { Biletler } from './pages/Biletler'
import { AcentaKaydi } from './pages/AcentaKaydi'
import { Acentalar } from './pages/Acentalar'
import { SurveyReports } from './pages/SurveyReports'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { AgencyDashboard } from './pages/AgencyDashboard'
import { AgencyNewPassenger } from './pages/AgencyNewPassenger'
import { AgencyPassengers } from './pages/AgencyPassengers'
import { AgencySettings } from './pages/AgencySettings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<RequireRole role="Admin"><Dashboard /></RequireRole>} />
        <Route path="customers" element={<RequireRole role="Admin"><Customers /></RequireRole>} />
        <Route path="reservations" element={<RequireRole role="Admin"><Reservations /></RequireRole>} />
        <Route path="coastguard" element={<RequireRole role="Admin"><CoastGuard /></RequireRole>} />
        <Route path="tour" element={<RequireRole role="Admin"><Tour /></RequireRole>} />
        <Route path="stops" element={<RequireRole role="Admin"><Stops /></RequireRole>} />
        <Route path="sms" element={<RequireRole role="Admin"><Sms /></RequireRole>} />
        <Route path="sms-history" element={<RequireRole role="Admin"><SmsHistory /></RequireRole>} />
        <Route path="feedback" element={<RequireRole role="Admin"><Feedback /></RequireRole>} />
        <Route path="users" element={<RequireRole role="Admin"><Users /></RequireRole>} />
        <Route path="pre-reservations" element={<RequireRole role="Admin"><PreReservations /></RequireRole>} />
        <Route path="marketing-sales" element={<RequireRole role="Admin"><MarketingSales /></RequireRole>} />
        <Route path="bilet-kes" element={<RequireRole role="Admin"><BiletKes /></RequireRole>} />
        <Route path="biletler" element={<RequireRole role="Admin"><Biletler /></RequireRole>} />
        <Route path="acenta-kaydi" element={<RequireRole role="Admin"><AcentaKaydi /></RequireRole>} />
        <Route path="acentalar" element={<RequireRole role="Admin"><Acentalar /></RequireRole>} />
        <Route path="survey-reports" element={<RequireRole role="Admin"><SurveyReports /></RequireRole>} />
        <Route path="marketing-settings" element={<RequireRole role="Admin"><MarketingSettings /></RequireRole>} />
        <Route path="other-activities" element={<RequireRole role="Admin"><OtherActivities /></RequireRole>} />
        <Route path="settings" element={<RequireRole role="Admin"><Settings /></RequireRole>} />
        <Route path="agency/dashboard" element={<RequireRole role="Acenta"><AgencyDashboard /></RequireRole>} />
        <Route path="agency/new-passenger" element={<RequireRole role="Acenta"><AgencyNewPassenger /></RequireRole>} />
        <Route path="agency/passengers" element={<RequireRole role="Acenta"><AgencyPassengers /></RequireRole>} />
        <Route path="agency/settings" element={<RequireRole role="Acenta"><AgencySettings /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
