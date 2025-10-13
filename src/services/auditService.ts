// Serviço de auditoria e logs de segurança
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  event_type: string;
  event_data?: Record<string, unknown> | null;
  ip_address?: unknown;
  user_agent?: string | null;
  created_at?: string;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'data_access' | 'data_modification' | 'permission_change' | 'error' | 'suspicious_activity';
  description: string;
  metadata?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Função para registrar evento de auditoria
export async function logAuditEvent(event: SecurityEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Tentativa de log sem usuário autenticado');
      return;
    }

    const { error } = await supabase
      .from('security_events')
      .insert([{
        user_id: user.id,
        event_type: event.type,
        event_data: {
          description: event.description,
          severity: event.severity,
          ...event.metadata
        }
      }]);

    if (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
  } catch (error) {
    console.error('Erro ao processar log de auditoria:', error);
  }
}

// Função para buscar logs de auditoria (apenas para admins)
export async function getAuditLogs(filters?: {
  userId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string;
}): Promise<AuditLogEntry[]> {
  try {
    let query = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return [];
    }

    return (data || []) as AuditLogEntry[];
  } catch (error) {
    console.error('Erro ao processar busca de logs:', error);
    return [];
  }
}

// Wrapper para ações críticas com logging automático
export async function withAuditLog<T>(
  action: () => Promise<T>,
  event: SecurityEvent
): Promise<T> {
  try {
    const result = await action();
    await logAuditEvent({
      ...event,
      metadata: {
        ...event.metadata,
        status: 'success'
      }
    });
    return result;
  } catch (error) {
    await logAuditEvent({
      ...event,
      type: 'error',
      severity: 'high',
      metadata: {
        ...event.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failure'
      }
    });
    throw error;
  }
}
