// Secure error handling utilities

import { supabase } from '@/integrations/supabase/client'
import { maskSensitiveData } from './validation'

export interface SecureError {
  id: string
  message: string
  userMessage: string
  timestamp: number
}

// Generic user-friendly error messages
const USER_ERROR_MESSAGES = {
  authentication: 'Erro de autenticação. Verifique suas credenciais.',
  authorization: 'Você não tem permissão para executar esta ação.',
  validation: 'Os dados fornecidos são inválidos.',
  network: 'Erro de conexão. Tente novamente.',
  server: 'Erro interno do servidor. Tente novamente mais tarde.',
  rateLimit: 'Muitas tentativas. Aguarde alguns minutos.',
  notFound: 'Recurso não encontrado.',
  conflict: 'Conflito de dados. Verifique se as informações estão corretas.',
  default: 'Ocorreu um erro inesperado. Tente novamente.'
}

// Error classification
const classifyError = (error: any): keyof typeof USER_ERROR_MESSAGES => {
  if (!error) return 'default'
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code || ''
  
  // Authentication errors
  if (message.includes('auth') || message.includes('login') || message.includes('password') || code === 'PGRST301') {
    return 'authentication'
  }
  
  // Authorization errors
  if (message.includes('permission') || message.includes('unauthorized') || code === 'PGRST403') {
    return 'authorization'
  }
  
  // Validation errors
  if (message.includes('invalid') || message.includes('validation') || code === 'PGRST400') {
    return 'validation'
  }
  
  // Network errors
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return 'network'
  }
  
  // Rate limiting
  if (message.includes('rate') || message.includes('limit') || code === '429') {
    return 'rateLimit'
  }
  
  // Not found
  if (message.includes('not found') || code === 'PGRST116') {
    return 'notFound'
  }
  
  // Conflict
  if (message.includes('conflict') || message.includes('duplicate') || code === 'PGRST409') {
    return 'conflict'
  }
  
  // Server errors
  if (code?.startsWith('5') || message.includes('server error')) {
    return 'server'
  }
  
  return 'default'
}

// Log error securely (no sensitive data in logs)
const logError = async (error: any, context: Record<string, any> = {}) => {
  try {
    const errorId = crypto.randomUUID()
    
    // Mask sensitive data before logging
    const maskedContext = maskSensitiveData(context)
    const maskedError = {
      message: error.message || 'Unknown error',
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
    }
    
    console.error(`Error ID: ${errorId}`, {
      error: maskedError,
      context: maskedContext,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
    
    // Log to security events if user is authenticated
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: 'error_occurred',
        p_event_data: {
          error_id: errorId,
          error_type: classifyError(error),
          context: maskedContext
        }
      })
    } catch (logError) {
      console.warn('Failed to log security event:', logError)
    }
    
    return errorId
  } catch (logError) {
    console.error('Failed to log error:', logError)
    return 'unknown'
  }
}

// Create secure error
export const createSecureError = async (
  originalError: any,
  context: Record<string, any> = {}
): Promise<SecureError> => {
  const errorId = await logError(originalError, context)
  const errorType = classifyError(originalError)
  
  return {
    id: errorId,
    message: originalError.message || 'Unknown error',
    userMessage: USER_ERROR_MESSAGES[errorType],
    timestamp: Date.now()
  }
}

// Error handler for async operations
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context: Record<string, any> = {}
): Promise<{ data: T | null; error: SecureError | null }> => {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (originalError) {
    const error = await createSecureError(originalError, context)
    return { data: null, error }
  }
}

// Global error handler for unhandled promises
export const setupGlobalErrorHandling = () => {
  window.addEventListener('unhandledrejection', async (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    await createSecureError(event.reason, { type: 'unhandled_rejection' })
    event.preventDefault()
  })
  
  window.addEventListener('error', async (event) => {
    console.error('Global error:', event.error)
    await createSecureError(event.error, { 
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })
}

// Authentication specific error handler
export const handleAuthError = async (error: any, context: Record<string, any> = {}) => {
  const secureError = await createSecureError(error, { ...context, type: 'auth_error' })
  
  // Additional security logging for auth errors
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: 'auth_failure',
      p_event_data: {
        error_id: secureError.id,
        attempt_type: context.attemptType || 'unknown',
        user_agent: navigator.userAgent,
        ip_context: 'client_side'
      }
    })
  } catch (logError) {
    console.warn('Failed to log auth error:', logError)
  }
  
  return secureError
}