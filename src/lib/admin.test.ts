import { afterEach, expect, it, vi } from 'vitest'
import { decideReservation, watchAdminAccess } from './admin'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), callback: null as null | ((_event: string, session: object | null) => void), unsubscribe: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: {
  rpc: mocks.rpc, auth: { onAuthStateChange: (callback: typeof mocks.callback) => { mocks.callback = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } } } },
} }))
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

it('ignora una verifica admin tardiva dopo il logout', async () => {
  vi.useFakeTimers()
  let resolve!: (value: { data: boolean; error: null }) => void
  mocks.rpc.mockReturnValue({ abortSignal: () => new Promise((done) => { resolve = done }) })
  const changed = vi.fn()
  const stop = watchAdminAccess(changed)
  mocks.callback!('SIGNED_IN', {})
  await vi.advanceTimersByTimeAsync(0)
  mocks.callback!('SIGNED_OUT', null)
  resolve({ data: true, error: null })
  await Promise.resolve()
  expect(changed.mock.calls.map(([state]) => state)).toEqual(['loading', 'login'])
  stop()
  expect(mocks.unsubscribe).toHaveBeenCalledOnce()
})

it('rifiuta risposte di decisione con identificativo o stato diverso', async () => {
  for (const data of [null, { id: 'other', status: 'rejected' }, { id: 'requested', status: 'confirmed' }]) {
    mocks.rpc.mockReturnValue({ abortSignal: () => ({ single: vi.fn().mockResolvedValue({ data, error: null }) }) })
    await expect(decideReservation('requested', 'rejected')).rejects.toThrow('Esito non verificato')
  }
})
