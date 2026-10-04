import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BookingDraft } from '../types/reservation'
import { createReservation } from './reservations'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { rpc: mocks.rpc } }))
afterEach(() => { mocks.rpc.mockReset() })

const draft: BookingDraft = { reservation_date: '2099-10-12', reservation_time: '20:30', party_size: '4', first_name: ' Marco ', last_name: ' Rossi ', phone: '+39 333 1234567', email: ' ', notes: ' ' }
const requestId = '5d93b684-940c-488b-8e6e-adc56714f888'
function respond(data: unknown, error: unknown = null) {
  mocks.rpc.mockReturnValue({ abortSignal: vi.fn().mockResolvedValue({ data, error }) })
}

describe('invio al backend', () => {
  it('invia dati normalizzati e restituisce solo la ricevuta verificata', async () => {
    respond(requestId)
    expect(await createReservation(draft, requestId)).toBe(requestId)
    expect(mocks.rpc).toHaveBeenCalledWith('create_reservation', {
      p_request_id: requestId, p_reservation_date: '2099-10-12', p_reservation_time: '20:30',
      p_party_size: 4, p_first_name: 'Marco', p_last_name: 'Rossi', p_phone: '+39 333 1234567',
      p_email: null, p_notes: null,
    })
  })

  it('non accetta una risposta vuota o un codice di richiesta diverso', async () => {
    for (const data of [null, '', 'altro-codice']) {
      respond(data)
      await expect(createReservation(draft, requestId)).rejects.toThrow('Non è stato possibile verificare l’invio')
    }
  })

  it('traduce gli errori del database senza esporre messaggi tecnici', async () => {
    respond(null, { code: '23514', message: 'private database details' })
    await expect(createReservation(draft, requestId)).rejects.toThrow('Controlla i dati')
    respond(null, { code: '42501', message: 'private database details' })
    await expect(createReservation(draft, requestId)).rejects.toThrow('Non è stato possibile verificare l’invio')
  })

  it('non contatta il backend con dati non validi', async () => {
    await expect(createReservation({ ...draft, party_size: '0' }, requestId)).rejects.toThrow('Controlla i dati')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
