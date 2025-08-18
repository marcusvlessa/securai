import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { 
  Mail, 
  FileText, 
  Send, 
  Bot, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface VirtualAgentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'email_report' | 'notification' | 'analysis' | 'summary';
  trigger: 'manual' | 'auto_complete' | 'scheduled' | 'threshold';
  config: {
    emailTemplate?: {
      subject: string;
      body: string;
      recipients: string[];
      attachReport: boolean;
      includeSummary: boolean;
    };
    conditions?: {
      reportType?: string;
      caseStatus?: string;
      threshold?: number;
    };
    schedule?: {
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time?: string;
      days?: number[];
    };
  };
  enabled: boolean;
  lastExecuted?: string;
  executionCount: number;
}

interface VirtualAgentTemplateProps {
  onSave: (template: VirtualAgentTemplate) => void;
  onCancel: () => void;
  initialTemplate?: VirtualAgentTemplate;
}

export const VirtualAgentTemplate: React.FC<VirtualAgentTemplateProps> = ({
  onSave,
  onCancel,
  initialTemplate
}) => {
  const [template, setTemplate] = useState<VirtualAgentTemplate>(
    initialTemplate || {
      id: `template-${Date.now()}`,
      name: '',
      description: '',
      type: 'email_report',
      trigger: 'manual',
      config: {
        emailTemplate: {
          subject: 'Relatório de Investigação - [CASO]',
          body: `Prezado(a),

Segue em anexo o relatório executivo da operação de investigação.

**SUMÁRIO EXECUTIVO:**
[RESUMO_OPERACAO]

**PRINCIPAIS ACHADOS:**
[PRINCIPAIS_ACHADOS]

**EVIDÊNCIAS ANALISADAS:**
[EVIDENCIAS_ANALISADAS]

**METODOLOGIA:**
[METODOLOGIA_APLICADA]

**RECOMENDAÇÕES:**
[RECOMENDACOES]

**STATUS:** [STATUS_CASO]
**PRIORIDADE:** [PRIORIDADE]

Atenciosamente,
Sistema SecurAI - Análise Forense
`,
          recipients: [],
          attachReport: true,
          includeSummary: true
        },
        conditions: {
          reportType: 'investigation_report',
          caseStatus: 'completed'
        }
      },
      enabled: true,
      executionCount: 0
    }
  );

  const [newRecipient, setNewRecipient] = useState('');

  const handleAddRecipient = () => {
    if (newRecipient && newRecipient.includes('@')) {
      setTemplate(prev => ({
        ...prev,
        config: {
          ...prev.config,
          emailTemplate: {
            ...prev.config.emailTemplate!,
            recipients: [...(prev.config.emailTemplate?.recipients || []), newRecipient]
          }
        }
      }));
      setNewRecipient('');
    } else {
      toast.error('Por favor, insira um email válido');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setTemplate(prev => ({
      ...prev,
      config: {
        ...prev.config,
        emailTemplate: {
          ...prev.config.emailTemplate!,
          recipients: prev.config.emailTemplate?.recipients.filter(r => r !== email) || []
        }
      }
    }));
  };

  const handleSave = () => {
    if (!template.name || !template.description) {
      toast.error('Nome e descrição são obrigatórios');
      return;
    }

    if (template.type === 'email_report' && (!template.config.emailTemplate?.recipients.length)) {
      toast.error('Pelo menos um destinatário é necessário para templates de email');
      return;
    }

    onSave(template);
    toast.success('Template salvo com sucesso!');
  };

  const templateTypes = [
    { value: 'email_report', label: 'Relatório por Email', icon: Mail },
    { value: 'notification', label: 'Notificação', icon: Bell },
    { value: 'analysis', label: 'Análise Automática', icon: Bot },
    { value: 'summary', label: 'Sumário Executivo', icon: FileText }
  ];

  const triggerTypes = [
    { value: 'manual', label: 'Manual', description: 'Executado manualmente' },
    { value: 'auto_complete', label: 'Auto (Conclusão)', description: 'Quando relatório for finalizado' },
    { value: 'scheduled', label: 'Agendado', description: 'Em horários específicos' },
    { value: 'threshold', label: 'Por Limiar', description: 'Quando condições forem atendidas' }
  ];

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuração do Agente Virtual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={template.name}
                onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Envio Automático de Relatório"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Agente</Label>
              <Select 
                value={template.type} 
                onValueChange={(value: any) => setTemplate(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={template.description}
              onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva a função deste agente virtual..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Disparo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Condições de Disparo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Disparo</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {triggerTypes.map(trigger => (
                <div
                  key={trigger.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    template.trigger === trigger.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setTemplate(prev => ({ ...prev, trigger: trigger.value as any }))}
                >
                  <div className="font-medium">{trigger.label}</div>
                  <div className="text-sm text-muted-foreground">{trigger.description}</div>
                </div>
              ))}
            </div>
          </div>

          {template.trigger === 'auto_complete' && (
            <div className="space-y-2">
              <Label>Condições de Execução</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reportType">Tipo de Relatório</Label>
                  <Select 
                    value={template.config.conditions?.reportType || ''} 
                    onValueChange={(value) => setTemplate(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        conditions: {
                          ...prev.config.conditions,
                          reportType: value
                        }
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigation_report">Relatório de Investigação</SelectItem>
                      <SelectItem value="financial_analysis">Análise Financeira</SelectItem>
                      <SelectItem value="link_analysis">Análise de Vínculos</SelectItem>
                      <SelectItem value="any">Qualquer Relatório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="caseStatus">Status do Caso</Label>
                  <Select 
                    value={template.config.conditions?.caseStatus || ''} 
                    onValueChange={(value) => setTemplate(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        conditions: {
                          ...prev.config.conditions,
                          caseStatus: value
                        }
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="investigating">Em Investigação</SelectItem>
                      <SelectItem value="any">Qualquer Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Email */}
      {template.type === 'email_report' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuração do Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto do Email</Label>
              <Input
                id="subject"
                value={template.config.emailTemplate?.subject || ''}
                onChange={(e) => setTemplate(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    emailTemplate: {
                      ...prev.config.emailTemplate!,
                      subject: e.target.value
                    }
                  }
                }))}
                placeholder="Assunto do email..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Corpo do Email</Label>
              <Textarea
                id="body"
                value={template.config.emailTemplate?.body || ''}
                onChange={(e) => setTemplate(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    emailTemplate: {
                      ...prev.config.emailTemplate!,
                      body: e.target.value
                    }
                  }
                }))}
                rows={12}
                placeholder="Corpo do email (use [CASO], [RESUMO_OPERACAO], etc. para variáveis)"
              />
              <div className="text-xs text-muted-foreground">
                Variáveis disponíveis: [CASO], [RESUMO_OPERACAO], [PRINCIPAIS_ACHADOS], [EVIDENCIAS_ANALISADAS], [METODOLOGIA_APLICADA], [RECOMENDACOES], [STATUS_CASO], [PRIORIDADE]
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="flex gap-2">
                <Input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                />
                <Button onClick={handleAddRecipient} type="button">
                  Adicionar
                </Button>
              </div>
              
              {template.config.emailTemplate?.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.config.emailTemplate.recipients.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {email}
                      <button
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="attachReport"
                checked={template.config.emailTemplate?.attachReport || false}
                onCheckedChange={(checked) => setTemplate(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    emailTemplate: {
                      ...prev.config.emailTemplate!,
                      attachReport: checked
                    }
                  }
                }))}
              />
              <Label htmlFor="attachReport">Anexar relatório completo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="includeSummary"
                checked={template.config.emailTemplate?.includeSummary || false}
                onCheckedChange={(checked) => setTemplate(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    emailTemplate: {
                      ...prev.config.emailTemplate!,
                      includeSummary: checked
                    }
                  }
                }))}
              />
              <Label htmlFor="includeSummary">Incluir sumário executivo no corpo</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status e Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Status e Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Agente Ativo</Label>
              <p className="text-sm text-muted-foreground">
                {template.enabled ? 'O agente será executado automaticamente' : 'O agente está desabilitado'}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={template.enabled}
              onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {template.lastExecuted && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Última execução: {new Date(template.lastExecuted).toLocaleString('pt-BR')}
                <br />
                Total de execuções: {template.executionCount}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Send className="h-4 w-4 mr-2" />
          Salvar Template
        </Button>
      </div>
    </div>
  );
};