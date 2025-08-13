import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  FileText, 
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Edit,
  Trash2
} from 'lucide-react';
import { useCase } from '../contexts/CaseContext';
import { toast } from 'sonner';
import AgentForm from '../components/AgentForm';
import AgentExecutionDialog from '../components/AgentExecutionDialog';

interface VirtualAgent {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  lastExecution: string;
  executionCount: number;
  connectors: string[];
  functions: string[];
}

const VirtualAgents = () => {
  const { currentCase } = useCase();
  const [agents, setAgents] = useState<VirtualAgent[]>([
    {
      id: 'agent-1',
      name: 'Resumo de Caso Semanal',
      objective: 'Gerar apresentação visual semanal dos principais insights do caso',
      status: 'active',
      lastExecution: '2024-01-15T10:30:00Z',
      executionCount: 12,
      connectors: ['canva', 'email'],
      functions: ['analyze_case', 'generate_visual_report', 'send_notification']
    },
    {
      id: 'agent-2',
      name: 'Relatório Visual de Vínculos',
      objective: 'Converter análises de vínculos em apresentações visuais',
      status: 'inactive',
      lastExecution: '2024-01-10T14:20:00Z',
      executionCount: 5,
      connectors: ['canva'],
      functions: ['analyze_links', 'generate_presentation']
    },
    {
      id: 'agent-3',
      name: 'Monitor de Evidências',
      objective: 'Detectar automaticamente novas evidências e notificar',
      status: 'running',
      lastExecution: '2024-01-15T11:00:00Z',
      executionCount: 28,
      connectors: ['webhook', 'email'],
      functions: ['monitor_evidence', 'notify_updates']
    }
  ]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<VirtualAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<VirtualAgent | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'inactive':
        return <Pause className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Activity className="h-4 w-4 text-brand animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="status-active">Ativo</Badge>;
      case 'inactive':
        return <Badge className="status-inactive">Inativo</Badge>;
      case 'running':
        return <Badge className="status-pending">Executando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatLastExecution = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours} hora(s)`;
    return `Há ${Math.floor(diffInHours / 24)} dia(s)`;
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setIsFormOpen(true);
  };

  const handleEditAgent = (agent: VirtualAgent) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agente?')) {
      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      toast.success('Agente excluído com sucesso');
    }
  };

  const handleSaveAgent = (agentData: Omit<VirtualAgent, 'id' | 'lastExecution' | 'executionCount' | 'status'>) => {
    if (editingAgent) {
      // Update existing agent
      setAgents(prev => prev.map(agent => 
        agent.id === editingAgent.id 
          ? { ...agent, ...agentData }
          : agent
      ));
    } else {
      // Create new agent
      const newAgent: VirtualAgent = {
        ...agentData,
        id: `agent-${Date.now()}`,
        lastExecution: new Date().toISOString(),
        executionCount: 0,
        status: 'inactive'
      };
      setAgents(prev => [...prev, newAgent]);
    }
  };

  const handleExecuteAgent = (agent: VirtualAgent) => {
    setSelectedAgent(agent);
    setIsExecutionOpen(true);
  };

  const handleToggleAgentStatus = (agentId: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { 
            ...agent, 
            status: agent.status === 'active' ? 'inactive' : 'active',
            lastExecution: new Date().toISOString()
          }
        : agent
    ));
  };

  const handleExecutionComplete = (result: any) => {
    if (selectedAgent) {
      setAgents(prev => prev.map(agent => 
        agent.id === selectedAgent.id 
          ? { 
              ...agent, 
              executionCount: agent.executionCount + 1,
              lastExecution: new Date().toISOString(),
              status: 'active'
            }
          : agent
      ));
    }
  };

  return (
    <div className="page-container py-6">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Bot className="h-8 w-8 text-brand" />
              Agentes Virtuais
            </h1>
            <p className="page-description">
              Automatize análises e relatórios com inteligência artificial
            </p>
          </div>
          <Button onClick={handleCreateAgent} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar Agente
          </Button>
        </div>
      </div>

      {!currentCase ? (
        <Card className="border-warning bg-warning-light">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="text-warning-foreground">
                Selecione um caso para gerenciar agentes virtuais ou crie um novo caso.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Agentes</p>
                    <p className="text-2xl font-bold">{agents.length}</p>
                  </div>
                  <Bot className="h-8 w-8 text-brand opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                    <p className="text-2xl font-bold text-success">
                      {agents.filter(a => a.status === 'active').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Executando</p>
                    <p className="text-2xl font-bold text-brand">
                      {agents.filter(a => a.status === 'running').length}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-brand opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Execuções</p>
                    <p className="text-2xl font-bold">
                      {agents.reduce((sum, agent) => sum + agent.executionCount, 0)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-info opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agents List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="feature-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(agent.status)}
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {agent.objective}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(agent.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Última execução</p>
                      <p className="font-medium">{formatLastExecution(agent.lastExecution)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Execuções</p>
                      <p className="font-medium">{agent.executionCount} vezes</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Conectores</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.connectors.map((connector) => (
                        <Badge key={connector} variant="outline" className="text-xs">
                          {connector}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Funções</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.functions.slice(0, 3).map((func) => (
                        <Badge key={func} variant="secondary" className="text-xs">
                          {func.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {agent.functions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.functions.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant={agent.status === 'running' ? 'secondary' : 'default'}
                      className="flex items-center gap-1"
                      onClick={() => handleExecuteAgent(agent)}
                    >
                      <Play className="h-3 w-3" />
                      Executar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1"
                      onClick={() => handleToggleAgentStatus(agent.id)}
                    >
                      {agent.status === 'active' ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Crie agentes a partir de templates predefinidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                  <FileText className="h-6 w-6 text-brand" />
                  <div className="text-left">
                    <p className="font-medium">Resumo Automático</p>
                    <p className="text-xs text-muted-foreground">
                      Gera resumos semanais em PDF
                    </p>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                  <ImageIcon className="h-6 w-6 text-success" />
                  <div className="text-left">
                    <p className="font-medium">Apresentação Visual</p>
                    <p className="text-xs text-muted-foreground">
                      Cria slides via Canva automaticamente
                    </p>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                  <AlertCircle className="h-6 w-6 text-warning" />
                  <div className="text-left">
                    <p className="font-medium">Monitor de Alertas</p>
                    <p className="text-xs text-muted-foreground">
                      Detecta padrões suspeitos automaticamente
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <AgentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveAgent}
        agent={editingAgent}
      />

      <AgentExecutionDialog
        isOpen={isExecutionOpen}
        onClose={() => setIsExecutionOpen(false)}
        agent={selectedAgent}
        onExecutionComplete={handleExecutionComplete}
      />
    </div>
  );
};

export default VirtualAgents;