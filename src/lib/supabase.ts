import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/reservation'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

// La fase iniziale supporta solo le nuove chiavi pubbliche, mai secret/service_role.
export const bookingConfigured = /^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(url) && key.startsWith('sb_publishable_')
export const supabase = bookingConfigured ? createClient<Database>(url, key) : null
