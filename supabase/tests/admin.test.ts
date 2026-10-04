import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,expect,it} from 'vitest'
const db=new PGlite(),admin=randomUUID(),other=randomUUID()
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`)
 for(const file of ['202610040001_create_reservations.sql','202610040002_admin_dashboard.sql','202610040003_service_planning.sql','202610040004_simple_dashboard.sql'])await db.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'))
 await db.query('insert into auth.users values ($1),($2)',[admin,other]);await db.query('insert into private.reservation_admins(user_id) values($1)',[admin])
},30000)
afterAll(async()=>{await db.close()})
async function asUser(id:string,work:()=>Promise<void>,role='authenticated') {await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);try{await work()}finally{await db.exec('reset role')}}
async function create(name='TEST'){const id=randomUUID();await db.query("select public.create_reservation($1,'2099-10-12','19:30',4,$2,'Dashboard','+39 000 1234567')",[id,name]);return id}
it('preserva creazione pubblica e nega lettura/decisioni a client non autorizzati',async()=>{
 await asUser('',async()=>{await create();await expect(db.query("select public.reservation_overview('2099-10-12','dinner')")).rejects.toThrow(/permission denied/);await expect(db.query('select * from public.reservations')).rejects.toThrow(/permission denied/)},'anon')
 await asUser(other,async()=>{await expect(db.query('select public.search_reservations()')).rejects.toThrow(/Admin access required/);await expect(db.query("select public.decide_reservation($1,'confirmed')",[randomUUID()])).rejects.toThrow(/Admin access required/)})
})
it('conferma senza tavolo, conserva contatti e blocca seconde decisioni',async()=>{
 const id=await create('Marco');await asUser(admin,async()=>{const saved=(await db.query<{status:string;table_id:null;party_size:number}>("select * from public.decide_reservation($1,'confirmed')",[id])).rows[0];expect(saved.status).toBe('confirmed');expect(saved.table_id).toBeNull();expect(saved.party_size).toBe(4);await expect(db.query("select public.decide_reservation($1,'rejected')",[id])).rejects.toThrow(/no longer pending/);await expect(db.query('select * from public.reservations')).rejects.toThrow(/permission denied/);await expect(db.query('select public.get_service_config()')).rejects.toThrow(/permission denied/)})
})
it('filtra e conta tutte le righe anche oltre pagina 50; separa cancellate e rifiutate',async()=>{
 for(let i=0;i<52;i++)await create('Paginazione')
 const reject=await create('Rifiuto');await asUser(admin,async()=>{
 await db.query("select public.decide_reservation($1,'rejected')",[reject])
 const result=(await db.query<{v:{total:number;rows:unknown[]}}>("select public.search_reservations('pending',null,null,'Paginazione',50,true,null) v")).rows[0].v;expect(result.total).toBe(52);expect(result.rows).toHaveLength(2)
 const phone=(await db.query<{v:{total:number}}>("select public.search_reservations(null,null,null,'000 1234567') v")).rows[0].v;expect(phone.total).toBeGreaterThan(50)
 const overview=(await db.query<{v:{pending_total:number;day:{covers:number;cancelled:number}}}>("select public.reservation_overview('2099-10-12','dinner') v")).rows[0].v;expect(overview.pending_total).toBeGreaterThan(50);expect(overview.day.cancelled).toBe(0);expect(overview.day.covers).toBeGreaterThan(200)
 const lunch=(await db.query<{v:{total:number}}>("select public.search_reservations(null,'2099-10-12','2099-10-12','',0,false,'lunch') v")).rows[0].v;expect(lunch.total).toBe(0)
 await expect(db.query("select public.search_reservations('bad')")).rejects.toThrow(/Invalid filter/)
 })
})
it('la revoca admin interrompe subito le RPC',async()=>{await db.query('delete from private.reservation_admins where user_id=$1',[admin]);await asUser(admin,async()=>{await expect(db.query('select public.search_reservations()')).rejects.toThrow(/Admin access required/)})})
