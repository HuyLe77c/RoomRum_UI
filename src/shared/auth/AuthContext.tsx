import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getSession, setSession } from '../api/client'
import type { Session } from '../types'

type AuthValue = { session: Session | null; save: (value: Session | null) => void }
const AuthContext = createContext<AuthValue>({ session: null, save: () => undefined })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, update] = useState<Session | null>(getSession)
  useEffect(() => { const sync = () => update(getSession()); window.addEventListener('roomrum-session', sync); return () => window.removeEventListener('roomrum-session', sync) }, [])
  const save = (value: Session | null) => { setSession(value); update(value) }
  return <AuthContext.Provider value={{ session, save }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
