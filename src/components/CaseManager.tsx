import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Calendar, AlertCircle, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Case {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  case_type: 'investigation' | 'financial' | 'criminal' | 'civil';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface CaseManagerProps {
  onCaseSelect?: (caseData: Case) => void;
  selectedCaseId?: string;
}

const CaseManager: React.FC<CaseManagerProps> = ({ onCaseSelect, selectedCaseId }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state for new case
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    case_type: 'investigation' as const,
    priority: 'medium' as const
  });

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCases((data as Case[]) || []);
    } catch (error) {
      console.error('Error loading cases:', error);
      toast.error('Erro ao carregar casos');
    } finally {
      setLoading(false);
    }
  };

  const createCase = async () => {
    try {
      if (!newCase.title.trim()) {
        toast.error('Título é obrigatório');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('cases')
        .insert({
          ...newCase,
          user_id: user.user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Caso criado com sucesso');
      setCases(prev => [data as Case, ...prev]);
      setShowCreateDialog(false);
      setNewCase({
        title: '',
        description: '',
        case_type: 'investigation',
        priority: 'medium'
      });

      // Auto-select the new case
      onCaseSelect?.(data);
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Erro ao criar caso');
    }
  };

  const updateCaseStatus = async (caseId: string, status: Case['status']) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) {
        throw error;
      }

      setCases(prev => prev.map(case_ => 
        case_.id === caseId ? { ...case_, status } : case_
      ));

      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating case status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const filteredCases = cases.filter(case_ => {
    const matchesSearch = case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || case_.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || case_.case_type === typeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const getPriorityColor = (priority: Case['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciamento de Casos</h2>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Caso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Caso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título*</Label>
                <Input
                  id="title"
                  value={newCase.title}
                  onChange={(e) => setNewCase(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do caso"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newCase.description}
                  onChange={(e) => setNewCase(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição detalhada do caso"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="case_type">Tipo</Label>
                  <Select value={newCase.case_type} onValueChange={(value: Case['case_type']) => 
                    setNewCase(prev => ({ ...prev, case_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigation">Investigação</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="criminal">Criminal</SelectItem>
                      <SelectItem value="civil">Civil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={newCase.priority} onValueChange={(value: Case['priority']) => 
                    setNewCase(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createCase}>
                  Criar Caso
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar casos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="investigation">Investigação</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="criminal">Criminal</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map((case_) => (
          <Card 
            key={case_.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCaseId === case_.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onCaseSelect?.(case_)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base line-clamp-1">{case_.title}</CardTitle>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      updateCaseStatus(case_.id, 'active');
                    }}>
                      Marcar como Ativo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      updateCaseStatus(case_.id, 'completed');
                    }}>
                      Marcar como Concluído
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      updateCaseStatus(case_.id, 'archived');
                    }}>
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(case_.status)}>
                  {case_.status === 'active' ? 'Ativo' : 
                   case_.status === 'completed' ? 'Concluído' : 'Arquivado'}
                </Badge>
                <Badge className={getPriorityColor(case_.priority)}>
                  {case_.priority === 'urgent' ? 'Urgente' :
                   case_.priority === 'high' ? 'Alta' :
                   case_.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                <Badge variant="outline">
                  {case_.case_type === 'investigation' ? 'Investigação' :
                   case_.case_type === 'financial' ? 'Financeiro' :
                   case_.case_type === 'criminal' ? 'Criminal' : 'Civil'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {case_.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {case_.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Criado em {new Date(case_.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum caso encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {cases.length === 0 
                ? 'Crie seu primeiro caso para começar a investigação'
                : 'Ajuste os filtros ou termo de busca para encontrar casos'
              }
            </p>
            {cases.length === 0 && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Caso
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CaseManager;