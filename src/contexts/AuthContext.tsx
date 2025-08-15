import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  user_id: string
  organization_id: string
  role: 'admin' | 'investigator' | 'analyst' | 'viewer'
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organizations:organization_id (
            name,
            type
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      
      setProfile({
        ...data,
        organization: data.organizations
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Erro ao carregar perfil do usuário')
    }
  }

  // Track analytics event
  const trackEvent = async (eventType: string, eventData: any = {}) => {
    if (!user || !profile) return

    try {
      await supabase.from('analytics_events').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        event_type: eventType,
        event_data: eventData,
        ip_address: null, // Will be handled by RLS/Edge Function
        user_agent: navigator.userAgent
      })
    } catch (error) {
      console.error('Error tracking event:', error)
    }
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
        password
      })

      if (error) throw error

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            organization_id: profileData.organization_id!,
            role: profileData.role || 'viewer',
            badge_number: profileData.badge_number!,
            department: profileData.department!,
            permissions: profileData.permissions || []
          })

        if (profileError) throw profileError

        await trackEvent('user_registration', { email })
        toast.success('Conta criada com sucesso! Verifique seu email.')
      }
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
    if (profile.role === 'admin') return true
    return profile.permissions.includes(permission)
  }

  const isRole = (role: string): boolean => {
    return profile?.role === role
  }

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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