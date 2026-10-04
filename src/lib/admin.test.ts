import { afterEach, expect, it, vi } from 'vitest'
import { decideReservation } from './admin'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { rpc } }))
afterEach(() => { vi.resetAllMocks() })
it('rifiuta risposte di decisione con identificativo o stato diverso', async () => {
  for (const data of [null, { id: 'other', status: 'rejected' }, { id: 'requested', status: 'confirmed' }]) {
    rpc.mockReturnValue({ abortSignal: () => ({ single: vi.fn().mockResolvedValue({ data, error: null }) }) })
    await expect(decideReservation('requested', 'rejected')).rejects.toThrow('Esito non verificato')
  }
})
