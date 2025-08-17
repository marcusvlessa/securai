import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface Case {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  case_type: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  organization_id: string;
  evidence_count: number;
  witness_count: number;
  suspect_count: number;
  tags: string[];
  location?: {
    address: string;
    city: string;
    state: string;
    coordinates?: [number, number];
  };
  metadata: Record<string, unknown>;
}

interface CaseContextType {
  cases: Case[];
  currentCase: Case | null;
  loading: boolean;
  error: string | null;
  createCase: (caseData: Partial<Case>) => Promise<Case>;
  updateCase: (id: string, updates: Partial<Case>) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
  setCurrentCase: (case_: Case | null) => void;
  refreshCases: () => Promise<void>;
  searchCases: (query: string) => Promise<Case[]>;
  filterCases: (filters: CaseFilters) => Case[];
  saveToCurrentCase: (data: Record<string, unknown>, type: string) => void;
  getCaseData: (type: string) => any;
}

interface CaseFilters {
  status?: Case['status'];
  priority?: Case['priority'];
  case_type?: string;
  assigned_to?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const useCase = () => {
  const context = useContext(CaseContext);
  if (context === undefined) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
};

export const CaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('CaseContext: Tentando buscar casos do Supabase...');

      const { data, error: fetchError } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('CaseContext: Erro ao buscar casos:', fetchError);
        
        // Se a tabela não existe, usar dados mockados
        if (fetchError.code === '42P01') { // Table doesn't exist
          console.log('CaseContext: Tabela cases não existe, usando dados mockados');
          const mockCases: Case[] = [
            {
              id: 'mock-case-1',
              title: 'Caso de Teste 1',
              description: 'Descrição do caso de teste para demonstração',
              status: 'open',
              priority: 'medium',
              case_type: 'investigação',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: 'default-org',
              evidence_count: 0,
              witness_count: 0,
              suspect_count: 0,
              tags: ['teste', 'demonstração'],
              metadata: {}
            },
            {
              id: 'mock-case-2',
              title: 'Caso de Teste 2',
              description: 'Segundo caso de teste para demonstração',
              status: 'investigating',
              priority: 'high',
              case_type: 'análise',
              created_at: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
              updated_at: new Date().toISOString(),
              organization_id: 'default-org',
              evidence_count: 2,
              witness_count: 1,
              suspect_count: 1,
              tags: ['teste', 'análise'],
              metadata: {}
            }
          ];
          
          setCases(mockCases);
          toast.info('Usando dados de demonstração (tabela cases não configurada)');
          return;
        }
        
        throw fetchError;
      }

      console.log('CaseContext: Casos carregados com sucesso:', data?.length || 0);
      // Converter dados do Supabase para o tipo Case
      const convertedCases: Case[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: (item.status as Case['status']) || 'open',
        priority: (item.priority as Case['priority']) || 'medium',
        case_type: item.case_type || 'investigação',
        created_at: item.created_at,
        updated_at: item.updated_at,
        organization_id: (item as any).organization_id || 'default-org',
        evidence_count: (item as any).evidence_count || 0,
        witness_count: (item as any).witness_count || 0,
        suspect_count: (item as any).suspect_count || 0,
        tags: (item as any).tags || [],
        metadata: (item as any).metadata || {}
      }));
      
      setCases(convertedCases);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar casos';
      console.error('CaseContext: Erro ao buscar casos:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createCase = async (caseData: Partial<Case>): Promise<Case> => {
    try {
      const newCase: Partial<Case> = {
        ...caseData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: caseData.status || 'open',
        priority: caseData.priority || 'medium',
        case_type: caseData.case_type || 'investigação',
        organization_id: caseData.organization_id || 'default-org',
        evidence_count: caseData.evidence_count || 0,
        witness_count: caseData.witness_count || 0,
        suspect_count: caseData.suspect_count || 0,
        tags: caseData.tags || [],
        metadata: caseData.metadata || {}
      };

      console.log('CaseContext: Tentando criar caso no Supabase...');

      const { data, error: insertError } = await supabase
        .from('cases')
        .insert([newCase as any])
        .select()
        .single();

      if (insertError) {
        console.error('CaseContext: Erro ao criar caso:', insertError);
        
        // Se a tabela não existe, criar caso mockado
        if (insertError.code === '42P01') { // Table doesn't exist
          console.log('CaseContext: Tabela cases não existe, criando caso mockado');
          const mockCase: Case = {
            id: `mock-case-${Date.now()}`,
            ...newCase
          } as Case;
          
          setCases(prev => [mockCase, ...prev]);
          toast.info('Caso criado localmente (tabela cases não configurada)');
          return mockCase;
        }
        
        throw insertError;
      }

      console.log('CaseContext: Caso criado com sucesso:', data);
      setCases(prev => [data as unknown as Case, ...prev]);
      toast.success('Caso criado com sucesso!');
      return data as unknown as Case;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar caso';
      console.error('CaseContext: Erro ao criar caso:', err);
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateCase = async (id: string, updates: Partial<Case>): Promise<void> => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setCases(prev => prev.map(case_ => 
        case_.id === id ? { ...case_, ...updateData } : case_
      ));

      if (currentCase?.id === id) {
        setCurrentCase(prev => prev ? { ...prev, ...updateData } : null);
      }

      toast.success('Caso atualizado com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar caso';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteCase = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCases(prev => prev.filter(case_ => case_.id !== id));
      
      if (currentCase?.id === id) {
        setCurrentCase(null);
      }

      toast.success('Caso excluído com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir caso';
      toast.error(errorMessage);
      throw err;
    }
  };

  const searchCases = async (query: string): Promise<Case[]> => {
    try {
      const { data, error: searchError } = await supabase
        .from('cases')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,case_type.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (searchError) throw searchError;

      // Converter dados do Supabase para o tipo Case
      const convertedCases: Case[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: (item.status as Case['status']) || 'open',
        priority: (item.priority as Case['priority']) || 'medium',
        case_type: item.case_type || 'investigação',
        created_at: item.created_at,
        updated_at: item.updated_at,
        organization_id: (item as any).organization_id || 'default-org',
        evidence_count: (item as any).evidence_count || 0,
        witness_count: (item as any).witness_count || 0,
        suspect_count: (item as any).suspect_count || 0,
        tags: (item as any).tags || [],
        metadata: (item as any).metadata || {}
      }));

      return convertedCases;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
      toast.error(errorMessage);
      return [];
    }
  };

  const filterCases = (filters: CaseFilters): Case[] => {
    return cases.filter(case_ => {
      if (filters.status && case_.status !== filters.status) return false;
      if (filters.priority && case_.priority !== filters.priority) return false;
      if (filters.case_type && case_.case_type !== filters.case_type) return false;
      if (filters.assigned_to && case_.assigned_to !== filters.assigned_to) return false;
      
      if (filters.date_range) {
        const caseDate = new Date(case_.created_at);
        if (caseDate < filters.date_range.start || caseDate > filters.date_range.end) {
          return false;
        }
      }
      
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => case_.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      return true;
    });
  };

  const refreshCases = async () => {
    await fetchCases();
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const value: CaseContextType = {
    cases,
    currentCase,
    loading,
    error,
    createCase,
    updateCase,
    deleteCase,
    setCurrentCase,
    refreshCases,
    searchCases,
    filterCases,
    saveToCurrentCase: (data: Record<string, unknown>, type: string) => {
      setCurrentCase(prev => prev ? { ...prev, [type]: data } : null);
    },
    getCaseData: (type: string) => {
      if (!currentCase) return null;
      return (currentCase as any)[type] || null;
    }
  };

  return (
    <CaseContext.Provider value={value}>
      {children}
    </CaseContext.Provider>
  );
};
