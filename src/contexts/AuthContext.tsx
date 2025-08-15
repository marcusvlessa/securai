import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  user_id: string
  email: string
  name?: string
  organization_id: string
  role: 'admin' | 'investigator' | 'analyst' | 'delegado'
  badge_number: string
  department: string
  permissions: string[]
  organization?: {
    name: string
    type: string
  }
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, profileData: Partial<UserProfile>) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  hasPermission: (permission: string) => boolean
  isRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      // First get the profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organizations (
            name,
            type
          )
        `)
        .eq('user_id', userId)
        .single()

      if (profileError) throw profileError

      // Then get the user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (rolesError) throw rolesError

      // Get the primary role (assuming one primary role per user)
      const primaryRole = rolesData?.[0]?.role || 'analyst'
      
      setProfile({
        ...profileData,
        role: primaryRole,
        permissions: [], // Add permissions logic as needed
        organization: profileData.organizations
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Erro ao carregar perfil do usuário')
    }
  }

  // Track analytics event (disabled for now since table doesn't exist)
  const trackEvent = async (eventType: string, eventData: any = {}) => {
    // TODO: Implement analytics tracking when analytics_events table is added
    console.log('Analytics event:', eventType, eventData)
  }

  // Authentication functions
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        await fetchProfile(data.user.id)
        await trackEvent('user_login', { email })
        toast.success('Login realizado com sucesso!')
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Erro ao fazer login')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, profileData: Partial<UserProfile>) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: profileData.name || '',
            badge_number: profileData.badge_number || '',
            department: profileData.department || '',
            organization_id: profileData.organization_id || ''
          }
        }
      })

      if (error) throw error

      toast.success('Conta criada com sucesso! Verifique seu email.')
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Erro ao criar conta')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await trackEvent('user_logout')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      setSession(null)
      toast.success('Logout realizado com sucesso!')
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast.error(error.message || 'Erro ao fazer logout')
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      
      toast.success('Email de recuperação enviado!')
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Erro ao enviar email de recuperação')
      throw error
    }
  }

  // Permission helpers
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false
    if (profile.role === 'admin' || profile.role === 'delegado') return true
    return profile.permissions.includes(permission)
  }

  const isRole = (role: string): boolean => {
    return profile?.role === role
  }

  // Handle auth state changes
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      } catch (e) {
        console.error('Error getting session:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Update last login
  useEffect(() => {
    if (user && profile) {
      supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error updating last login:', error)
        })
    }
  }, [user, profile])

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    hasPermission,
    isRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}