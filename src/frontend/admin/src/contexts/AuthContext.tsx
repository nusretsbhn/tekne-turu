import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const TOKEN_KEY = 'tekne_token'
const USER_KEY = 'tekne_user'

type UserInfo = { fullName: string; role: string }

type AuthContextType = {
  token: string | null
  user: UserInfo | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: string }>
  logout: () => void
  isReady: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const s = localStorage.getItem(USER_KEY)
      return s ? (JSON.parse(s) as UserInfo) : null
    } catch {
      return null
    }
  })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const text = await res.text()
      const data = text ? (JSON.parse(text) as { accessToken?: string; role?: string; fullName?: string; error?: string }) : {}
      if (!res.ok) {
        return { ok: false, error: data?.error ?? 'Giriş başarısız.' }
      }
      const accessToken = data.accessToken ?? ''
      const role = data.role ?? ''
      const userInfo: UserInfo = { fullName: data.fullName ?? '', role }
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      setToken(accessToken)
      setUser(userInfo)
      return { ok: true, role }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bağlantı hatası.'
      return { ok: false, error: `Bağlantı hatası: ${msg}` }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
