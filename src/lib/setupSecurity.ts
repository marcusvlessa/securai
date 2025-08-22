// Security initialization and global setup

import { setupGlobalErrorHandling } from './errorHandler'

// Initialize security features when app starts
export const initializeSecurity = () => {
  // Set up global error handling
  setupGlobalErrorHandling()
  
  // Set up CSP headers (if running in production)
  if (import.meta.env.PROD) {
    // Add security headers via meta tags
    const cspMeta = document.createElement('meta')
    cspMeta.httpEquiv = 'Content-Security-Policy'
    cspMeta.content = `
      default-src 'self'; 
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dwpviyrzjohhonlixecb.supabase.co; 
      style-src 'self' 'unsafe-inline'; 
      img-src 'self' data: blob: https:; 
      connect-src 'self' https://dwpviyrzjohhonlixecb.supabase.co wss://dwpviyrzjohhonlixecb.supabase.co; 
      font-src 'self' data:;
    `.replace(/\s+/g, ' ').trim()
    document.head.appendChild(cspMeta)
  }
  
  // Disable right-click context menu in production
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    })
  }
  
  // Disable F12 and other dev tools shortcuts in production
  if (import.meta.env.PROD) {
    document.addEventListener('keydown', (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
        return false
      }
    })
  }
  
  console.log('✅ Security features initialized')
}

// Security check function
export const performSecurityCheck = () => {
  const checks = {
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    supabase: !!import.meta.env.VITE_SUPABASE_URL,
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null
  }
  
  const passed = Object.values(checks).every(Boolean)
  
  if (!passed) {
    console.warn('⚠️ Security checks failed:', checks)
  } else {
    console.log('✅ All security checks passed')
  }
  
  return { passed, checks }
}