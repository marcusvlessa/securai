import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Bot, Plus, X, Settings, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualAgent {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  lastExecution: string;
  executionCount: number;
  connectors: string[];
  functions: string[];
  schedule?: 'manual' | 'daily' | 'weekly' | 'monthly';
  canvaTemplateId?: string;
}

interface AgentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Omit<VirtualAgent, 'id' | 'lastExecution' | 'executionCount' | 'status'>) => void;
  agent?: VirtualAgent;
}

const AgentForm: React.FC<AgentFormProps> = ({ isOpen, onClose, onSave, agent }) => {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    objective: agent?.objective || '',
    connectors: agent?.connectors || [],
    functions: agent?.functions || [],
    schedule: agent?.schedule || 'manual',
    canvaTemplateId: agent?.canvaTemplateId || ''
  });

  const availableConnectors = [
    { id: 'canva', name: 'Canva', description: 'Geração de apresentações visuais' },
    { id: 'email', name: 'E-mail', description: 'Notificações por e-mail' },
    { id: 'webhook', name: 'Webhook', description: 'Integração via HTTP' }
  ];

  const availableFunctions = [
    { id: 'analyze_case', name: 'Analisar Caso', description: 'Análise completa dos dados do caso' },
    { id: 'generate_visual_report', name: 'Gerar Relatório Visual', description: 'Criação de apresentações no Canva' },
    { id: 'send_notification', name: 'Enviar Notificação', description: 'Alertas por e-mail ou webhook' },
    { id: 'analyze_links', name: 'Analisar Vínculos', description: 'Mapeamento de relacionamentos' },
    { id: 'generate_presentation', name: 'Gerar Apresentação', description: 'Slides automatizados' },
    { id: 'monitor_evidence', name: 'Monitorar Evidências', description: 'Detecção de novas evidências' },
    { id: 'notify_updates', name: 'Notificar Atualizações', description: 'Alertas de mudanças' }
  ];

  const mockCanvaTemplates = [
    { id: 'template-1', name: 'Relatório Executivo', type: 'presentation' },
    { id: 'template-2', name: 'Infográfico de Análise', type: 'infographic' },
    { id: 'template-3', name: 'Dashboard de Casos', type: 'dashboard' },
    { id: 'template-4', name: 'Timeline de Investigação', type: 'timeline' }
  ];

  const handleConnectorToggle = (connectorId: string) => {
    setFormData(prev => ({
      ...prev,
      connectors: prev.connectors.includes(connectorId)
        ? prev.connectors.filter(id => id !== connectorId)
        : [...prev.connectors, connectorId]
    }));
  };

  const handleFunctionToggle = (functionId: string) => {
    setFormData(prev => ({
      ...prev,
      functions: prev.functions.includes(functionId)
        ? prev.functions.filter(id => id !== functionId)
        : [...prev.functions, functionId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }
    
    if (!formData.objective.trim()) {
      toast.error('Objetivo do agente é obrigatório');
      return;
    }
    
    if (formData.connectors.length === 0) {
      toast.error('Selecione pelo menos um conector');
      return;
    }
    
    if (formData.functions.length === 0) {
      toast.error('Selecione pelo menos uma função');
      return;
    }

    onSave(formData);
    onClose();
    toast.success(agent ? 'Agente atualizado com sucesso' : 'Agente criado com sucesso');
  };

  const handleReset = () => {
    setFormData({
      name: '',
      objective: '',
      connectors: [],
      functions: [],
      schedule: 'manual',
      canvaTemplateId: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand" />
            {agent ? 'Editar Agente Virtual' : 'Criar Novo Agente Virtual'}
          </DialogTitle>
          <DialogDescription>
            Configure as funcionalidades e conectores do agente virtual para automatizar tarefas de investigação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nome do Agente *</Label>
              <Input
                id="agent-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Resumo de Caso Semanal"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-schedule">Frequência de Execução</Label>
              <Select value={formData.schedule} onValueChange={(value) => setFormData(prev => ({ ...prev, schedule: value as 'manual' | 'daily' | 'weekly' | 'monthly' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-objective">Objetivo *</Label>
            <Textarea
              id="agent-objective"
              value={formData.objective}
              onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
              placeholder="Descreva o que este agente deve fazer..."
              rows={3}
            />
          </div>

          {/* Connectors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conectores</CardTitle>
              <CardDescription>
                Selecione os serviços que o agente pode utilizar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableConnectors.map((connector) => (
                <div key={connector.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`connector-${connector.id}`}
                    checked={formData.connectors.includes(connector.id)}
                    onCheckedChange={() => handleConnectorToggle(connector.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`connector-${connector.id}`} className="font-medium">
                      {connector.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{connector.description}</p>
                  </div>
                </div>
              ))}
              
              {/* Canva Template Selection */}
              {formData.connectors.includes('canva') && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Palette className="h-4 w-4" />
                    Template do Canva
                  </Label>
                  <Select 
                    value={formData.canvaTemplateId || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      canvaTemplateId: value === "none" ? "" : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template do Canva" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum template selecionado</SelectItem>
                      {mockCanvaTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Functions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funções</CardTitle>
              <CardDescription>
                Selecione as ações que o agente pode executar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableFunctions.map((func) => (
                <div key={func.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`function-${func.id}`}
                    checked={formData.functions.includes(func.id)}
                    onCheckedChange={() => handleFunctionToggle(func.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`function-${func.id}`} className="font-medium">
                      {func.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{func.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prévia do Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Nome:</span>
                  <span className="ml-2 text-sm">{formData.name || 'Não definido'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Conectores:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.connectors.map(id => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {availableConnectors.find(c => c.id === id)?.name}
                      </Badge>
                    ))}
                    {formData.connectors.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum selecionado</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Funções:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.functions.map(id => (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {availableFunctions.find(f => f.id === id)?.name}
                      </Badge>
                    ))}
                    {formData.functions.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhuma selecionada</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleReset}>
              Limpar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {agent ? 'Atualizar Agente' : 'Criar Agente'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentForm;
