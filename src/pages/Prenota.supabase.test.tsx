// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { loadEnv } from 'vite'

// Opt-in: questo test salva una richiesta identificabile nel progetto configurato.
// Non viene eseguito da npm test e non cancella dati dal database.
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

it.skipIf(process.env.RUN_SUPABASE_LIVE_TEST !== '1')('salva dal form su Supabase reale e verifica reinvio e accesso anonimo', async () => {
  const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_')
  vi.stubEnv('VITE_SUPABASE_URL', env.VITE_SUPABASE_URL)
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', env.VITE_SUPABASE_PUBLISHABLE_KEY)
  const { bookingConfigured } = await import('../lib/supabase')
  expect(bookingConfigured).toBe(true)
  const { default: Prenota } = await import('./Prenota')
  const { createReservation } = await import('../lib/reservations')
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 7)
  const draft = {
    reservation_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
    reservation_time: '20:30', party_size: '2', first_name: 'TEST', last_name: 'Booking MCP',
    phone: '+39 000 0000000', email: 'booking-test@example.invalid',
    notes: 'TEST TECNICO form → Supabase → decisione admin; nessun cliente reale. Conferma consentita per verifica. Non contattare.',
  }
  render(<Prenota />)
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fill('Data', draft.reservation_date)
  fill('Ora', draft.reservation_time)
  fill('Persone', draft.party_size)
  fireEvent.click(screen.getByRole('button', { name: /Continua/ }))
  fill('Nome', draft.first_name)
  fill('Cognome', draft.last_name)
  fill('Telefono', draft.phone)
  fill('Email · facoltativa', draft.email)
  fireEvent.click(screen.getByRole('button', { name: /Continua/ }))
  fill('Note · facoltative', draft.notes)
  fireEvent.click(screen.getByRole('button', { name: /Controlla la richiesta/ }))
  const form = screen.getByRole('button', { name: 'Richiedi prenotazione' }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect((screen.getByRole('button', { name: 'Invio in corso…' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole('heading', { name: 'Richiesta ricevuta' })).toBeNull()
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Richiesta ricevuta' })).toBeTruthy(), { timeout: 20000 })
  const receipt = screen.getByText(/^Riferimento richiesta:/).textContent!.replace('Riferimento richiesta: ', '')
  expect(receipt).toMatch(/^[0-9a-f-]{36}$/)
  expect(await createReservation(draft, receipt)).toBe(receipt)

  const read = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/reservations?select=id&id=eq.${receipt}`, {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
  })
  expect([401, 403]).toContain(read.status)
  expect((await read.json()).code).toBe('42501')
  console.info(`Richiesta di prova salvata (verificare via MCP): ${receipt}`)
}, 45000)
