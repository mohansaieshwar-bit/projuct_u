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
      
      return error?.code !== 'PGRST116' ? data : null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        
        if (isMountedRef.current) {
          setUser(currentUser)
          if (currentUser) {
            const userProfile = await fetchProfile(currentUser.id)
            setProfile(userProfile)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      
      if (isMountedRef.current) {
        setUser(currentUser)
        setProfile(null)
        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id)
          setProfile(userProfile)
        }
      }
    })

    return () => {
      isMountedRef.current = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

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
        options: { data: { full_name: fullName, role } }
      })
      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      posthog.reset()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    refetchProfile: fetchProfile
  }), [user, profile, isLoading, signIn, signUp, signOut, fetchProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

