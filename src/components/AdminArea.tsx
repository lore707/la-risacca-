import { Link, NavLink, useLocation } from 'react-router'
import Dashboard from '../pages/Dashboard'
import Reservations from '../pages/Reservations'
import Brand from './Brand'
import { bookingConfigured } from '../lib/supabase'

export default function AdminArea() {
  const location = useLocation()
  return <>
    <header className="site-header admin-header">
      <Link className="wordmark" to="/prenota"><Brand subtitle="Gestione prenotazioni" /></Link>
      <nav className="admin-nav" aria-label="Navigazione amministrazione">
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/prenotazioni">Prenotazioni</NavLink>
        <NavLink to="/admin/configurazione">Configurazione</NavLink>
      </nav>
      <div className="admin-header-actions"><Link className="back-link" to="/prenota">Vai al booking ↗</Link></div>
    </header>
    <main className="admin-layout">
      {!bookingConfigured ? <section className="booking-card"><p role="alert" className="submission-error">Collegamento Supabase non configurato.</p></section> : location.pathname === '/admin/prenotazioni' ? <Reservations /> : location.pathname === '/admin/configurazione' ? <section className="admin-panel"><p className="eyebrow">Booking online</p><h1>Configurazione</h1><p>La Risacca 2 · fuso orario Europe/Rome.</p><p>Il booking riceve richieste con data e ora future, almeno una persona, email facoltativa e note fino a 2.000 caratteri. Ogni richiesta richiede una decisione dello staff.</p><p className="development-notice">Orari prenotabili, giorni di chiusura e limite di persone non sono ancora configurabili. La suddivisione Pranzo/Cena serve soltanto a filtrare la dashboard: prima delle 17:00 e dalle 17:00.</p><Link to="/prenota">Apri il booking</Link></section> : <Dashboard />}
    </main>
  </>
}
