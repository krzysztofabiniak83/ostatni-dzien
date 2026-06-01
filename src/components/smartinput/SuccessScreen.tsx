import { StatusBar } from '../layout/StatusBar'
import type { NewSubscriptionInput } from '../../store/subscriptions'

interface SuccessScreenProps {
  draft: NewSubscriptionInput
  onSeeList: () => void
  onAddAnother: () => void
}

/** Fullscreen sukces: pop koła + rysowanie checka + ring + fade-up tekstu. */
export function SuccessScreen({ draft, onSeeList, onAddAnother }: SuccessScreenProps) {
  const summary = `${draft.name || 'Subskrypcja'} · ${draft.amount || '—'} · ${draft.date || '—'}. Przypomnimy Ci dzień przed pobraniem.`

  return (
    <div className="relative flex h-full w-full flex-col bg-bg-base">
      <StatusBar />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-20 text-center">
        <div className="relative flex h-[120px] w-[120px] items-center justify-center">
          <div className="success-circle absolute inset-0 scale-0 rounded-full bg-accent" />
          <div className="success-ring absolute inset-[-8px] rounded-full border-2 border-accent opacity-0" />
          <svg
            className="success-check relative z-[2] h-[50px] w-[50px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F5F3EE"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>

        <div>
          <div className="success-fade font-serif text-[32px] leading-[1.1] tracking-[-0.02em] [animation-delay:0.4s]">
            Dodano do <em className="italic text-accent">listy</em>
          </div>
          <div className="success-fade mx-auto mt-2 max-w-[280px] text-[14px] text-ink-secondary [animation-delay:0.5s]">
            {summary}
          </div>
        </div>

        <div className="success-fade mt-2 flex w-full max-w-[280px] flex-col gap-2 [animation-delay:0.6s]">
          <button
            onClick={onSeeList}
            className="rounded-[14px] bg-accent px-5 py-4 text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            Zobacz na liście
          </button>
          <button
            onClick={onAddAnother}
            className="p-3 text-[14px] text-ink-secondary transition-colors hover:text-ink-primary"
          >
            Dodaj kolejną
          </button>
        </div>
      </div>
    </div>
  )
}
