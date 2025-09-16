import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'
import { z } from 'zod'
import { 
  sanitizeText, 
  emailSchema, 
  passwordSchema, 
  nameSchema, 
  badgeNumberSchema, 
  departmentSchema,
  checkRateLimit 
} from '../lib/validation'
import { handleAuthError } from '../lib/errorHandler'

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
      
      // Try to fetch actual profile from database
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organization:organizations(name, type)
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('AuthContext: Error fetching profile:', error);
        throw error;
      }

      if (profileData) {
        console.log('AuthContext: Profile data found:', profileData);
        
        // Get user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        console.log('AuthContext: Roles data:', rolesData);
        const role = rolesData?.[0]?.role || 'analyst';
        
        // Set permissions based on role
        const getPermissions = (userRole: string) => {
          switch (userRole) {
            case 'admin':
              return ['read', 'write', 'delete', 'admin', 'investigator', 'analyst', 'viewer'];
            case 'delegado':
              return ['read', 'write', 'delete', 'investigator', 'analyst', 'viewer'];
            case 'investigator':
              return ['read', 'write', 'investigator', 'analyst', 'viewer'];
            case 'analyst':
              return ['read', 'write', 'analyst', 'viewer'];
            default:
              return ['read', 'viewer'];
          }
        };

        const profile: UserProfile = {
          ...profileData,
          role: role as UserProfile['role'],
          permissions: getPermissions(role),
          organization: profileData.organization || undefined
        };

        console.log('AuthContext: Setting profile from database:', profile);
        setProfile(profile);
        
        // Log security event (don't await to avoid blocking)
        supabase.rpc('log_security_event', {
          p_event_type: 'profile_loaded',
          p_event_data: { role, status: profileData.status }
        });

      } else {
        // No profile exists - user needs approval
        console.log('AuthContext: No profile found, user needs registration approval');
        setProfile(null);
        toast.error('Seu cadastro está pendente de aprovação. Entre em contato com o administrador.');
      }
      
    } catch (error) {
      console.error('AuthContext: Error fetching profile:', error);
      setProfile(null);
      toast.error('Erro ao carregar perfil do usuário');
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
      
      // Rate limiting
      const rateLimitKey = `login_${email}_${Date.now() - Date.now() % 60000}`; // 1 minute window
      if (!checkRateLimit(rateLimitKey, 5, 60000)) {
        throw new Error('Muitas tentativas de login. Aguarde 1 minuto.');
      }
      
      // Tentar login real com Supabase
      console.log('🔐 Tentando login real com Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizeText(email),
        password
      });

      if (error) {
        console.error('❌ Erro no login Supabase:', error);
        const secureError = await handleAuthError(error, { 
          attemptType: 'login',
          email: email.substring(0, 3) + '***' // Masked email for logging
        });
        throw new Error(secureError.userMessage);
      }

      if (data.user) {
        console.log('✅ Login Supabase bem-sucedido:', data.user.email);
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id);
        
        // Log successful login
        await supabase.rpc('log_security_event', {
          p_event_type: 'login_success',
          p_event_data: { 
            user_id: data.user.id,
            email: email.substring(0, 3) + '***'
          }
        });
        
        toast.success('Login realizado com sucesso!');
        return;
      }
      
      throw new Error('Usuário não encontrado');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errorMessage);
      throw error;
    }
  }

  const signUp = async (email: string, password: string, profileData: Partial<UserProfile>) => {
    try {
      // Validate input data
      const validatedEmail = emailSchema.parse(email);
      const validatedPassword = passwordSchema.parse(password);
      const validatedName = nameSchema.parse(profileData.name || '');
      const validatedBadge = badgeNumberSchema.parse(profileData.badge_number || '');
      const validatedDepartment = departmentSchema.parse(profileData.department || '');

      const { data, error } = await supabase.auth.signUp({
        email: validatedEmail,
        password: validatedPassword,
        options: {
          data: {
            name: sanitizeText(validatedName),
            badge_number: sanitizeText(validatedBadge),
            department: sanitizeText(validatedDepartment)
          }
        }
      });

      if (error) {
        const secureError = await handleAuthError(error, { 
          attemptType: 'signup',
          email: email.substring(0, 3) + '***'
        });
        throw new Error(secureError.userMessage);
      }

      if (data.user) {
        // Don't automatically create profile - wait for admin approval
        console.log('User registered, awaiting approval');
        
        // Log registration attempt
        await supabase.rpc('log_security_event', {
          p_event_type: 'registration_attempt',
          p_event_data: { 
            user_id: data.user.id,
            email: email.substring(0, 3) + '***',
            department: sanitizeText(validatedDepartment)
          }
        });
        
        toast.success('Conta criada com sucesso! Aguarde aprovação do administrador.');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Sign up error:', error);
        toast.error(errorMessage);
      }
      throw error;
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
    let mounted = true;
    console.log('AuthContext: useEffect triggered');

    const initializeAuth = async () => {
      try {
        // Get initial session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        console.log('AuthContext: Initial session result:', session?.user?.email);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            try {
              console.log('AuthContext: Fetching profile for user:', session.user.id);
              await fetchProfile(session.user.id);
            } catch (profileError) {
              console.error('AuthContext: Error fetching profile:', profileError);
            }
          } else {
            setProfile(null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext: Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await fetchProfile(session.user.id);
          } catch (profileError) {
            console.error('AuthContext: Error fetching profile on auth change:', profileError);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        
        // Always set loading to false after processing
        setLoading(false);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      console.log('AuthContext: Cleaning up subscription');
      subscription.unsubscribe();
    };
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