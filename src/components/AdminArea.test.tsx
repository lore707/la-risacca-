// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AdminArea from './AdminArea'
vi.mock('../lib/supabase', () => ({ bookingConfigured: true }))
vi.mock('../pages/Dashboard', () => ({ default: () => <p>Dashboard senza login</p> }))
vi.mock('../pages/Reservations', () => ({ default: () => <p>Archivio senza login</p> }))
afterEach(cleanup)
it('apre la dashboard senza sessione e senza controlli di login o logout', () => {
  render(<MemoryRouter initialEntries={['/admin']}><AdminArea /></MemoryRouter>)
  expect(screen.getByText('Dashboard senza login')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Accedi' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Esci' })).toBeNull()
  expect(screen.getByRole('link', { name: /Vai al booking/ })).toBeTruthy()
})
it('apre anche archivio e configurazione senza sessione', () => {
  render(<MemoryRouter initialEntries={['/admin/prenotazioni']}><AdminArea /></MemoryRouter>)
  expect(screen.getByText('Archivio senza login')).toBeTruthy()
  cleanup()
  render(<MemoryRouter initialEntries={['/admin/configurazione']}><AdminArea /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Configurazione' })).toBeTruthy()
})
