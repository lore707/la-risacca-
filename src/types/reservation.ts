
export interface BookingDraft {
  reservation_date: string
  reservation_time: string
  party_size: string
  first_name: string
  last_name: string
  phone: string
  email: string
  notes: string
}

export type BookingErrors = Partial<Record<keyof BookingDraft, string>>

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
export type Reservation = {
  id: string
  created_at: string
  updated_at: string
  status_changed_at: string
  reservation_date: string
  reservation_time: string
  party_size: number
  first_name: string
  last_name: string
  phone: string
  email: string | null
  notes: string | null
  status: ReservationStatus
  source: string
}

export type CreateReservationArgs = {
  p_request_id: string
  p_reservation_date: string
  p_reservation_time: string
  p_party_size: number
  p_first_name: string
  p_last_name: string
  p_phone: string
  p_email: string | null
  p_notes: string | null
}

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: {
      create_reservation: { Args: CreateReservationArgs; Returns: string }
      is_reservation_admin: { Args: Record<string, never>; Returns: boolean }
      search_reservations: { Args: { p_status: string | null; p_from: string | null; p_to: string | null; p_search: string; p_offset: number; p_oldest: boolean; p_service: string | null }; Returns: ReservationPage }
      reservation_overview: { Args: { p_date: string; p_service: string }; Returns: ReservationOverview }
      decide_reservation: { Args: { p_id: string; p_status: string }; Returns: Reservation }
    }
  }
}

export type ReservationPage = { rows: Reservation[]; total: number }
export type ReservationOverview = { pending_total: number; oldest_at: string | null; day: { total: number; pending: number; covers: number; cancelled: number } }
