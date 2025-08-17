import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Bot, 
  Settings, 
  Shield, 
  Zap, 
  Clock, 
  Users, 
  Database,
  Mail,
  Webhook,
  Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentFunction {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, string>;
}

interface AgentSecurityRule {
  name: string;
  description: string;
  type: 'access' | 'data' | 'execution';
  enabled: boolean;
}

interface AgentConnector {
  type: 'canva' | 'webhook' | 'email' | 'database';
  name: string;
  description: string;
  config: Record<string, string>;
}

interface VirtualAgentFormData {
  name: string;
  description: string;
  type: 'investigation' | 'analysis' | 'report' | 'notification';
  isActive: boolean;
  schedule: {
    type: 'manual' | 'trigger' | 'interval';
    trigger?: 'case_completed' | 'investigation_finished' | 'report_generated';
    interval?: number;
  };
  scope: {
    caseTypes: string[];
    userRoles: string[];
    dataAccess: 'own_cases' | 'department_cases' | 'all_cases';
  };
}

const VirtualAgentForm: React.FC<{
  onCancel: () => void;
  onSubmit: (data: VirtualAgentFormData) => void;
}> = ({ onCancel, onSubmit }) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<VirtualAgentFormData>({
    name: '',
    description: '',
    type: 'notification',
    isActive: true,
    schedule: {
      type: 'trigger',
      trigger: 'investigation_finished'
    },
    scope: {
      caseTypes: [],
      userRoles: [],
      dataAccess: 'own_cases'
    }
  });

  const availableFunctions: AgentFunction[] = [
    {
      name: 'analyze_case',
      description: 'Analisa dados do caso e identifica padrões',
      category: 'analysis',
      parameters: { 'depth': 'number', 'focus_areas': 'string[]' }
    },
    {
      name: 'generate_report',
      description: 'Gera relatório baseado nos dados analisados',
      category: 'report',
      parameters: { 'format': 'string', 'sections': 'string[]' }
    },
    {
      name: 'notify_users',
      description: 'Envia notificações para usuários relevantes',
      category: 'notification',
      parameters: { 'channels': 'string[]', 'template': 'string' }
    }
  ];

  const availableConnectors: AgentConnector[] = [
    {
      type: 'canva',
      name: 'Canva',
      description: 'Cria apresentações e documentos visuais',
      config: { 'template_id': 'string', 'brand_colors': 'string[]' }
    },
    {
      type: 'webhook',
      name: 'Webhook',
      description: 'Envia dados para sistemas externos',
      config: { 'endpoint': 'string', 'headers': 'Record<string, string>' }
    },
    {
      type: 'email',
      name: 'Email',
      description: 'Envia notificações por e-mail',
      config: { 'smtp_server': 'string', 'from_address': 'string' }
    },
    {
      type: 'database',
      name: 'Database',
      description: 'Armazena e recupera dados',
      config: { 'connection_string': 'string', 'table_name': 'string' }
    }
  ];

  const securityRules: AgentSecurityRule[] = [
    {
      name: 'Access Control',
      description: 'Controla quem pode executar o agente',
      type: 'access',
      enabled: true
    },
    {
      name: 'Data Encryption',
      description: 'Criptografa dados sensíveis',
      type: 'data',
      enabled: true
    },
    {
      name: 'Execution Limits',
      description: 'Define limites de execução',
      type: 'execution',
      enabled: true
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      await onSubmit(formData);
      toast({
        title: "Agente criado",
        description: "O agente virtual foi criado com sucesso.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao criar agente",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Criar Agente Virtual</h1>
        <p className="text-muted-foreground">
          Configure um novo agente de IA para automatizar tarefas de investigação
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuração Básica
          </CardTitle>
          <CardDescription>
            Defina as características principais do agente virtual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Agente Analisador de Casos"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: 'investigation' | 'analysis' | 'report' | 'notification') => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investigation">Investigação</SelectItem>
                    <SelectItem value="analysis">Análise</SelectItem>
                    <SelectItem value="report">Relatório</SelectItem>
                    <SelectItem value="notification">Notificação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que este agente faz..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Agente ativo</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleType">Tipo de Execução</Label>
                <Select 
                  value={formData.schedule.type} 
                  onValueChange={(value: 'manual' | 'trigger' | 'interval') => setFormData(prev => ({ 
                    ...prev, 
                    schedule: { ...prev.schedule, type: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="trigger">Gatilho</SelectItem>
                    <SelectItem value="interval">Intervalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.schedule.type === 'trigger' && (
                <div>
                  <Label htmlFor="trigger">Gatilho</Label>
                  <Select 
                    value={formData.schedule.trigger} 
                    onValueChange={(value: 'case_completed' | 'investigation_finished' | 'report_generated') => setFormData(prev => ({ 
                      ...prev, 
                      schedule: { ...prev.schedule, trigger: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case_completed">Caso Completado</SelectItem>
                      <SelectItem value="investigation_finished">Investigação Finalizada</SelectItem>
                      <SelectItem value="report_generated">Relatório Gerado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Criar Agente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VirtualAgentForm;