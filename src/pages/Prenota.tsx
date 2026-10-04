import { useRef, useState } from 'react'
import type { FormEvent, InputHTMLAttributes } from 'react'
import BookingField from '../components/BookingField'
import Brand from '../components/Brand'
import BookingSummary from '../components/BookingSummary'
import { restaurantToday, validateBooking } from '../lib/bookingValidation'
import { bookingConfigured } from '../lib/supabase'
import { BookingSubmissionError, createReservation } from '../lib/reservations'
import type { BookingDraft, BookingErrors } from '../types/reservation'

const steps = ['Quando', 'I tuoi dati', 'Note', 'Riepilogo']
const headings = ['Quando vuoi venire?', 'Come possiamo contattarti?', 'Un’attenzione in più.', 'Controlla la tua richiesta.']
const stepFields: (keyof BookingDraft)[][] = [
  ['reservation_date', 'reservation_time', 'party_size'],
  ['first_name', 'last_name', 'phone', 'email'],
  ['notes'],
]

export default function Prenota() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<BookingDraft>({ reservation_date: '', reservation_time: '', party_size: '2', first_name: '', last_name: '', phone: '', email: '', notes: '' })
  const [errors, setErrors] = useState<BookingErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [receipt, setReceipt] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const inFlight = useRef(false)
  const requestId = useRef<string | null>(null)

  function update(name: keyof BookingDraft, value: string) {
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
    requestId.current = null
  }

  function move(next: number) {
    setStep(next)
    setErrors({})
    requestAnimationFrame(() => heading.current?.focus())
  }

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || receipt) return
    const allErrors = validateBooking(draft)
    const fields = step >= 2 ? Object.keys(draft) as (keyof BookingDraft)[] : stepFields[step]
    const relevant: BookingErrors = {}
    fields.forEach((field) => { if (allErrors[field]) relevant[field] = allErrors[field] })
    if (Object.keys(relevant).length) {
      const firstField = Object.keys(relevant)[0] as keyof BookingDraft
      const invalidStep = stepFields.findIndex((group) => group.includes(firstField))
      if (invalidStep !== step) setStep(invalidStep)
      setErrors(relevant)
      requestAnimationFrame(() => document.getElementById(firstField)?.focus())
      return
    }
    if (step < 3) {
      move(step + 1)
      return
    }
    if (!bookingConfigured) return
    inFlight.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      requestId.current ??= crypto.randomUUID()
      const savedId = await createReservation(draft, requestId.current)
      setReceipt(savedId)
      requestAnimationFrame(() => heading.current?.focus())
    } catch (error) {
      setSubmitError(error instanceof BookingSubmissionError ? error.message : 'Non è stato possibile verificare l’invio. I dati sono ancora qui: riprova o chiama il ristorante.')
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  function field(name: keyof BookingDraft, label: string, props: InputHTMLAttributes<HTMLInputElement> & { hint?: string } = {}) {
    return <BookingField {...props} id={name} name={name} label={label} value={draft[name]} onChange={(event) => update(name, event.target.value)} error={errors[name]} />
  }

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="https://la-risacca-2.onrender.com/"><Brand subtitle="Milano · dal 1985" /></a>
        <a className="back-link" href="https://la-risacca-2.onrender.com/">Torna al ristorante <span aria-hidden="true">↗</span></a>
      </header>
      <main className="booking-layout">
        <aside className="intro">
          <p className="eyebrow">Il tuo tavolo, sul mare di Milano</p>
          <h1>Ci vediamo<br />a <em>tavola.</em></h1>
          <div className="gold-line" />
          <p className="intro-copy">Scegli quando venirci a trovare.<br />Al resto dell’accoglienza pensiamo noi.</p>
          <p className="request-note">Ogni prenotazione inizia con una richiesta. Il ristorante ti contatterà per confermare la disponibilità del tavolo.</p>
          <div className="restaurant-info"><p>Viale Regina Giovanna 14<br />Milano</p><a href="tel:+390229531801">02 2953 1801</a></div>
        </aside>
        <section className="booking-card" aria-label="Richiesta di prenotazione">
          {receipt ? <>
            <p className="eyebrow card-eyebrow">Richiesta inviata</p>
            <h2 ref={heading} tabIndex={-1}>Richiesta ricevuta</h2>
            <p className="step-description">Il ristorante confermerà la disponibilità della prenotazione. Il tuo tavolo è ancora da confermare: ti contatteremo al numero che hai indicato.</p>
            <BookingSummary draft={draft} />
            <p className="receipt-reference">Riferimento richiesta: {receipt}</p>
          </> : <>
          <ol className="stepper" aria-label="Passaggi della prenotazione">
            {steps.map((label, index) => <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : index + 1}</span><span>{label}</span></li>)}
          </ol>
          <p className="eyebrow card-eyebrow">Passaggio {step + 1} di 4</p>
          <h2 ref={heading} tabIndex={-1}>{headings[step]}</h2>
          <p className="step-description">{['La disponibilità sarà verificata dal ristorante.', 'Il telefono ci servirà per confermare il tuo tavolo.', 'Se vuoi, raccontaci come rendere speciale la tua visita.', 'La prenotazione sarà valida solo dopo la conferma del ristorante.'][step]}</p>
          <form onSubmit={next} noValidate aria-busy={submitting}>
            {step === 0 && <div className="fields-grid">
              {field('reservation_date', 'Data', { type: 'date', min: restaurantToday(), required: true })}
              {field('reservation_time', 'Ora', { type: 'time', required: true })}
              {field('party_size', 'Persone', { type: 'number', min: 1, step: 1, inputMode: 'numeric', required: true })}
            </div>}
            {step === 1 && <div className="fields-grid">
              {field('first_name', 'Nome', { autoComplete: 'given-name', maxLength: 100, required: true })}
              {field('last_name', 'Cognome', { autoComplete: 'family-name', maxLength: 100, required: true })}
              {field('phone', 'Telefono', { type: 'tel', autoComplete: 'tel', required: true, hint: 'Includi il prefisso per i numeri esteri.' })}
              {field('email', 'Email · facoltativa', { type: 'email', autoComplete: 'email', maxLength: 254 })}
            </div>}
            {step === 2 && <div className="field"><label htmlFor="notes">Note · facoltative</label><textarea id="notes" name="notes" value={draft.notes} onChange={(event) => update('notes', event.target.value)} maxLength={2000} rows={5} placeholder="Un seggiolino, un’occasione speciale, esigenze particolari…" aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'notes-error' : 'notes-hint'} />{errors.notes ? <p className="field-error" id="notes-error">{errors.notes}</p> : <p className="field-hint" id="notes-hint">Inserisci solo le informazioni che desideri condividere con il ristorante.</p>}</div>}
            {step === 3 && <>
              <BookingSummary draft={draft} />
              {!bookingConfigured && <p className="development-notice" id="booking-unavailable" role="status">Anteprima in sviluppo: l’invio delle richieste non è ancora attivo. I dati inseriti non vengono salvati. Per prenotare, <a href="tel:+390229531801">chiama il ristorante</a>.</p>}
              {submitting && <p className="submission-status" role="status">Stiamo inviando la tua richiesta…</p>}
              {submitError && <p className="submission-error" role="alert">{submitError}</p>}
            </>}
            <div className="form-actions">{step > 0 && <button className="button-secondary" type="button" disabled={submitting} onClick={() => move(step - 1)}>Indietro</button>}{step < 3 ? <button className="button-primary" type="submit">{step === 2 ? 'Controlla la richiesta' : 'Continua'} <span aria-hidden="true">→</span></button> : <button className="button-primary" type="submit" disabled={!bookingConfigured || submitting} aria-describedby={!bookingConfigured ? 'booking-unavailable' : undefined}>{submitting ? 'Invio in corso…' : 'Richiedi prenotazione'}</button>}</div>
          </form>
          </>}
          <p className="card-footer">Preferisci sentirci? <a href="tel:+390229531801">Chiama il ristorante</a></p>
        </section>
      </main>
      <footer className="site-footer"><span>La Risacca 2 · Ristorante di pesce dal 1985</span><span>Milano, Porta Venezia</span></footer>
    </>
  )
}
