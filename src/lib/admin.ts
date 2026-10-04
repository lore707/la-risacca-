import { supabase } from './supabase'
import type { Reservation, ReservationStatus, ReservationPage, ReservationOverview } from '../types/reservation'

function client() {
  if (!supabase) throw new Error('Collegamento non configurato.')
  return supabase
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error('Accesso non riuscito. Controlla le credenziali e riprova.')
}

export async function signOutAdmin() {
  const { error } = await client().auth.signOut({ scope: 'local' })
  if (error) throw new Error('Uscita non riuscita. Riprova.')
}

export async function checkAdmin() {
  const { data, error } = await client().rpc('is_reservation_admin').abortSignal(AbortSignal.timeout(15000))
  if (error) throw new Error('Impossibile verificare l’accesso. Riprova.')
  return data === true
}

// La callback Auth rimane sincrona; la verifica RPC parte fuori dal lock Auth.
export function watchAdminAccess(onChange: (state: 'loading' | 'login' | 'denied' | 'admin' | 'error') => void) {
  if (!supabase) { onChange('login'); return () => {} }
  let active = true
  let version = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const current = ++version
    onChange(session ? 'loading' : 'login')
    if (!session) return
    const timer = setTimeout(() => {
      timers.delete(timer)
      void checkAdmin().then((allowed) => {
        if (active && version === current) onChange(allowed ? 'admin' : 'denied')
      }).catch(() => { if (active && version === current) onChange('error') })
    }, 0)
    timers.add(timer)
  })
  return () => { active = false; version++; timers.forEach(clearTimeout); data.subscription.unsubscribe() }
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
