import { useEffect, useRef } from 'react'

/**
 * AskBar — blur pill nad dolną krawędzią ekranu, 75% szerokości.
 * - Sparkle icon po lewej (AI accent)
 * - Dynamic textarea: 1 wiersz → max 4 wiersze, potem scroll
 * - Send button (strzałka w górę) pojawia się gdy `value.length > 0`
 *
 * Komponent kontrolowany — value/onChange w rodzicu, żeby ChatSheet
 * mógł go też używać synchronicznie.
 */
export function AskBar({
  value,
  onChange,
  onSubmit,
  onFocus,
  autoFocus,
  placeholder = 'Zapytaj Subskrypcika...',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onFocus?: () => void
  autoFocus?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize: 1 → max 4 wiersze (~96px), potem scroll.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }, [value])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const canSend = value.trim().length > 0 && !disabled

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <div
      className="relative flex w-full items-end gap-2 rounded-[28px] border border-hairline pl-[14px] pr-[6px] py-[6px]"
      style={{
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 6px 24px -8px rgba(13,31,26,0.12), 0 2px 6px rgba(13,31,26,0.04)',
      }}
    >
      {/* Sparkle icon */}
      <svg
        viewBox="0 0 24 24"
        className="mb-[10px] h-[18px] w-[18px] shrink-0 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      </svg>

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[24px] max-h-[96px] flex-1 resize-none border-0 bg-transparent py-[8px] text-[14px] leading-[20px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus-visible:outline-none disabled:opacity-50"
        style={{ overflowY: 'auto' }}
      />

      <button
        type="button"
        aria-label="Wyślij"
        onClick={() => canSend && onSubmit()}
        disabled={!canSend}
        className="mb-[2px] flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-accent text-bg-base transition-all duration-150 hover:bg-accent-hover active:scale-[0.94] disabled:bg-ink-tertiary disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}
