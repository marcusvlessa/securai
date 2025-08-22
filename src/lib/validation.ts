// Input validation and sanitization utilities

import { z } from 'zod'
import DOMPurify from 'dompurify'

// Validation schemas
export const emailSchema = z.string().email('Email inválido')
export const passwordSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')

export const nameSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome não pode ter mais de 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')

export const badgeNumberSchema = z.string()
  .min(1, 'Número da matrícula é obrigatório')
  .max(20, 'Número da matrícula não pode ter mais de 20 caracteres')
  .regex(/^[A-Z0-9-]+$/i, 'Número da matrícula deve conter apenas letras, números e hífens')

export const departmentSchema = z.string()
  .min(2, 'Departamento deve ter pelo menos 2 caracteres')
  .max(100, 'Departamento não pode ter mais de 100 caracteres')

export const cpfSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00')
  .refine(validateCPF, 'CPF inválido')

export const cnpjSchema = z.string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0000-00')
  .refine(validateCNPJ, 'CNPJ inválido')

// Text sanitization
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return ''
  
  // Remove HTML tags and scripts
  let sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['";\\]/g, '')
  
  // Remove potential XSS patterns
  sanitized = sanitized.replace(/<script.*?>.*?<\/script>/gi, '')
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  return sanitized.trim()
}

// HTML content sanitization (for rich text)
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
    ALLOWED_ATTR: []
  })
}

// File validation
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

export const sanitizeFileName = (fileName: string): string => {
  // Remove potentially dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

// URL validation
export const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

// CPF validation algorithm
function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '')
  
  if (numbers.length !== 11) return false
  if (/^(\d)\1{10}$/.test(numbers)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit1 = (sum * 10) % 11
  if (digit1 === 10) digit1 = 0
  
  if (parseInt(numbers[9]) !== digit1) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  let digit2 = (sum * 10) % 11
  if (digit2 === 10) digit2 = 0
  
  return parseInt(numbers[10]) === digit2
}

// CNPJ validation algorithm
function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '')
  
  if (numbers.length !== 14) return false
  if (/^(\d)\1{13}$/.test(numbers)) return false
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i]
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  if (parseInt(numbers[12]) !== digit1) return false
  
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i]
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  return parseInt(numbers[13]) === digit2
}

// Rate limiting helper
const requestCounts = new Map<string, { count: number; timestamp: number }>()

export const checkRateLimit = (identifier: string, maxRequests: number, windowMs: number): boolean => {
  const now = Date.now()
  const existing = requestCounts.get(identifier)
  
  if (!existing || now - existing.timestamp > windowMs) {
    requestCounts.set(identifier, { count: 1, timestamp: now })
    return true
  }
  
  if (existing.count >= maxRequests) {
    return false
  }
  
  existing.count++
  return true
}

// Data masking for logs
export const maskSensitiveData = (data: Record<string, any>): Record<string, any> => {
  const masked = { ...data }
  
  // Mask common sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'cpf', 'cnpj', 'email']
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      if (field === 'email' && typeof masked[field] === 'string') {
        const email = masked[field] as string
        const [local, domain] = email.split('@')
        if (local && domain) {
          masked[field] = `${local.substring(0, 2)}***@${domain}`
        }
      } else if ((field === 'cpf' || field === 'cnpj') && typeof masked[field] === 'string') {
        masked[field] = '***.***.***-**'
      } else {
        masked[field] = '***'
      }
    }
  }
  
  return masked
}