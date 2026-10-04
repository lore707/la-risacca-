// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import ResetPassword from './ResetPassword'

const mocks = vi.hoisted(() => ({ update: vi.fn(), change: null as null | ((state: 'ready' | 'invalid') => void), stop: vi.fn() }))
vi.mock('../lib/passwordRecovery', () => ({ updatePassword: mocks.update, watchPasswordSession: (callback: typeof mocks.change) => { mocks.change = callback; return mocks.stop } }))
vi.mock('../lib/supabase', () => ({ bookingConfigured: true }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
function mount() { render(<MemoryRouter><ResetPassword /></MemoryRouter>) }
function fill(a = 'password-di-prova', b = a) {
  fireEvent.change(screen.getByLabelText('Nuova password'), { target: { value: a } })
  fireEvent.change(screen.getByLabelText('Ripeti la password'), { target: { value: b } })
}
it('attende la sessione e segnala un link invalido senza mostrare il form', () => {
  mount(); expect(screen.queryByLabelText('Nuova password')).toBeNull()
  act(() => mocks.change!('invalid'))
  expect(screen.getByRole('alert').textContent).toContain('Link scaduto')
  expect(screen.queryByLabelText('Nuova password')).toBeNull()
})
it('valida conferma e lunghezza prima della scrittura', () => {
  mount(); act(() => mocks.change!('ready')); fill('short')
  fireEvent.submit(screen.getByRole('button', { name: 'Salva nuova password' }).closest('form')!)
  expect(screen.getByRole('alert').textContent).toContain('almeno 8')
  fill('password-di-prova', 'diversa-password')
  fireEvent.submit(screen.getByRole('button', { name: 'Salva nuova password' }).closest('form')!)
  expect(screen.getByRole('alert').textContent).toContain('non coincidono')
  expect(mocks.update).not.toHaveBeenCalled()
})
it('blocca doppi invii e mostra successo solo dopo il salvataggio', async () => {
  let finish!: () => void
  mocks.update.mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  mount(); act(() => mocks.change!('ready')); fill()
  const form = screen.getByRole('button', { name: 'Salva nuova password' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(mocks.update).toHaveBeenCalledOnce()
  expect(screen.queryByText('Password aggiornata e salvata.')).toBeNull()
  await act(async () => finish())
  expect(screen.getByRole('status').textContent).toContain('Password aggiornata')
  expect(screen.getByRole('link', { name: 'Vai alla dashboard' })).toBeTruthy()
})
it('mantiene il form e non mostra successo se il backend rifiuta la password', async () => {
  mocks.update.mockRejectedValue(new Error('Password non aggiornata.'))
  mount(); act(() => mocks.change!('ready')); fill()
  fireEvent.submit(screen.getByRole('button', { name: 'Salva nuova password' }).closest('form')!)
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Password non aggiornata'))
  expect(screen.queryByText('Password aggiornata e salvata.')).toBeNull()
})
