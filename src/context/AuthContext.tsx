import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface StoredUser {
  id: string
  name: string
  email: string
  employeeId: string
  department: string
  password: string
  createdAt: string
}

export interface SessionUser {
  id: string
  name: string
  email: string
  employeeId: string
  department: string
}

interface RegisterPayload {
  name: string
  email?: string
  employeeId: string
  department?: string
  password: string
}

interface AuthContextType {
  user: SessionUser | null
  isAuthenticated: boolean
  signIn: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signUp: (payload: RegisterPayload) => Promise<{ ok: boolean; error?: string }>
  signOut: () => void
}

const USERS_KEY = 'smd:auth:users'
const SESSION_KEY = 'smd:auth:session'

const AuthContext = createContext<AuthContextType | null>(null)

const parseLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveLocal = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const toSessionUser = (user: StoredUser): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  employeeId: user.employeeId,
  department: user.department,
})

// Seed with demo account for testing
const DEMO_USERS: StoredUser[] = [
  {
    id: crypto.randomUUID(),
    name: 'Aman Yadav',
    email: 'aman.yadav@tatapower.com',
    employeeId: 'TM123456',
    department: 'Engineering',
    password: 'TataPower1',
    createdAt: new Date().toISOString(),
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(() => {
    const stored = parseLocal<StoredUser[]>(USERS_KEY, [])
    // If no users exist, seed with demo account
    return stored.length === 0 ? DEMO_USERS : stored
  })
  const [user, setUser] = useState<SessionUser | null>(() => parseLocal<SessionUser | null>(SESSION_KEY, null))

  useEffect(() => {
    saveLocal(USERS_KEY, users)
  }, [users])

  useEffect(() => {
    if (user) {
      saveLocal(SESSION_KEY, user)
      return
    }
    localStorage.removeItem(SESSION_KEY)
  }, [user])

  const signIn: AuthContextType['signIn'] = async (identifier, password) => {
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const normalizedEmployeeId = identifier.trim().toUpperCase()
    const match = users.find(
      u => u.email.toLowerCase() === normalizedIdentifier || u.employeeId.toUpperCase() === normalizedEmployeeId,
    )

    if (!match || match.password !== password) {
      return { ok: false, error: 'Invalid email/employee ID or password' }
    }

    setUser(toSessionUser(match))
    return { ok: true }
  }

  const signUp: AuthContextType['signUp'] = async (payload) => {
    const normalizedName = payload.name.trim()
    const normalizedEmployeeId = payload.employeeId.trim().toUpperCase()
    const normalizedDepartment = payload.department?.trim() || 'General'
    const normalizedPassword = payload.password.trim()
    const normalizedEmailInput = payload.email?.trim().toLowerCase() || ''
    const normalizedEmail = normalizedEmailInput || `${normalizedEmployeeId.toLowerCase()}@local.tatapower`

    if (!normalizedName || !normalizedEmployeeId || !normalizedPassword) {
      return { ok: false, error: 'Please fill all required fields' }
    }

    if (normalizedEmailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmailInput)) {
      return { ok: false, error: 'Please enter a valid email address' }
    }

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: 'An account with this email already exists' }
    }

    if (users.some(u => u.employeeId.toUpperCase() === normalizedEmployeeId)) {
      return { ok: false, error: 'Employee ID already registered' }
    }

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      employeeId: normalizedEmployeeId,
      department: normalizedDepartment,
      password: normalizedPassword,
      createdAt: new Date().toISOString(),
    }

    setUsers(prev => [...prev, newUser])
    setUser(toSessionUser(newUser))
    return { ok: true }
  }

  const signOut = () => {
    setUser(null)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      signOut,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
