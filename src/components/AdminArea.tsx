import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useLocation } from 'react-router'
import { signOutAdmin, watchAdminAccess } from '../lib/admin'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import Reservations from '../pages/Reservations'
import Brand from './Brand'

export default function AdminArea() {
  const [access, setAccess] = useState<'loading' | 'login' | 'denied' | 'admin' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [exitBusy, setExitBusy] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  useEffect(() => watchAdminAccess(setAccess), [retry])
  async function exit() {
    if (exitBusy) return
    setExitBusy(true); setError('')
    try { await signOutAdmin() } catch { setError('Uscita non riuscita. Riprova.') }
    finally { setExitBusy(false) }
  }
  return <>
    <header className="site-header admin-header"><Link className="wordmark" to="/prenota"><Brand subtitle="Gestione prenotazioni" /></Link>{access === 'admin' && <nav className="admin-nav" aria-label="Navigazione amministrazione"><NavLink to="/admin" end>Dashboard</NavLink><NavLink to="/admin/prenotazioni">Prenotazioni</NavLink><NavLink to="/admin/configurazione">Configurazione</NavLink></nav>}<div className="admin-header-actions"><Link className="back-link" to="/prenota">Vai al booking ↗</Link>{access !== 'login' && access !== 'loading' && <details className="account-menu"><summary><span>LR</span>La Risacca 2</summary><button className="button-secondary" disabled={exitBusy} onClick={() => void exit()}>{exitBusy ? 'Uscita…' : 'Esci'}</button></details>}</div></header>
    <main className="admin-layout">
      {error && <p role="alert" className="submission-error">{error}</p>}
      {access === 'loading' && <p role="status">Verifica accesso…</p>}
      {access === 'login' && (location.pathname === '/admin/login' ? <Login /> : <Navigate to="/admin/login" replace />)}
      {access === 'admin' && (location.pathname === '/admin/login' ? <Navigate to="/admin" replace /> : location.pathname === '/admin/prenotazioni' ? <Reservations /> : location.pathname === '/admin/configurazione' ? <section className="admin-panel"><p className="eyebrow">Booking online</p><h1>Configurazione</h1><p>La Risacca 2 · fuso orario Europe/Rome.</p><p>Il booking riceve richieste con data e ora future, almeno una persona, email facoltativa e note fino a 2.000 caratteri. Ogni richiesta richiede una decisione dello staff.</p><p className="development-notice">Orari prenotabili, giorni di chiusura e limite di persone non sono ancora configurabili. La suddivisione Pranzo/Cena serve soltanto a filtrare la dashboard: prima delle 17:00 e dalle 17:00.</p><Link to="/prenota">Apri il booking</Link></section> : <Dashboard />)}
      {access === 'denied' && <section className="booking-card"><h1>Accesso non autorizzato</h1><p className="step-description">Questo account non è abilitato alla gestione delle prenotazioni. Esci e usa l’account del ristorante.</p></section>}
      {access === 'error' && <section className="booking-card"><p role="alert">Impossibile verificare i permessi. Nessun dato è stato mostrato.</p><button className="button-primary" onClick={() => { setAccess('loading'); setRetry((value) => value + 1) }}>Riprova</button></section>}
    </main>
  </>
}
