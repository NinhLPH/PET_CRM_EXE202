import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DemoStoreProvider } from './state/DemoStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoStoreProvider>
      <App />
    </DemoStoreProvider>
  </StrictMode>,
)
