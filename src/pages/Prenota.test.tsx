// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Prenota from './Prenota'

const mocks = vi.hoisted(() => ({ configured: false, create: vi.fn() }))
vi.mock('../lib/supabase', () => ({ get bookingConfigured() { return mocks.configured } }))
vi.mock('../lib/reservations', async (original) => ({ ...await original<typeof import('../lib/reservations')>(), createReservation: mocks.create }))

afterEach(() => { cleanup(); mocks.configured = false; mocks.create.mockReset() })

function fillDate() {
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2099-10-12' } })
  fireEvent.change(screen.getByLabelText('Ora'), { target: { value: '20:30' } })
  fireEvent.change(screen.getByLabelText('Persone'), { target: { value: '4' } })
}

async function goToReview() {
  fillDate()
  await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
  await userEvent.type(screen.getByLabelText('Nome'), 'Marco')
  await userEvent.type(screen.getByLabelText('Cognome'), 'Rossi')
  await userEvent.type(screen.getByLabelText('Telefono'), '+39 333 1234567')
  await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
  await userEvent.click(screen.getByRole('button', { name: /Controlla la richiesta/ }))
}

describe('percorso del form', () => {
  it('blocca il passaggio successivo quando mancano data e ora', async () => {
    render(<Prenota />)
    await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
    expect(screen.getByText('Scegli una data valida.')).toBeTruthy()
    expect(screen.getByText('Scegli un orario valido.')).toBeTruthy()
    expect(screen.queryByLabelText('Nome')).toBeNull()
  })

  it('conserva la scelta tornando indietro', async () => {
    render(<Prenota />)
    fillDate()
    await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
    expect(screen.getByLabelText('Nome')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    expect((screen.getByLabelText('Data') as HTMLInputElement).value).toBe('2099-10-12')
    expect((screen.getByLabelText('Persone') as HTMLInputElement).value).toBe('4')
  })

  it('mostra il riepilogo senza simulare un salvataggio', async () => {
    render(<Prenota />)
    fillDate()
    await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Marco')
    await userEvent.type(screen.getByLabelText('Cognome'), 'Rossi')
    await userEvent.type(screen.getByLabelText('Telefono'), '+39 333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /Continua/ }))
    await userEvent.type(screen.getByLabelText('Note · facoltative'), 'Un seggiolino')
    await userEvent.click(screen.getByRole('button', { name: /Controlla la richiesta/ }))
    expect(screen.getByText('Marco Rossi')).toBeTruthy()
    expect(screen.getByText('Un seggiolino')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('I dati inseriti non vengono salvati')
    expect((screen.getByRole('button', { name: 'Richiedi prenotazione' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Richiesta ricevuta')).toBeNull()
  })

  it('mostra successo soltanto dopo la risposta e blocca invii simultanei', async () => {
    mocks.configured = true
    let resolve!: (id: string) => void
    mocks.create.mockImplementation(() => new Promise<string>((done) => { resolve = done }))
    render(<Prenota />)
    await goToReview()
    const button = screen.getByRole('button', { name: 'Richiedi prenotazione' })
    const form = button.closest('form')!
    await userEvent.click(button)
    fireEvent.submit(form)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Invio in corso…' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Richiesta ricevuta')).toBeNull()
    resolve(mocks.create.mock.calls[0][1])
    expect(await screen.findByRole('heading', { name: 'Richiesta ricevuta' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Richiedi prenotazione' })).toBeNull()
  })

  it('conserva i dati e lo stesso identificativo dopo un errore di rete', async () => {
    mocks.configured = true
    mocks.create.mockRejectedValueOnce(new Error('network failure'))
    mocks.create.mockImplementationOnce((_draft, id) => Promise.resolve(id))
    render(<Prenota />)
    await goToReview()
    await userEvent.click(screen.getByRole('button', { name: 'Richiedi prenotazione' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Marco Rossi')).toBeTruthy()
    expect(screen.queryByText('Richiesta ricevuta')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Richiedi prenotazione' }))
    expect(await screen.findByRole('heading', { name: 'Richiesta ricevuta' })).toBeTruthy()
    expect(mocks.create.mock.calls[0][1]).toBe(mocks.create.mock.calls[1][1])
  })
})
