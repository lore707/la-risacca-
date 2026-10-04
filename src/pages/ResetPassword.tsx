import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import BookingField from '../components/BookingField'
import Brand from '../components/Brand'
import { updatePassword, watchPasswordSession } from '../lib/passwordRecovery'
import { bookingConfigured } from '../lib/supabase'

export default function ResetPassword() {
  const [session, setSession] = useState<'loading' | 'ready' | 'invalid'>('loading')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const lock = useRef(false)
  useEffect(() => watchPasswordSession(setSession), [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current || session !== 'ready') return
    setError('')
    if (password.length < 8) { setError('Usa una password di almeno 8 caratteri.'); return }
    if (password !== confirmation) { setError('Le password non coincidono.'); return }
    lock.current = true; setBusy(true)
    try { await updatePassword(password); setPassword(''); setConfirmation(''); setSaved(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Password non aggiornata. Riprova.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <><header className="site-header"><Link className="wordmark" to="/prenota"><Brand subtitle="Gestione prenotazioni" /></Link></header><main className="admin-layout"><section className="booking-card login-card">
    <p className="eyebrow">Area ristorante</p><h1>Nuova password</h1>
    {!bookingConfigured ? <p className="submission-error" role="alert">Collegamento Supabase non configurato.</p> : saved ? <><p className="submission-status" role="status">Password aggiornata e salvata.</p><Link className="contact-link" to="/admin">Vai alla dashboard</Link></> : session === 'loading' ? <p role="status" className="step-description">Verifica del link di recupero…</p> : session === 'invalid' ? <><p className="submission-error" role="alert">Link scaduto, già utilizzato o non valido. Richiedi una nuova email di recupero e apri soltanto il link più recente.</p><Link className="contact-link" to="/admin/login">Richiedi un nuovo link dal login</Link></> : <>
      <p className="step-description">Scegli una password di almeno 8 caratteri per il tuo account.</p>
      <form onSubmit={submit} aria-busy={busy}><div className="login-fields">
        <BookingField id="new-password" label="Nuova password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} />
        <BookingField id="confirm-password" label="Ripeti la password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </div>{error && <p role="alert" className="submission-error">{error}</p>}<div className="form-actions"><button className="button-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva nuova password'}</button></div></form>
    </>}
  </section></main></>
}
