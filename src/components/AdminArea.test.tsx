// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AdminArea from './AdminArea'

const mocks = vi.hoisted(() => ({ listener: null as null | ((state: 'loading' | 'login' | 'denied' | 'admin' | 'error') => void), stop: vi.fn(), login: vi.fn() }))
vi.mock('../lib/admin', () => ({
  watchAdminAccess: (callback: typeof mocks.listener) => { mocks.listener = callback; return mocks.stop },
  signOutAdmin: vi.fn(), signInAdmin: mocks.login,
}))
vi.mock('../lib/supabase', () => ({ bookingConfigured: true }))
vi.mock('../pages/Dashboard', () => ({ default: () => <p>Dati riservati dashboard</p> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('non monta la dashboard finché il backend non autorizza e la rimuove alla scadenza della sessione', () => {
  render(<MemoryRouter initialEntries={['/admin']}><AdminArea /></MemoryRouter>)
  expect(screen.queryByText('Dati riservati dashboard')).toBeNull()
  act(() => mocks.listener!('denied'))
  expect(screen.getByText('Accesso non autorizzato')).toBeTruthy()
  expect(screen.queryByText('Dati riservati dashboard')).toBeNull()
  act(() => mocks.listener!('admin'))
  expect(screen.getByText('Dati riservati dashboard')).toBeTruthy()
  act(() => mocks.listener!('loading'))
  expect(screen.queryByText('Dati riservati dashboard')).toBeNull()
  act(() => mocks.listener!('error'))
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Dati riservati dashboard')).toBeNull()
  cleanup()
  expect(mocks.stop).toHaveBeenCalled()
})

it('il login conserva l’email dopo un errore e non concede accesso da solo', async () => {
  mocks.login.mockRejectedValueOnce(new Error('Credenziali non valide'))
  render(<MemoryRouter initialEntries={['/admin/login']}><AdminArea /></MemoryRouter>)
  act(() => mocks.listener!('login'))
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.invalid' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password-di-prova' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Accedi' }).closest('form')!)
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('admin@example.invalid')
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('')
  expect(screen.queryByText('Dati riservati dashboard')).toBeNull()
})
