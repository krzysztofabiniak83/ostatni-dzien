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
  const [showPassword, setShowPassword] = useState(false)

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
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'min. 6 znaków' : '••••••'}
                className="block w-full rounded-md border border-hairline bg-bg-card px-4 py-3 pr-12 text-[15px] text-ink-primary outline-none transition-colors focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-tertiary transition-colors hover:text-ink-secondary"
                tabIndex={-1}
              >
                {showPassword ? (
                  // Oko przekreślone — hasło widoczne, klik = ukryj.
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                    <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-.5 1.13-1.21 2.18-2.07 3.1" />
                    <path d="M6.61 6.61C4.62 7.94 3 9.85 2 12c1.73 3.89 6 7 11 7 1.86 0 3.62-.45 5.17-1.21" />
                  </svg>
                ) : (
                  // Oko otwarte — hasło ukryte, klik = pokaż.
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
