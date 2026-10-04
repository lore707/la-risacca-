import { supabase } from './supabase'

export const passwordPath = '/admin/password'

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Collegamento Supabase non configurato.')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: new URL(passwordPath, window.location.origin).href,
  })
  if (error) throw new Error('Invio non riuscito. Attendi qualche minuto e riprova.')
}

// Installed before rendering so SDK URL processing cannot outrun the router.
export function routePasswordRecovery() {
  if (!supabase) return () => {}
  function route() {
    if (window.location.pathname !== passwordPath) {
      window.history.replaceState(null, '', passwordPath + window.location.search + window.location.hash)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  if (fragment.get('type') === 'recovery' || fragment.has('error')) route()
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') route()
  })
  return () => data.subscription.unsubscribe()
}

export function watchPasswordSession(onChange: (state: 'ready' | 'invalid') => void) {
  if (!supabase) { onChange('invalid'); return () => {} }
  let active = true
  let version = 0
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  if (fragment.has('error')) {
    window.history.replaceState(null, '', passwordPath)
    onChange('invalid')
    return () => {}
  }
  // The SDK processes and removes recovery tokens; no tokens are logged or copied.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    version++
    if (active) onChange(session ? 'ready' : 'invalid')
  })
  void supabase.auth.getSession().then(({ data, error }) => {
    if (active && version === 0) onChange(!error && data.session ? 'ready' : 'invalid')
  }).catch(() => { if (active && version === 0) onChange('invalid') })
  return () => { active = false; data.subscription.unsubscribe() }
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Collegamento Supabase non configurato.')
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error || !data.user) throw new Error('Password non aggiornata. Il link potrebbe essere scaduto, oppure la password non soddisfa i requisiti. Richiedi un nuovo link o prova una password più lunga e diversa.')
}
