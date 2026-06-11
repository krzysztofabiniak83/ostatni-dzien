import { createContext, useContext, useState, type ReactNode } from 'react'

type TokenContextValue = {
  token: string | null
  setToken: (t: string | null) => void
}

const TokenContext = createContext<TokenContextValue | null>(null)

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  return (
    <TokenContext.Provider value={{ token, setToken }}>{children}</TokenContext.Provider>
  )
}

export function useTokenContext() {
  const ctx = useContext(TokenContext)
  if (!ctx) return { token: null, setToken: () => {} }
  return ctx
}
