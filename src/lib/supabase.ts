import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          type: 'police_station' | 'forensic_lab' | 'prosecutor' | 'court'
          address: string
          phone: string
          created_at: string
          updated_at: string
          status: 'active' | 'inactive'
          settings: Record<string, any>
        }
        Insert: {
          id?: string
          name: string
          type: 'police_station' | 'forensic_lab' | 'prosecutor' | 'court'
          address: string
          phone: string
          created_at?: string
          updated_at?: string
          status?: 'active' | 'inactive'
          settings?: Record<string, any>
        }
        Update: {
          id?: string
          name?: string
          type?: 'police_station' | 'forensic_lab' | 'prosecutor' | 'court'
          address?: string
          phone?: string
          created_at?: string
          updated_at?: string
          status?: 'active' | 'inactive'
          settings?: Record<string, any>
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'admin' | 'investigator' | 'analyst' | 'viewer'
          badge_number: string
          department: string
          permissions: string[]
          created_at: string
          updated_at: string
          last_login: string
          status: 'active' | 'inactive' | 'suspended'
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: 'admin' | 'investigator' | 'analyst' | 'viewer'
          badge_number: string
          department: string
          permissions?: string[]
          created_at?: string
          updated_at?: string
          last_login?: string
          status?: 'active' | 'inactive' | 'suspended'
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'admin' | 'investigator' | 'analyst' | 'viewer'
          badge_number?: string
          department?: string
          permissions?: string[]
          created_at?: string
          updated_at?: string
          last_login?: string
          status?: 'active' | 'inactive' | 'suspended'
        }
      }
      cases: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string
          case_number: string
          priority: 'low' | 'medium' | 'high' | 'critical'
          status: 'open' | 'investigating' | 'closed' | 'archived'
          created_by: string
          assigned_to: string[]
          tags: string[]
          created_at: string
          updated_at: string
          closed_at: string | null
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description: string
          case_number: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'investigating' | 'closed' | 'archived'
          created_by: string
          assigned_to?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
          closed_at?: string | null
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string
          case_number?: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'investigating' | 'closed' | 'archived'
          created_by?: string
          assigned_to?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
          closed_at?: string | null
          metadata?: Record<string, any>
        }
      }
      evidence: {
        Row: {
          id: string
          case_id: string
          type: 'document' | 'image' | 'audio' | 'video' | 'link'
          title: string
          description: string
          file_path: string | null
          file_size: number | null
          metadata: Record<string, any>
          chain_of_custody: Record<string, any>[]
          created_by: string
          created_at: string
          updated_at: string
          tags: string[]
          analysis_status: 'pending' | 'processing' | 'completed' | 'failed'
          analysis_results: Record<string, any> | null
        }
        Insert: {
          id?: string
          case_id: string
          type: 'document' | 'image' | 'audio' | 'video' | 'link'
          title: string
          description: string
          file_path?: string | null
          file_size?: number | null
          metadata?: Record<string, any>
          chain_of_custody?: Record<string, any>[]
          created_by: string
          created_at?: string
          updated_at?: string
          tags?: string[]
          analysis_status?: 'pending' | 'processing' | 'completed' | 'failed'
          analysis_results?: Record<string, any> | null
        }
        Update: {
          id?: string
          case_id?: string
          type?: 'document' | 'image' | 'audio' | 'video' | 'link'
          title?: string
          description?: string
          file_path?: string | null
          file_size?: number | null
          metadata?: Record<string, any>
          chain_of_custody?: Record<string, any>[]
          created_by?: string
          created_at?: string
          updated_at?: string
          tags?: string[]
          analysis_status?: 'pending' | 'processing' | 'completed' | 'failed'
          analysis_results?: Record<string, any> | null
        }
      }
      analytics_events: {
        Row: {
          id: string
          organization_id: string
          case_id: string | null
          user_id: string
          event_type: string
          event_data: Record<string, any>
          created_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          case_id?: string | null
          user_id: string
          event_type: string
          event_data: Record<string, any>
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          case_id?: string | null
          user_id?: string
          event_type?: string
          event_data?: Record<string, any>
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}