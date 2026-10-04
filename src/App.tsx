import { Navigate, Route, Routes, Link } from 'react-router'
import { lazy, Suspense } from 'react'
import Prenota from './pages/Prenota'

const AdminArea = lazy(() => import('./components/AdminArea'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

export default function App() {
  return (
    <Suspense fallback={<main className="admin-layout" role="status">Caricamento…</main>}><Routes>
      <Route path="/" element={<Navigate to="/prenota" replace />} />
      <Route path="/prenota" element={<Prenota />} />
      <Route path="/admin" element={<AdminArea />} />
      <Route path="/admin/login" element={<AdminArea />} />
      <Route path="/admin/password" element={<ResetPassword />} />
      <Route path="/admin/prenotazioni" element={<AdminArea />} />
      <Route path="/admin/configurazione" element={<AdminArea />} />
      <Route path="*" element={<main className="not-found"><h1>Pagina non trovata</h1><Link to="/prenota">Vai alla prenotazione</Link></main>} />
    </Routes></Suspense>
  )
}
