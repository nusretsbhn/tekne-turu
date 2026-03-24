import { Routes, Route } from 'react-router-dom'
import { TokenLandingPage } from './pages/TokenLandingPage'
import { ThanksPage } from './pages/ThanksPage'
import { MarketingPage } from './pages/MarketingPage'
import { ChinaGuestPage } from './pages/ChinaGuestPage'

export default function App() {
  return (
    <Routes>
      <Route path="/thanks" element={<ThanksPage />} />
      <Route path="/tanitim" element={<MarketingPage />} />
      <Route path="/tanitim/cn" element={<ChinaGuestPage />} />
      <Route path="/" element={<TokenLandingPage />} />
    </Routes>
  )
}
