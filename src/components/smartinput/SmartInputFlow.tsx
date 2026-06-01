import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SourceSheet, type Source } from './SourceSheet'
import { ProcessingScreen } from './ProcessingScreen'
import { AddForm } from './AddForm'
import { SuccessScreen } from './SuccessScreen'
import { useSubscriptions, type NewSubscriptionInput } from '../../store/subscriptions'

type Step = 'sheet' | 'picker' | 'processing' | 'form' | 'success'

interface SmartInputFlowProps {
  onExit: () => void
  onToast: (msg: string) => void
}

const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Pełen flow Smart Input: bottom sheet → (fake OCR | ręcznie) → formularz → sukces.
 * Renderowany jako overlay nad dashboardem; po zakończeniu woła onExit.
 */
export function SmartInputFlow({ onExit, onToast }: SmartInputFlowProps) {
  const [step, setStep] = useState<Step>('sheet')
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [draft, setDraft] = useState<NewSubscriptionInput | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stepRef = useRef<Step>('sheet')
  const reduce = useReducedMotion()
  const addSubscription = useSubscriptions((s) => s.addSubscription)

  stepRef.current = step

  // Fake OCR: po 3s przechodzimy z processing do formularza z AI guesses.
  useEffect(() => {
    if (step !== 'processing') return
    const t = window.setTimeout(() => {
      setMode('ai')
      setStep('form')
    }, 3000)
    return () => window.clearTimeout(t)
  }, [step])

  const handlePick = (source: Source) => {
    if (source === 'screenshot') {
      setStep('picker')
      // Systemowy picker. Wykryj anulowanie przez powrót fokusu do okna.
      window.setTimeout(() => fileRef.current?.click(), 150)
      const onFocus = () => {
        window.setTimeout(() => {
          if (stepRef.current === 'picker') onExit()
        }, 500)
      }
      window.addEventListener('focus', onFocus, { once: true })
    } else if (source === 'email') {
      onToast('Prześlij e-mail na: import@ostatnidzien.app')
      onExit()
    } else {
      setMode('manual')
      setStep('form')
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Pokażemy realnie wrzucony obraz na ekranie skanowania.
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setStep('processing')
  }

  // Zwolnij object URL przy odmontowaniu.
  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  const handleSubmit = (d: NewSubscriptionInput) => {
    setDraft(d)
    setStep('success')
  }

  const commitAndExit = () => {
    if (draft) addSubscription(draft)
    onExit()
  }

  const commitAndAddAnother = () => {
    if (draft) addSubscription(draft)
    setDraft(null)
    setMode('ai')
    setStep('sheet')
  }

  const fullScreen = step === 'processing' || step === 'form' || step === 'success'

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <SourceSheet open={step === 'sheet'} onPick={handlePick} onCancel={onExit} />

      <AnimatePresence mode="wait">
        {fullScreen && (
          <motion.div
            key={step}
            className="absolute inset-0 z-[200]"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
          >
            {step === 'processing' && <ProcessingScreen imageUrl={imageUrl} />}
            {step === 'form' && (
              <AddForm mode={mode} onBack={onExit} onSubmit={handleSubmit} />
            )}
            {step === 'success' && draft && (
              <SuccessScreen draft={draft} onSeeList={commitAndExit} onAddAnother={commitAndAddAnother} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
