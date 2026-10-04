import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import BookingField from '../components/BookingField'
import { signInAdmin } from '../lib/admin'
import { bookingConfigured } from '../lib/supabase'
import { requestPasswordReset } from '../lib/passwordRecovery'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [notice, setNotice] = useState('')
  const inFlight = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || !bookingConfigured) return
    inFlight.current = true; setBusy(true); setError('')
    setNotice('')
    try {
      if (recovery) {
        await requestPasswordReset(email)
        setNotice('Se l’indirizzo è associato a un account, riceverai il link per scegliere una nuova password. Controlla anche lo spam.')
      } else await signInAdmin(email, password)
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Accesso non riuscito. Riprova.') }
    finally { inFlight.current = false; setBusy(false); setPassword('') }
  }
  return <section className="booking-card login-card" aria-label="Accesso amministratore">
    <p className="eyebrow">Area ristorante</p><h1>{recovery ? 'Recupera password' : 'Accedi'}</h1>
    <p className="step-description">{recovery ? 'Inserisci la tua email per ricevere un nuovo link di recupero.' : 'Usa l’account abilitato alla gestione delle prenotazioni.'}</p>
    <form onSubmit={submit} aria-busy={busy}>
      <div className="login-fields">
        <BookingField id="admin-email" label="Email" type="email" autoComplete="username" required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} />
        {!recovery && <BookingField id="admin-password" label="Password" type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />}
      </div>
      {!bookingConfigured && <p role="alert" className="submission-error">Collegamento Supabase non configurato.</p>}
      {error && <p role="alert" className="submission-error">{error}</p>}
      {notice && <p role="status" className="submission-status">{notice}</p>}
      <div className="form-actions"><button className="button-primary" disabled={busy || !bookingConfigured}>{busy ? (recovery ? 'Invio in corso…' : 'Accesso in corso…') : recovery ? 'Invia link di recupero' : 'Accedi'}</button><button className="button-secondary" type="button" disabled={busy} onClick={() => { setRecovery(value => !value); setError(''); setNotice(''); setPassword('') }}>{recovery ? 'Torna al login' : 'Password dimenticata?'}</button></div>
    </form>
  </section>
}
