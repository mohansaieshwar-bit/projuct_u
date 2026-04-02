import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import posthog from './posthog'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMountedRef = useRef(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('fetchProfile error:', error)
      return null
    }
  }, [])

  const loadUserAndProfile = useCallback(async (currentUser) => {
    if (!isMountedRef.current) return

    setUser(currentUser)

    if (!currentUser) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      const userProfile = await fetchProfile(currentUser.id)
      if (isMountedRef.current) {
        setProfile(userProfile)
      }
    } catch (error) {
      console.error('loadUserAndProfile error:', error)
      if (isMountedRef.current) {
        setProfile(null)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [fetchProfile])

  const refetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return null
    }

    const userProfile = await fetchProfile(user.id)
    if (isMountedRef.current) {
      setProfile(userProfile)
    }
    return userProfile
  }, [user, fetchProfile])

  useEffect(() => {
    isMountedRef.current = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const currentUser = session?.user ?? null
        await loadUserAndProfile(currentUser)
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMountedRef.current) {
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'null')

      const currentUser = session?.user ?? null

      if (!isMountedRef.current) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      Promise.resolve(loadUserAndProfile(currentUser)).catch((error) => {
        console.error('Auth state change handling error:', error)
        if (isMountedRef.current) {
          setUser(currentUser)
          setProfile(null)
          setIsLoading(false)
        }
      })
    })

    return () => {
      isMountedRef.current = false
      subscription?.unsubscribe()
    }
  }, [loadUserAndProfile])

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }, [])

  const signUp = useCallback(async ({ fullName, email, password, role }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      console.log('signOut called')
      posthog.reset()

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      console.log('Supabase signOut success')
    } catch (error) {
      console.error('signOut error:', error)
      return { error }
    } finally {
      if (isMountedRef.current) {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
      }
    }

    return { error: null }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      refetchProfile,
    }),
    [user, profile, isLoading, signIn, signUp, signOut, refetchProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}