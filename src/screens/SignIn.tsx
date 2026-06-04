import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { signInWithPassword, signUpWithPassword } from '../lib/auth'

type Mode = 'signin' | 'signup'

/**
 * Ekran logowania email + hasło. Toggle „Zaloguj / Zarejestruj się" u dołu.
 * Bez własnego routera — App.tsx pokazuje SignIn zamiast Routes gdy
 * session === null. Konfirmacja maila powinna być wyłączona w Dashboardzie
 * (Authentication → Providers → Email → Confirm email = OFF), wtedy rejestracja
 * od razu loguje.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const e1 = email.trim()
    if (!e1 || password.length < 6) {
      setError('Podaj email i hasło (min. 6 znaków).')
      return
    }
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUpWithPassword(e1, password)
        if (needsConfirmation) {
          setInfo('Wysłaliśmy maila z linkiem potwierdzającym. Kliknij w niego, żeby się zalogować.')
        }
        // jeśli nie wymaga konfirmacji, AuthGate sam pokaże dashboard
      } else {
        await signInWithPassword(e1, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(isSignup ? 'signin' : 'signup')
    setError(null)
    setInfo(null)
  }

  return (
    <div className="flex h-full w-full flex-col bg-bg-base px-6 pt-16 pb-8">
      <div className="flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          Ostatni Dzień
        </p>
        <h1 className="mt-3 font-serif text-[30px] font-normal leading-[1.1] text-ink-primary">
          {isSignup
            ? 'Załóż konto, żeby Twoje subskrypcje były bezpieczne.'
            : 'Zaloguj się, żeby Twoje subskrypcje były bezpieczne.'}
        </h1>
        <p className="mt-4 text-[15px] leading-[1.5] text-ink-secondary">
          {isSignup
            ? 'Email i hasło wystarczą. Wracasz tu na każdym urządzeniu, na które się zalogujesz.'
            : 'Wpisz email i hasło, których użyłeś przy zakładaniu konta.'}
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ty@example.com"
              className="mt-2 block w-full rounded-md border border-hairline bg-bg-card px-4 py-3 text-[15px] text-ink-primary outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Hasło
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'min. 6 znaków' : '••••••'}
              className="mt-2 block w-full rounded-md border border-hairline bg-bg-card px-4 py-3 text-[15px] text-ink-primary outline-none transition-colors focus:border-accent"
            />
          </label>
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? '…' : isSignup ? 'Załóż konto' : 'Zaloguj się'}
          </Button>
          {error && <p className="text-[13px] text-alert">{error}</p>}
          {info && <p className="text-[13px] text-ink-secondary">{info}</p>}
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-6 text-[13px] font-medium text-accent hover:underline"
        >
          {isSignup ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Załóż je teraz'}
        </button>
      </div>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
        Twoje dane szyfrowane w Supabase
      </p>
    </div>
  )
}
