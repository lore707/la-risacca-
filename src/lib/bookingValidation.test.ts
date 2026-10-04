import { describe, expect, it } from 'vitest'
import { restaurantToday, validateBooking } from './bookingValidation'
import type { BookingDraft } from '../types/reservation'

const now = new Date('2026-10-04T10:00:00Z')
const valid: BookingDraft = { reservation_date: '2026-10-12', reservation_time: '20:30', party_size: '4', first_name: 'Marco', last_name: 'Rossi', phone: '+39 333 1234567', email: '', notes: '' }

describe('validazione prenotazione', () => {
  it('accetta la richiesta della demo con email e note facoltative', () => {
    expect(validateBooking(valid, now)).toEqual({})
  })
  it('usa il giorno del ristorante anche vicino alla mezzanotte', () => {
    expect(restaurantToday(new Date('2026-10-03T22:30:00Z'))).toBe('2026-10-04')
  })
  it('rifiuta date passate e date inesistenti', () => {
    for (const date of ['2026-10-03', '2026-02-30', '', '2026-13-01']) {
      expect(validateBooking({ ...valid, reservation_date: date }, now).reservation_date).toBeTruthy()
    }
  })
  it('rifiuta un orario passato per oggi e un orario non valido', () => {
    expect(validateBooking({ ...valid, reservation_date: '2026-10-04', reservation_time: '11:59' }, now).reservation_time).toBeTruthy()
    expect(validateBooking({ ...valid, reservation_time: '24:00' }, now).reservation_time).toBeTruthy()
    expect(validateBooking({ ...valid, reservation_date: '2026-10-04', reservation_time: '20:30' }, now)).toEqual({})
  })
  it('richiede un numero intero positivo di persone', () => {
    for (const party_size of ['0', '-1', '1.5', '', '9999999999999999999']) expect(validateBooking({ ...valid, party_size }, now).party_size).toBeTruthy()
    expect(validateBooking({ ...valid, party_size: '1' }, now)).toEqual({})
  })
  it('rifiuta dati di contatto mancanti o malformati', () => {
    const errors = validateBooking({ ...valid, first_name: ' ', last_name: '', phone: 'abc3331234567', email: 'non-valida' }, now)
    expect(Object.keys(errors)).toEqual(['first_name', 'last_name', 'phone', 'email'])
  })
  it('limita la lunghezza delle note', () => {
    expect(validateBooking({ ...valid, notes: 'a'.repeat(2001) }, now).notes).toBeTruthy()
  })
})
