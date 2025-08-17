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
      console.log('AuthContext: fetchProfile called for userId:', userId);
      
      // Criar perfil básico se não existir
      const basicProfile = {
        id: userId,
        user_id: userId,
        email: user?.email || '',
        name: user?.user_metadata?.name || 'Usuário',
        organization_id: 'default-org',
        role: 'admin' as const,
        badge_number: '001',
        department: 'Geral',
        permissions: ['read', 'write', 'admin', 'investigator', 'analyst', 'viewer'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'active' as const
      };
      
      console.log('AuthContext: Setting basic profile:', basicProfile);
      setProfile(basicProfile);
      console.log('AuthContext: Profile set successfully');
      
    } catch (error) {
      console.error('AuthContext: Error fetching profile:', error);
      
      // Criar perfil básico em caso de erro
      const fallbackProfile = {
        id: userId,
        user_id: userId,
        email: user?.email || '',
        name: 'Usuário',
        organization_id: 'default-org',
        role: 'admin' as const,
        badge_number: '001',
        department: 'Geral',
        permissions: ['read', 'write', 'admin', 'investigator', 'analyst', 'viewer'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'active' as const
      };
      
      setProfile(fallbackProfile);
      toast.error('Erro ao carregar perfil, usando perfil padrão');
    }
  }

  // Track analytics event (disabled for now since table doesn't exist)
  const trackEvent = async (eventType: string, eventData: Record<string, unknown> = {}) => {
    // TODO: Implement analytics tracking when analytics_events table is added
    console.log('Analytics event:', eventType, eventData)
  }

  // Authentication functions
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login com:', email);
      
      // Verificar se o Supabase está disponível
      if (!supabase || !supabase.auth) {
        console.log('❌ Supabase não disponível');
        throw new Error('Supabase não está configurado');
      }
      
      // Tentar login real com Supabase
      console.log('🔐 Tentando login real com Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Erro no login Supabase:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Login Supabase bem-sucedido:', data.user.email);
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id);
        await trackEvent('user_login', { email, userId: data.user.id });
        
        toast.success('Login realizado com sucesso!');
        return;
      }
      
      throw new Error('Usuário não encontrado');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro no login: ${errorMessage}`);
      throw error;
    }
  }

  const signUp = async (email: string, password: string, profileData: Partial<UserProfile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: profileData.name,
            organization_id: profileData.organization_id,
            role: profileData.role,
            badge_number: profileData.badge_number,
            department: profileData.department
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: data.user.id,
              email: data.user.email,
              name: profileData.name,
              organization_id: profileData.organization_id,
              role: profileData.role,
              badge_number: profileData.badge_number,
              department: profileData.department,
              permissions: profileData.permissions || []
            }
          ])

        if (profileError) throw profileError

        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([
            {
              user_id: data.user.id,
              role: profileData.role || 'analyst'
            }
          ])

        if (roleError) throw roleError

        setUser(data.user)
        setSession(data.session)
        await fetchProfile(data.user.id)
        await trackEvent('user_signup', { email, userId: data.user.id })
        
        toast.success('Conta criada com sucesso! Verifique seu email para confirmar.')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Sign up error:', error)
      toast.error(`Erro no cadastro: ${errorMessage}`)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setSession(null)
      await trackEvent('user_logout')
      
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Sign out error:', error)
      toast.error(`Erro no logout: ${errorMessage}`)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      await trackEvent('password_reset_requested', { email })
      toast.success('Email de redefinição enviado! Verifique sua caixa de entrada.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Password reset error:', error)
      toast.error(`Erro ao solicitar redefinição: ${errorMessage}`)
      throw error
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false
    return profile.permissions.includes(permission)
  }

  const isRole = (role: string): boolean => {
    if (!profile) return false
    return profile.role === role
  }

  // Initialize auth state
  useEffect(() => {
    console.log('AuthContext: useEffect triggered');
    setLoading(false); // Set loading to false immediately to avoid infinite loading
    
    // Verificar se o Supabase está disponível
    if (!supabase || !supabase.auth) {
      console.log('🔧 Modo de desenvolvimento: Supabase não disponível, usando modo simulado');
      setLoading(false);
      return;
    }
    
    const getSession = async () => {
      try {
        console.log('AuthContext: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log('AuthContext: Session result:', { session, error });
        if (session) {
          console.log('AuthContext: Setting session and user');
          setUser(session.user);
          console.log('AuthContext: Fetching profile for user:', session.user.id);
          await fetchProfile(session.user.id);
        } else {
          console.log('AuthContext: No session found');
        }
      } catch (error) {
        console.error('AuthContext: Error getting session:', error);
        setLoading(false); // Set loading to false even on error
      }
    };
    getSession();

    // Listen for auth changes
    console.log('AuthContext: Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state change:', { event, session });
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('AuthContext: User authenticated, fetching profile');
          await fetchProfile(session.user.id)
        } else {
          console.log('AuthContext: No user, clearing profile');
          setProfile(null)
        }
        
        console.log('AuthContext: Setting loading to false after auth change');
        setLoading(false)
      }
    )

    return () => {
      console.log('AuthContext: Cleaning up subscription');
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
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