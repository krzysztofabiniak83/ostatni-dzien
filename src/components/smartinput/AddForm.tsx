import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { StatusBar } from '../layout/StatusBar'
import type { NewSubscriptionInput } from '../../store/subscriptions'
import type { SubscriptionType } from '../../types/subscription'

interface AddFormProps {
  mode: 'ai' | 'manual'
  onBack: () => void
  onSubmit: (draft: NewSubscriptionInput) => void
}

// Celowo niedokładne AI guesses (do korekty przez usera).
const AI_GUESS = { name: 'Spotify', amount: '29,99 zł', date: '07/06/2026' }

function AiBadge() {
  return (
    <motion.span
      className="pointer-events-none absolute right-3 top-7 rounded-pill bg-accent-soft px-[7px] py-[3px] font-mono text-[9px] uppercase tracking-[0.1em] text-accent"
      initial={{ opacity: 0.9 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      AI
    </motion.span>
  )
}

export function AddForm({ mode, onBack, onSubmit }: AddFormProps) {
  const isAi = mode === 'ai'
  const [name, setName] = useState(isAi ? AI_GUESS.name : '')
  const [amount, setAmount] = useState(isAi ? AI_GUESS.amount : '')
  const [date, setDate] = useState(isAi ? AI_GUESS.date : '')
  const [type, setType] = useState<SubscriptionType>('renewal')
  // Które pola wciąż pokazują badge AI (znika po edycji).
  const [aiFields, setAiFields] = useState({
    name: isAi,
    amount: isAi,
    date: isAi,
  })

  const editField = (field: 'name' | 'amount' | 'date', value: string, setter: (v: string) => void) => {
    setter(value)
    if (aiFields[field]) setAiFields((s) => ({ ...s, [field]: false }))
  }

  const fieldClass = (showBadge: boolean) =>
    clsx(
      'w-full rounded-md border bg-bg-card px-4 py-[14px] text-[15px] text-ink-primary outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent',
      showBadge ? 'border-accent/30' : 'border-hairline',
    )

  return (
    <div className="relative flex h-full w-full flex-col bg-bg-base">
      <StatusBar />

      <div className="flex flex-shrink-0 items-center p-4">
        <button
          aria-label="Wstecz"
          onClick={onBack}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-hairline bg-bg-card text-ink-primary transition-all hover:border-ink-secondary active:scale-[0.94]"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-[120px] pt-2">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-[6px] font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            <span className="h-[6px] w-[6px] rounded-full bg-accent" />
            {isAi ? 'Sprawdź odczytane dane' : 'Dodaj ręcznie'}
          </div>
          <div className="mb-2 font-serif text-[30px] leading-[1.1] tracking-[-0.02em]">
            {isAi ? (
              <>
                Czy się <em className="italic text-accent">zgadza</em>?
              </>
            ) : (
              <>
                Nowa <em className="italic text-accent">subskrypcja</em>
              </>
            )}
          </div>
          <div className="text-[13px] leading-relaxed text-ink-secondary">
            {isAi
              ? 'Wypełniliśmy pola za Ciebie. Popraw to, co źle odczytaliśmy — Twoja edycja pomoże nam uczyć się lepiej.'
              : 'Wpisz dane subskrypcji, którą chcesz śledzić.'}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="relative flex flex-col gap-[6px]">
            <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
              Nazwa usługi
            </label>
            <input
              type="text"
              value={name}
              placeholder="np. Netflix Premium"
              onChange={(e) => editField('name', e.target.value, setName)}
              className={fieldClass(aiFields.name)}
            />
            <AnimatePresence>{aiFields.name && <AiBadge />}</AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative flex flex-col gap-[6px]">
              <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
                Kwota
              </label>
              <input
                type="text"
                value={amount}
                placeholder="np. 67,00 zł"
                onChange={(e) => editField('amount', e.target.value, setAmount)}
                className={fieldClass(aiFields.amount)}
              />
              <AnimatePresence>{aiFields.amount && <AiBadge />}</AnimatePresence>
            </div>
            <div className="relative flex flex-col gap-[6px]">
              <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
                Data pobrania
              </label>
              <input
                type="text"
                value={date}
                placeholder="DD/MM/RRRR"
                onChange={(e) => editField('date', e.target.value, setDate)}
                className={fieldClass(aiFields.date)}
              />
              <AnimatePresence>{aiFields.date && <AiBadge />}</AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
              Typ subskrypcji
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-md border border-hairline bg-bg-card p-1">
              {(['trial', 'renewal'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={clsx(
                    'rounded-[9px] px-3 py-[11px] text-[13px] font-medium transition-all',
                    type === t ? 'bg-accent text-bg-base' : 'text-ink-secondary',
                  )}
                >
                  {t === 'trial' ? 'Próbny okres' : 'Odnowienie'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSubmit({ name, amount, date, type })}
          className="w-full rounded-[14px] bg-accent px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          Zapisz subskrypcję
        </button>
      </div>
    </div>
  )
}
