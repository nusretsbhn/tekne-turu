import { Routes, Route } from 'react-router-dom'
import { TokenLandingPage } from './pages/TokenLandingPage'
import { ThanksPage } from './pages/ThanksPage'
import { MarketingPage } from './pages/MarketingPage'
import { ChinaGuestPage } from './pages/ChinaGuestPage'
import { BilgiPage } from './pages/BilgiPage'

export default function App() {
  return (
    <Routes>
      <Route path="/thanks" element={<ThanksPage />} />
      <Route path="/tanitim/cn" element={<ChinaGuestPage />} />
      <Route path="/tanitim" element={<MarketingPage />} />
      <Route path="/bilgi" element={<BilgiPage />} />
      <Route path="/" element={<TokenLandingPage />} />
      <Route
        path="*"
        element={
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            <p style={{ margin: 0, fontSize: 16 }}>Sayfa bulunamadı.</p>
          </div>
        }
      />
    </Routes>
  )
}
