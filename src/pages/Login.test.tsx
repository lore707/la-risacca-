// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Login from './Login'
const reset = vi.hoisted(() => vi.fn())
vi.mock('../lib/admin', () => ({ signInAdmin: vi.fn() }))
vi.mock('../lib/passwordRecovery', () => ({ requestPasswordReset: reset }))
vi.mock('../lib/supabase', () => ({ bookingConfigured: true }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('richiede il link dal login senza password e non rivela se un account esiste', async () => {
  reset.mockResolvedValue(undefined); render(<Login />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.invalid' } })
  fireEvent.click(screen.getByRole('button', { name: 'Password dimenticata?' }))
  expect(screen.queryByLabelText('Password')).toBeNull()
  fireEvent.submit(screen.getByRole('button', { name: 'Invia link di recupero' }).closest('form')!)
  expect((await screen.findByRole('status')).textContent).toContain('Se l’indirizzo')
  expect(reset).toHaveBeenCalledWith('admin@example.invalid')
})
