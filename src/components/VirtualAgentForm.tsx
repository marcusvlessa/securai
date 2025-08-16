import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Plus, X, Mail, Bot, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { createVirtualAgent, EMAIL_REPORT_AGENT_TEMPLATE, VirtualAgent } from '../services/virtualAgentsService';

interface VirtualAgentFormProps {
  onAgentCreated: (agent: VirtualAgent) => void;
  onCancel: () => void;
}

const VirtualAgentForm: React.FC<VirtualAgentFormProps> = ({ onAgentCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'notification' as const,
    isActive: true,
    schedule: {
      type: 'trigger' as const,
      trigger: 'investigation_finished' as const
    },
    scope: {
      caseTypes: ['investigation'],
      userRoles: ['investigator'],
      dataAccess: 'own_cases' as const
    }
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEmailReportAgent = async () => {
    setIsCreating(true);
    try {
      const agent = createVirtualAgent(EMAIL_REPORT_AGENT_TEMPLATE);
      toast.success('Agente de relatório por email criado com sucesso!');
      onAgentCreated(agent);
    } catch (error) {
      console.error('Error creating email report agent:', error);
      toast.error('Erro ao criar agente de relatório por email');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCustomAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }

    setIsCreating(true);
    try {
      const agent = createVirtualAgent({
        ...formData,
        functions: [
          {
            id: 'custom_function',
            type: 'generate_summary',
            name: 'Função Personalizada',
            parameters: {},
            isEnabled: true
          }
        ],
        connectors: [
          {
            id: 'groq_connector',
            type: 'groq',
            name: 'GROQ AI',
            configuration: {
              model: 'llama3-8b-8192',
              maxTokens: 2048
            },
            isEnabled: true
          }
        ],
        securityRules: [
          {
            id: 'data_access_rule',
            type: 'data_access',
            rule: 'own_cases_only',
            value: true,
            isActive: true
          }
        ]
      });

      toast.success('Agente virtual criado com sucesso!');
      onAgentCreated(agent);
    } catch (error) {
      console.error('Error creating custom agent:', error);
      toast.error('Erro ao criar agente virtual');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Template Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Templates Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Agente de Relatório por Email</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gera e envia relatórios executivos por email ao final da investigação
                    </p>
                    <div className="mt-3">
                      <Button 
                        onClick={handleCreateEmailReportAgent}
                        disabled={isCreating}
                        size="sm"
                        className="w-full"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {isCreating ? 'Criando...' : 'Criar Agente'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Email</Badge>
                    <Badge variant="secondary">Sumário</Badge>
                    <Badge variant="secondary">Auto-trigger</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Custom Agent Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Criar Agente Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCustomAgentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Agente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Agente Analisador de Casos"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
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
                  onValueChange={(value: any) => setFormData(prev => ({ 
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
                    onValueChange={(value: any) => setFormData(prev => ({ 
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