import { PhoneFrame } from './components/layout/PhoneFrame'
import { Dashboard } from './screens/Dashboard'

function App() {
  return (
    <PhoneFrame
      label="Faza 1 · Dashboard MVP"
      caption={
        <>
          Kliknij kartę — w <strong className="font-medium text-ink-primary">Fazie 2</strong> podepniemy ekran akcji.
          <br />
          Kliknij <strong className="font-medium text-ink-primary">+</strong> — w{' '}
          <strong className="font-medium text-ink-primary">Fazie 3</strong> podepniemy Smart Input.
        </>
      }
    >
      <Dashboard />
    </PhoneFrame>
  )
}

export default App
