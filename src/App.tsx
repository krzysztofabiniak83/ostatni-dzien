import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PhoneFrame } from './components/layout/PhoneFrame'
import { Dashboard } from './screens/Dashboard'
import { Action } from './screens/Action'
import { Onboarding } from './screens/Onboarding'
import { useOnboarding } from './store/onboarding'

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
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <PhoneFrame
        label="Ostatni Dzień · MVP"
        caption={
          <>
            Prototyp przeglądarkowy. Wrzuć screenshot albo dodaj subskrypcję ręcznie — przypomnimy Ci o pobraniu
            zanim się zorientujesz.
          </>
        }
      >
        <AnimatedRoutes />
      </PhoneFrame>
    </BrowserRouter>
  )
}

export default App
