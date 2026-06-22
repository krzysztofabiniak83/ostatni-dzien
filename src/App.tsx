import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PhoneFrame } from './components/layout/PhoneFrame'
import { Dashboard } from './screens/Dashboard'
import { Action } from './screens/Action'
import { Onboarding } from './screens/Onboarding'
import { Docs } from './screens/Docs'
import { SignIn } from './screens/SignIn'
import { Store } from './screens/Store'
import { useOnboarding } from './store/onboarding'
import { useAuth } from './lib/auth'
import { AuthGate } from './components/AuthGate'

// Przejście fade+scale — cubic-bezier z CLAUDE.md (decyzje produktowe).
const EASE = [0.32, 0.72, 0, 1] as const

function AnimatedRoutes() {
  const location = useLocation()
  const reduce = useReducedMotion()
  const onboardingDone = useOnboarding((s) => s.done)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="flex h-full w-full flex-col"
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
        transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
      >
        <Routes location={location}>
          <Route
            path="/"
            element={onboardingDone ? <Dashboard /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/onboarding"
            element={onboardingDone ? <Navigate to="/" replace /> : <Onboarding />}
          />
          <Route path="/sub/:id" element={<Action />} />
          <Route path="/store" element={<Store />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-base">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
        Ładuję…
      </p>
    </div>
  )
}

function AppBody() {
  const { session, user } = useAuth()

  if (session === undefined) return <LoadingScreen />
  if (!session || !user) return <SignIn />

  return (
    <BrowserRouter>
      <AuthGate userId={user.id} fallback={<LoadingScreen />}>
        <AnimatedRoutes />
      </AuthGate>
    </BrowserRouter>
  )
}

function App() {
  // /docs renderujemy bez PhoneFrame i bez auth (publiczna dokumentacja).
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/docs')) {
    return <Docs />
  }
  return (
    <PhoneFrame
      label="Ostatni Dzień · MVP"
      caption={
        <>
          Prototyp przeglądarkowy. Wrzuć screenshot albo dodaj subskrypcję ręcznie — przypomnimy Ci o pobraniu
          zanim się zorientujesz.
        </>
      }
    >
      <AppBody />
    </PhoneFrame>
  )
}

export default App
