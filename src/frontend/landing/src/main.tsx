import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// Vite base ile aynı olmalı; PROD bayrağına güvenmek alt dizinde rotaların eşleşmemesine (beyaz ekran) yol açabiliyor.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const routerBasename = basePath.length > 0 ? basePath : undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
