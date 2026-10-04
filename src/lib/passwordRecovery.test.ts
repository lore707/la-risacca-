// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { requestPasswordReset, routePasswordRecovery, updatePassword, watchPasswordSession } from './passwordRecovery'

const mocks = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), getSession: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event: string, session: object | null) => void) }))
vi.mock('./supabase', () => ({ supabase: { auth: {
  resetPasswordForEmail: mocks.reset, updateUser: mocks.update, getSession: mocks.getSession,
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } } },
} } }))
afterEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/') })

it('richiede un link sulla pagina password dello stesso dominio e gestisce errori di invio', async () => {
  mocks.reset.mockResolvedValueOnce({ error: null })
  await requestPasswordReset(' admin@example.invalid ')
  expect(mocks.reset).toHaveBeenCalledWith('admin@example.invalid', { redirectTo: `${window.location.origin}/admin/password` })
  mocks.reset.mockResolvedValueOnce({ error: { message: 'rate limit' } })
  await expect(requestPasswordReset('admin@example.invalid')).rejects.toThrow('Invio non riuscito')
})
it('intercetta il link recovery alla radice senza eliminarne i parametri prima del SDK', () => {
  window.history.replaceState(null, '', '/#type=recovery&test=fake')
  const stop = routePasswordRecovery()
  expect(window.location.pathname).toBe('/admin/password')
  expect(window.location.hash).toBe('#type=recovery&test=fake')
  window.history.replaceState(null, '', '/prenota')
  mocks.listener!('PASSWORD_RECOVERY', {})
  expect(window.location.pathname).toBe('/admin/password')
  stop(); expect(mocks.unsubscribe).toHaveBeenCalledOnce()
})
it('un link scaduto non concede il form neppure con una sessione precedente', () => {
  window.history.replaceState(null, '', '/admin/password#error=access_denied&error_code=otp_expired')
  const change = vi.fn(); watchPasswordSession(change)
  expect(change).toHaveBeenCalledWith('invalid')
  expect(mocks.getSession).not.toHaveBeenCalled()
  expect(window.location.hash).toBe('')
})
it('ignora una sessione tardiva dopo logout e dopo lo smontaggio', async () => {
  let finish!: (value: object) => void
  mocks.getSession.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const change = vi.fn(), stop = watchPasswordSession(change)
  mocks.listener!('SIGNED_OUT', null)
  finish({ data: { session: {} }, error: null }); await Promise.resolve()
  expect(change.mock.calls).toEqual([['invalid']])
  stop(); mocks.listener!('SIGNED_IN', {})
  expect(change.mock.calls).toEqual([['invalid']])
})
it('non dichiara successo senza conferma del backend', async () => {
  for (const response of [{ data: { user: null }, error: null }, { data: { user: {} }, error: {} }]) {
    mocks.update.mockResolvedValueOnce(response)
    await expect(updatePassword('password-di-prova')).rejects.toThrow('Password non aggiornata')
  }
  mocks.update.mockResolvedValueOnce({ data: { user: { id: 'test-user' } }, error: null })
  await updatePassword('password-di-prova')
  expect(mocks.update).toHaveBeenLastCalledWith({ password: 'password-di-prova' })
})
