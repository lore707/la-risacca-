// @vitest-environment happy-dom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import Reservations from './Reservations'
import {restaurantToday} from '../lib/bookingValidation'
const search=vi.hoisted(()=>vi.fn())
vi.mock('../lib/admin',()=>({searchReservations:search,decideReservation:vi.fn()}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('inoltra ricerca, periodo e stato al server e riparte dalla prima pagina',async()=>{
 search.mockResolvedValue({total:51,rows:[]});render(<MemoryRouter><Reservations/></MemoryRouter>);await screen.findByText('51 prenotazioni trovate');fireEvent.click(screen.getByRole('button',{name:'Successive'}));await waitFor(()=>expect(search).toHaveBeenLastCalledWith(expect.objectContaining({page:1})));await screen.findByText('Pagina 2 di 2');fireEvent.change(screen.getByLabelText('Periodo'),{target:{value:'all'}});fireEvent.change(screen.getByLabelText('Stato'),{target:{value:'pending'}});fireEvent.change(screen.getByLabelText('Nome o telefono'),{target:{value:'Marco'}});await waitFor(()=>expect(search).toHaveBeenLastCalledWith({status:'pending',from:'',to:'',search:'Marco',page:0}))
})
it('Vedi tutte conserva il giorno e lo stato delle confermate',async()=>{search.mockResolvedValue({total:0,rows:[]});render(<MemoryRouter initialEntries={['/admin/prenotazioni?date=2099-10-12&status=confirmed']}><Reservations/></MemoryRouter>);await screen.findByText('Nessuna prenotazione corrisponde ai filtri.');expect(search).toHaveBeenCalledWith(expect.objectContaining({from:'2099-10-12',to:'2099-10-12',status:'confirmed'}))})
it('non presenta risultati vuoti quando il backend fallisce e consente il recupero',async()=>{search.mockRejectedValueOnce(new Error('offline'));render(<MemoryRouter><Reservations/></MemoryRouter>);expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('0 prenotazioni trovate')).toBeNull();search.mockResolvedValue({total:0,rows:[]});fireEvent.click(screen.getByRole('button',{name:'Riprova'}));await screen.findByText('0 prenotazioni trovate');expect(search).toHaveBeenLastCalledWith(expect.objectContaining({from:restaurantToday(),to:restaurantToday()}))})
