import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const insertQuery = 'select public.create_reservation($1::uuid, $2::date, $3::time, $4::integer, $5, $6, $7, $8, $9) as id'
const values = (id = randomUUID()) => [id, '2099-10-12', '20:30', 4, ' Marco ', 'Rossi', '+39 333 1234567', '', '']

beforeAll(async () => {
  // Riproduce i ruoli API; il progetto cloud avrà già questi ruoli.
  await db.exec('create role anon; create role authenticated; create role service_role; grant usage on schema public to anon, authenticated, service_role;')
  const sql = await readFile(new URL('../migrations/202610040001_create_reservations.sql', import.meta.url), 'utf8')
  await db.exec(sql)
}, 30000)

afterAll(async () => { await db.close() })

describe('schema prenotazioni e permessi', () => {
  it('salva una richiesta anonima pending/website senza esporre la tabella', async () => {
    const args = values()
    await db.exec('set role anon')
    try {
      const result = await db.query<{ id: string }>(insertQuery, args)
      expect(result.rows[0].id).toBe(args[0])
      await expect(db.query('select * from public.reservations')).rejects.toThrow(/permission denied/)
    } finally { await db.exec('reset role') }
    const saved = await db.query('select status, source, first_name, email, notes from public.reservations where id = $1', [args[0]])
    expect(saved.rows[0]).toEqual({ status: 'pending', source: 'website', first_name: 'Marco', email: null, notes: null })
  })

  it('non duplica lo stesso invio e rifiuta il riutilizzo del codice con dati diversi', async () => {
    const args = values()
    await db.query(insertQuery, args)
    await db.query(insertQuery, args)
    expect((await db.query<{ count: number }>('select count(*)::integer as count from public.reservations where id = $1', [args[0]])).rows[0].count).toBe(1)
    const changed = [...args]
    changed[4] = 'Altro nome'
    await expect(db.query(insertQuery, changed)).rejects.toThrow(/identifier conflict/)
  })

  it('blocca date passate, persone non positive e contatti invalidi lato database', async () => {
    for (const [index, value] of [[1, '2000-01-01'], [3, 0], [4, ' '], [6, 'abc1234567'], [7, 'non-valida']] as const) {
      const args = values()
      args[index] = value
      await expect(db.query(insertQuery, args)).rejects.toThrow()
    }
  })

  it('nega lettura, scrittura diretta e cambi di stato ai ruoli client', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      try {
        await expect(db.query('select * from public.reservations')).rejects.toThrow(/permission denied/)
        await expect(db.query("update public.reservations set status = 'confirmed'")).rejects.toThrow(/permission denied/)
        await expect(db.query('delete from public.reservations')).rejects.toThrow(/permission denied/)
        await expect(db.query('insert into public.reservations (id) values ($1)', [randomUUID()])).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
    expect((await db.query<{ rls: boolean }>("select relrowsecurity as rls from pg_class where oid = 'public.reservations'::regclass")).rows[0].rls).toBe(true)
  })

  it('preserva id e data di creazione e aggiorna il timestamp dello stato', async () => {
    const args = values()
    await db.query(insertQuery, args)
    const before = (await db.query<{ created_at: Date; status_changed_at: Date }>('select created_at, status_changed_at from public.reservations where id = $1', [args[0]])).rows[0]
    await db.query("update public.reservations set status = 'confirmed', created_at = '2000-01-01', id = $2 where id = $1", [args[0], randomUUID()])
    const after = (await db.query<{ id: string; created_at: Date; status_changed_at: Date; status: string }>('select id, created_at, status_changed_at, status from public.reservations where id = $1', [args[0]])).rows[0]
    expect(after.id).toBe(args[0])
    expect(after.created_at).toEqual(before.created_at)
    expect(after.status).toBe('confirmed')
    expect(new Date(after.status_changed_at).getTime()).toBeGreaterThanOrEqual(new Date(before.status_changed_at).getTime())
  })
})
