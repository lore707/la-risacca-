import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './styles.css'
import { routePasswordRecovery } from './lib/passwordRecovery'

const stopRecovery = routePasswordRecovery()
if (import.meta.hot) import.meta.hot.dispose(stopRecovery)

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
)
