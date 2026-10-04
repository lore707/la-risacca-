// @vitest-environment happy-dom
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import Dashboard from './Dashboard'
import type {Reservation} from '../types/reservation'
const mocks=vi.hoisted(()=>({overview:vi.fn(),search:vi.fn(),decide:vi.fn()}))
vi.mock('../lib/admin',()=>({getOverview:mocks.overview,searchReservations:mocks.search,decideReservation:mocks.decide}))
const row:Reservation={id:'test',created_at:new Date(Date.now()-27*60000).toISOString(),updated_at:'2026-10-04T12:00:00Z',status_changed_at:'2026-10-04T12:00:00Z',reservation_date:'2099-10-12',reservation_time:'19:30:00',party_size:4,first_name:'Marco',last_name:'Bianchi',phone:'0001234567',email:null,notes:'Anniversario',status:'pending',source:'website'}
beforeEach(()=>{mocks.overview.mockResolvedValue({pending_total:1,oldest_at:row.created_at,day:{total:1,pending:1,covers:4,cancelled:0}});mocks.search.mockImplementation(({status})=>Promise.resolve({total:status==='pending'?1:0,rows:status==='pending'?[row]:[]}))})
afterEach(()=>{cleanup();vi.resetAllMocks()})
function mount(){render(<MemoryRouter><Dashboard/></MemoryRouter>)}
it('mostra richieste di tutte le date e attende il salvataggio, bloccando doppi invii',async()=>{
 let done!:(value:Reservation)=>void;mocks.decide.mockReturnValue(new Promise(resolve=>{done=resolve}));mount();const button=await screen.findByRole('button',{name:'Conferma'});fireEvent.click(button);fireEvent.click(button);expect(mocks.decide).toHaveBeenCalledTimes(1);expect(screen.getByText('Marco Bianchi')).toBeTruthy();expect(screen.queryByText(/Prenotazione confermata\./)).toBeNull()
 mocks.overview.mockResolvedValue({pending_total:0,oldest_at:null,day:{total:1,pending:0,covers:4,cancelled:0}});mocks.search.mockImplementation(({status})=>Promise.resolve({total:status==='confirmed'?1:0,rows:status==='confirmed'?[{...row,status:'confirmed'}]:[]}));await act(async()=>done({...row,status:'confirmed'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Conferma'})).toBeNull());expect(screen.getByText('Nessuna richiesta in attesa')).toBeTruthy();expect(screen.getByText('Marco Bianchi')).toBeTruthy()
})
it('rifiuta solo dopo la conferma del dialog, annulla senza scrivere',async()=>{mount();fireEvent.click(await screen.findByRole('button',{name:'Rifiuta'}));expect(mocks.decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Annulla'}));expect(mocks.decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Rifiuta'}));mocks.decide.mockResolvedValue({...row,status:'rejected'});fireEvent.click(screen.getByRole('button',{name:'Conferma rifiuto'}));await waitFor(()=>expect(mocks.decide).toHaveBeenCalledWith(row.id,'rejected'))})
it('non converte un errore di caricamento in conteggi zero',async()=>{mocks.overview.mockRejectedValue(new Error('network'));mount();expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Nessuna richiesta in attesa')).toBeNull();expect(screen.getByRole('button',{name:'Riprova'})).toBeTruthy()})
it('mostra dettagli e contatto senza assegnazione',async()=>{mount();fireEvent.click(await screen.findByRole('button',{name:'Dettagli'}));expect(screen.getByRole('dialog',{name:'Dettagli prenotazione'})).toBeTruthy();expect(screen.getByRole('link',{name:'Chiama il cliente'}).getAttribute('href')).toBe('tel:0001234567');expect(screen.queryByText(/Assegna tavolo/)).toBeNull()})
