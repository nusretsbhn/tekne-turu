import { Routes, Route } from 'react-router-dom'
import { TokenLandingPage } from './pages/TokenLandingPage'
import { ThanksPage } from './pages/ThanksPage'
import { MarketingPage } from './pages/MarketingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/thanks" element={<ThanksPage />} />
      <Route path="/tanitim" element={<MarketingPage />} />
      <Route path="/" element={<TokenLandingPage />} />
    </Routes>
  )
}
