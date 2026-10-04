import type { BookingDraft } from '../types/reservation'

export default function BookingSummary({ draft }: { draft: BookingDraft }) {
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome',
  }).format(new Date(`${draft.reservation_date}T12:00:00Z`))

  return (
    <div className="summary">
      <div className="summary-date">{formattedDate}<strong>{draft.reservation_time} <span>·</span> {draft.party_size} {Number(draft.party_size) === 1 ? 'persona' : 'persone'}</strong></div>
      <dl>
        <div><dt>Ospite</dt><dd>{draft.first_name.trim()} {draft.last_name.trim()}</dd></div>
        <div><dt>Telefono</dt><dd>{draft.phone.trim()}</dd></div>
        {draft.email.trim() && <div><dt>Email</dt><dd>{draft.email.trim()}</dd></div>}
        {draft.notes.trim() && <div><dt>Note</dt><dd className="summary-notes">{draft.notes.trim()}</dd></div>}
      </dl>
    </div>
  )
}
