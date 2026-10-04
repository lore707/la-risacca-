import { supabase } from './supabase'
import { validateBooking } from './bookingValidation'
import type { BookingDraft } from '../types/reservation'

export class BookingSubmissionError extends Error {}

export async function createReservation(draft: BookingDraft, requestId: string): Promise<string> {
  if (!supabase) throw new BookingSubmissionError('L’invio non è ancora disponibile. Puoi contattare il ristorante per prenotare.')
  if (Object.keys(validateBooking(draft)).length) throw new BookingSubmissionError('Controlla i dati e scegli una data e un orario futuri.')

  const { data, error } = await supabase.rpc('create_reservation', {
    p_request_id: requestId,
    p_reservation_date: draft.reservation_date,
    p_reservation_time: draft.reservation_time,
    p_party_size: Number(draft.party_size),
    p_first_name: draft.first_name.trim(),
    p_last_name: draft.last_name.trim(),
    p_phone: draft.phone.trim(),
    p_email: draft.email.trim() || null,
    p_notes: draft.notes.trim() || null,
  }).abortSignal(AbortSignal.timeout(15000))

  if (error?.code === '22023' || error?.code === '23514') {
    throw new BookingSubmissionError('Controlla i dati e scegli una data e un orario futuri.')
  }
  if (error || data !== requestId) {
    throw new BookingSubmissionError('Non è stato possibile verificare l’invio. I dati sono ancora qui: riprova o chiama il ristorante.')
  }
  return data
}
