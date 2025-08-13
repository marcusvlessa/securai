import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Download,
  ExternalLink,
  Loader2,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';

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

interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

interface ExecutionResult {
  success: boolean;
  duration: number;
  outputs: {
    type: 'text' | 'file' | 'link';
    content: string;
    title: string;
  }[];
  metrics: {
    tokensUsed?: number;
    apiCalls?: number;
    filesGenerated?: number;
  };
}

interface AgentExecutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: VirtualAgent | null;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

const AgentExecutionDialog: React.FC<AgentExecutionDialogProps> = ({ 
  isOpen, 
  onClose, 
  agent, 
  onExecutionComplete 
}) => {
  const { currentCase } = useCase();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (isOpen && agent) {
      resetExecution();
    }
  }, [isOpen, agent]);

  const resetExecution = () => {
    setIsExecuting(false);
    setExecutionLogs([]);
    setProgress(0);
    setExecutionResult(null);
    setCurrentStep('');
  };

  const addLog = (level: ExecutionLog['level'], message: string, details?: any) => {
    setExecutionLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    }]);
  };

  const simulateExecution = async () => {
    if (!agent || !currentCase) {
      toast.error('Agente ou caso não selecionado');
      return;
    }

    setIsExecuting(true);
    setProgress(0);
    setExecutionResult(null);

    try {
      // Step 1: Initialize
      setCurrentStep('Inicializando agente...');
      addLog('info', `Iniciando execução do agente: ${agent.name}`);
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Load case data
      setCurrentStep('Carregando dados do caso...');
      addLog('info', `Carregando dados do caso: ${currentCase.title}`);
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Execute functions
      setCurrentStep('Executando funções...');
      for (const func of agent.functions) {
        addLog('info', `Executando função: ${func.replace(/_/g, ' ')}`);
        setProgress(prev => prev + (50 / agent.functions.length));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 4: Process connectors
      setCurrentStep('Processando conectores...');
      for (const connector of agent.connectors) {
        if (connector === 'canva') {
          addLog('info', 'Conectando ao Canva...');
          addLog('success', 'Apresentação criada no Canva com sucesso');
        } else if (connector === 'email') {
          addLog('info', 'Enviando notificação por e-mail...');
          addLog('success', 'E-mail enviado com sucesso');
        } else if (connector === 'webhook') {
          addLog('info', 'Chamando webhook...');
          addLog('success', 'Webhook executado com sucesso');
        }
        setProgress(prev => prev + (15 / agent.connectors.length));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 5: Generate outputs
      setCurrentStep('Gerando resultados...');
      addLog('info', 'Compilando resultados da execução...');
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Final result
      const mockResult: ExecutionResult = {
        success: true,
        duration: 8500,
        outputs: [
          {
            type: 'text',
            title: 'Resumo Executivo',
            content: `# Resumo do Caso ${currentCase.title}\n\n## Insights Principais\n- Análise concluída com sucesso\n- 3 evidências processadas\n- 2 vínculos identificados\n\n## Recomendações\n- Investigar vínculos encontrados\n- Analisar evidências adicionais\n- Acompanhar desenvolvimentos`
          },
          ...(agent.connectors.includes('canva') ? [{
            type: 'link' as const,
            title: 'Apresentação no Canva',
            content: 'https://canva.com/design/fake-presentation-id'
          }] : []),
          {
            type: 'file' as const,
            title: 'Relatório Detalhado',
            content: 'relatorio-caso-' + new Date().toISOString().slice(0, 10) + '.pdf'
          }
        ],
        metrics: {
          tokensUsed: 2450,
          apiCalls: 5,
          filesGenerated: agent.connectors.includes('canva') ? 2 : 1
        }
      };

      setExecutionResult(mockResult);
      setProgress(100);
      setCurrentStep('Execução concluída');
      addLog('success', 'Agente executado com sucesso!');
      
      onExecutionComplete?.(mockResult);
      toast.success('Execução do agente concluída com sucesso');

    } catch (error) {
      addLog('error', 'Erro durante a execução do agente');
      setCurrentStep('Erro na execução');
      toast.error('Erro durante a execução do agente');
    } finally {
      setIsExecuting(false);
    }
  };

  const getLogIcon = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const downloadOutput = (output: ExecutionResult['outputs'][0]) => {
    if (output.type === 'text') {
      const blob = new Blob([output.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${output.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (output.type === 'file') {
      toast.info(`Download iniciado: ${output.content}`);
    } else if (output.type === 'link') {
      window.open(output.content, '_blank');
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand" />
            Execução do Agente: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Monitore a execução do agente virtual e visualize os resultados gerados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <CardDescription>{agent.objective}</CardDescription>
                </div>
                <Badge variant={isExecuting ? "default" : "outline"}>
                  {isExecuting ? 'Executando' : 'Pronto'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-medium">Conectores:</span>
                {agent.connectors.map(connector => (
                  <Badge key={connector} variant="outline" className="text-xs">
                    {connector}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Funções:</span>
                {agent.functions.map(func => (
                  <Badge key={func} variant="secondary" className="text-xs">
                    {func.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Execution Progress */}
          {(isExecuting || executionResult) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  Status da Execução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{currentStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                {executionResult && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-success">{(executionResult.duration / 1000).toFixed(1)}s</p>
                      <p className="text-xs text-muted-foreground">Duração</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand">{executionResult.metrics.apiCalls}</p>
                      <p className="text-xs text-muted-foreground">API Calls</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-info">{executionResult.outputs.length}</p>
                      <p className="text-xs text-muted-foreground">Outputs</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Execution Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logs de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {executionLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Clique em "Executar Agente" para ver os logs
                  </p>
                ) : (
                  executionLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.level)}
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <p>{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution Results */}
          {executionResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultados da Execução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {executionResult.outputs.map((output, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {output.title}
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadOutput(output)}
                        className="flex items-center gap-1"
                      >
                        {output.type === 'link' ? (
                          <>
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                    {output.type === 'text' && (
                      <Textarea
                        value={output.content}
                        readOnly
                        className="min-h-[100px] text-xs font-mono"
                      />
                    )}
                    {output.type === 'file' && (
                      <p className="text-sm text-muted-foreground">
                        Arquivo: {output.content}
                      </p>
                    )}
                    {output.type === 'link' && (
                      <p className="text-sm text-muted-foreground">
                        URL: {output.content}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {!isExecuting && !executionResult && (
            <Button onClick={simulateExecution} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Executar Agente
            </Button>
          )}
          {isExecuting && (
            <Button variant="destructive" onClick={() => setIsExecuting(false)} className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Parar Execução
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentExecutionDialog;