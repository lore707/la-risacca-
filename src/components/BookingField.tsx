import type { InputHTMLAttributes } from 'react'

interface BookingFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  id: string
}

export default function BookingField({ label, error, hint, id, ...props }: BookingFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  )
}
