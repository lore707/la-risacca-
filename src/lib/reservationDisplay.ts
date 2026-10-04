import type { ReservationStatus } from '../types/reservation'
import { restaurantToday } from './bookingValidation'
export const statusLabels: Record<ReservationStatus,string> = {pending:'Da confermare',confirmed:'Confermata',rejected:'Rifiutata',cancelled:'Cancellata'}
export function dayLabel(date:string) {return date===restaurantToday()?'Oggi':date.split('-').reverse().join('/')}
export function waiting(created:string,now=Date.now()) {const m=Math.max(0,Math.floor((now-Date.parse(created))/60000));return m<60?`${m} min`:m<1440?`${Math.floor(m/60)} h ${m%60} min`:`${Math.floor(m/1440)} giorni`}
export function shiftDay(date:string,amount:number) {const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}
