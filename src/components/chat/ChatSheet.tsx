import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AskBar } from './AskBar'
import { ActionChips } from './ActionChips'
import { WelcomeIntro } from './WelcomeIntro'
import { JournalView } from './JournalView'
import { supabase } from '../../lib/supabase'
import { useSubscriptions } from '../../store/subscriptions'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Bottom sheet z czatem Subskrypcika.
 * - 85vh, slide-up od dołu (framer-motion).
 * - Historia bieżącej sesji (reset po zamknięciu).
 * - Streaming odpowiedzi z /api/chat.
 * - Markdown rendering.
 * - Skeleton loader gdy oczekujemy na pierwszy token.
 */
export function ChatSheet({
  open,
  onClose,
  value,
  onChange,
  initialPrompt,
}: {
  open: boolean
  onClose: () => void
  value: string
  onChange: (v: string) => void
  /** Prompt przekazany z chipa na zewnątrz — wyśle się automatycznie po otwarciu. */
  initialPrompt?: string
}) {
  const reduce = useReducedMotion()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [journalOpen, setJournalOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sentInitialRef = useRef(false)
  const sessionStartRef = useRef<Date | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  // Auto-scroll na dół przy nowych wiadomościach / chunkach.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  // Po zamknięciu: finalizacja sesji do dzienniczka (fire-and-forget) + reset.
  useEffect(() => {
    if (open) {
      sessionStartRef.current = new Date()
      return
    }
    // Sheet zamknięty — jeżeli były wiadomości, wyślij do /api/journal (gating min. 4 wiadomości po stronie API).
    const captured = messagesRef.current
    const startedAt = sessionStartRef.current
    if (captured.length > 0 && startedAt) {
      void finalizeConversation(captured, startedAt)
    }
    setMessages([])
    setError(null)
    setJournalOpen(false)
    sentInitialRef.current = false
    sessionStartRef.current = null
    abortRef.current?.abort()
  }, [open])

  async function send(prompt: string) {
    const trimmed = prompt.trim()
    if (!trimmed || streaming) return

    setError(null)
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    onChange('')
    setStreaming(true)

    // Placeholder AI bubble — będzie wypełniany przez stream.
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Brak sesji')

      const ctrl = new AbortController()
      abortRef.current = ctrl

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
        signal: ctrl.signal,
      })

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = {
            role: 'assistant',
            content: body.message || 'Wykorzystałeś dzienny limit pytań. Wrócę jutro.',
          }
          return copy
        })
        setStreaming(false)
        return
      }

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        acc += decoder.decode(chunk, { stream: true })
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError('Coś poszło nie tak. Spróbuj za chwilę.')
      setMessages((m) => m.slice(0, -1))
    } finally {
      setStreaming(false)
      abortRef.current = null
      // Po odpowiedzi agenta odśwież listę z bazy — czat mógł dodać/zmienić wiersz.
      // Diff ids → ustaw lastAddedId na świeżo dodaną subskrypcję (highlight + scroll-to-top).
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData.session?.user.id
        if (uid) {
          const before = new Set(useSubscriptions.getState().subscriptions.map((s) => s.id))
          await useSubscriptions.getState().loadFromRemote(uid)
          const added = useSubscriptions.getState().subscriptions.find((s) => !before.has(s.id))
          if (added) useSubscriptions.setState({ lastAddedId: added.id })
        }
      } catch {
        /* cicho — refresh to best-effort */
      }
    }
  }

  // Po otwarciu z chipa — wyślij prompt raz.
  useEffect(() => {
    if (open && initialPrompt && !sentInitialRef.current) {
      sentInitialRef.current = true
      send(initialPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            onClick={onClose}
            className="absolute inset-0 z-[60] bg-ink-primary/30"
          />

          {/* Sheet */}
          <motion.div
            key="chat-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              duration: reduce ? 0 : 0.24,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="absolute bottom-0 left-0 right-0 z-[61] flex h-[85%] flex-col rounded-t-[24px] bg-bg-base"
            style={{ boxShadow: '0 -20px 60px -20px rgba(13,31,26,0.25)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <button
                aria-label="Zamknij"
                onClick={onClose}
                className="h-[5px] w-[40px] rounded-full bg-hairline transition-colors hover:bg-ink-tertiary"
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                  AI Doradca
                </div>
                <div className="font-serif text-[22px] leading-tight text-ink-primary">
                  Subskrypcik
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Otwórz dzienniczek rozmów"
                  onClick={() => setJournalOpen(true)}
                  className="flex h-[34px] items-center gap-1.5 rounded-full border border-hairline px-2.5 text-ink-secondary transition-colors hover:border-ink-tertiary"
                >
                  <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
                    <path d="M3 9h18M8 3v3M16 3v3" />
                  </svg>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">
                    Dzienniczek
                  </span>
                </button>
                <button
                  aria-label="Zamknij"
                  onClick={onClose}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hairline text-ink-secondary transition-colors hover:border-ink-tertiary"
                >
                  <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages scroll */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-2">
              {messages.length === 0 && !streaming && <WelcomeIntro />}

              <div className="space-y-3 pb-4">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={i}
                    role={m.role}
                    content={m.content}
                    loading={streaming && i === messages.length - 1 && m.content === ''}
                  />
                ))}
                {error && (
                  <div className="rounded-md border border-alert-soft bg-alert-soft px-3 py-2 text-[13px] text-alert">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky composer */}
            <div
              className="border-t border-hairline bg-bg-base px-4 pb-[max(env(safe-area-inset-bottom,12px),12px)] pt-3"
            >
              {messages.length === 0 && !streaming && (
                <ActionChips onPick={(p) => send(p)} />
              )}
              <AskBar
                value={value}
                onChange={onChange}
                onSubmit={() => send(value)}
                autoFocus
                disabled={streaming}
              />
            </div>

            <JournalView
              open={journalOpen}
              onClose={() => setJournalOpen(false)}
              onCloseSheet={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Wysyła zamkniętą sesję do /api/journal w trybie finalize.
 * Backend sam decyduje czy zapisać (≥4 wiadomości) — błędy ignorujemy,
 * to operacja tła i nie powinna blokować zamknięcia czatu.
 */
async function finalizeConversation(messages: ChatMessage[], startedAt: Date) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return
    await fetch('/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'finalize',
        messages,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
      }),
      keepalive: true,
    })
  } catch {
    /* best-effort */
  }
}

function MessageBubble({
  role,
  content,
  loading,
}: {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5 text-[14px] leading-[1.45] text-ink-primary">
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-hairline bg-bg-card px-4 py-2.5 text-[14px] leading-[1.5] text-ink-primary">
        {loading ? (
          <SkeletonDots />
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node: _node, ...p }) => (
                  <a {...p} target="_blank" rel="noopener noreferrer" className="text-accent underline" />
                ),
                ul: ({ node: _node, ...p }) => <ul {...p} className="my-1 list-disc pl-5" />,
                ol: ({ node: _node, ...p }) => <ol {...p} className="my-1 list-decimal pl-5" />,
                strong: ({ node: _node, ...p }) => <strong {...p} className="font-semibold" />,
                p: ({ node: _node, ...p }) => <p {...p} className="my-1 first:mt-0 last:mb-0" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonDots() {
  return (
    <div className="flex gap-1 py-1" aria-label="Odpowiadam">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-tertiary" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-tertiary" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-tertiary" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
