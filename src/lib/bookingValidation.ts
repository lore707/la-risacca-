import type { BookingDraft, BookingErrors } from '../types/reservation'

export function restaurantToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (name: string) => parts.find((entry) => entry.type === name)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function validateBooking(draft: BookingDraft, now = new Date()): BookingErrors {
  const errors: BookingErrors = {}
  const date = draft.reservation_date
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    errors.reservation_date = 'Scegli una data valida.'
  } else if (date < restaurantToday(now)) {
    errors.reservation_date = 'Scegli oggi o una data futura.'
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reservation_time)) {
    errors.reservation_time = 'Scegli un orario valido.'
  } else if (date === restaurantToday(now)) {
    const localTime = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now)
    if (draft.reservation_time <= localTime) errors.reservation_time = 'Scegli un orario futuro.'
  }
  if (!/^\d+$/.test(draft.party_size) || !Number.isSafeInteger(Number(draft.party_size)) || Number(draft.party_size) < 1 || Number(draft.party_size) > 2147483647) {
    errors.party_size = 'Inserisci un numero intero di persone, almeno 1.'
  }
  if (!draft.first_name.trim()) errors.first_name = 'Inserisci il tuo nome.'
  else if (draft.first_name.trim().length > 100) errors.first_name = 'Il nome può contenere al massimo 100 caratteri.'
  if (!draft.last_name.trim()) errors.last_name = 'Inserisci il tuo cognome.'
  else if (draft.last_name.trim().length > 100) errors.last_name = 'Il cognome può contenere al massimo 100 caratteri.'
  const phone = draft.phone.trim()
  const digits = phone.replace(/\D/g, '')
  if (!phone) errors.phone = 'Inserisci un numero di telefono.'
  else if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 6 || digits.length > 15) errors.phone = 'Inserisci un numero di telefono valido, con prefisso se necessario.'
  if (draft.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) || draft.email.trim().length > 254)) errors.email = 'Controlla l’indirizzo email.'
  if (draft.notes.length > 2000) errors.notes = 'Le note possono contenere al massimo 2.000 caratteri.'
  return errors
}
