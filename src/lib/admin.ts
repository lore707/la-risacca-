import { supabase } from './supabase'
import type { Reservation, ReservationStatus, ReservationPage, ReservationOverview } from '../types/reservation'

function client() {
  if (!supabase) throw new Error('Collegamento non configurato.')
  return supabase
}

export async function searchReservations(filters: { status?: ReservationStatus | ''; from?: string; to?: string; search?: string; page?: number; oldest?: boolean; service?: string }): Promise<ReservationPage> {
  const { data, error } = await client().rpc('search_reservations', {
    p_status: filters.status || null, p_from: filters.from || null, p_to: filters.to || null,
    p_search: filters.search || '', p_offset: (filters.page || 0) * 50, p_oldest: filters.oldest || false, p_service: filters.service || null,
  }).abortSignal(AbortSignal.timeout(15000))
  if (error || !data) throw new Error('Impossibile caricare le richieste. Riprova.')
  return data
}

export async function getOverview(date: string, service: string): Promise<ReservationOverview> {
  const { data, error } = await client().rpc('reservation_overview', { p_date: date, p_service: service }).abortSignal(AbortSignal.timeout(15000))
  if (error || !data) throw new Error('Impossibile caricare il riepilogo. Riprova.')
  return data
}

export async function decideReservation(id: string, status: 'confirmed' | 'rejected'): Promise<Reservation> {
  const { data, error } = await client().rpc('decide_reservation', { p_id: id, p_status: status }).abortSignal(AbortSignal.timeout(15000)).single<Reservation>()
  if (error?.code === '40001') throw new Error('La richiesta è già stata gestita. Aggiorna l’elenco.')
  if (error || !data || data.id !== id || data.status !== status) throw new Error('Esito non verificato. Aggiorna l’elenco prima di riprovare.')
  return data
}
