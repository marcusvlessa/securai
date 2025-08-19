import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Play, Square, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface AgentExecutionDialogProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  onExecutionComplete?: (result: any) => void;
}

interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  executionTime: number;
}

const AgentExecutionDialog: React.FC<AgentExecutionDialogProps> = ({
  agentId,
  agentName,
  isOpen,
  onClose
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [executionResults, setExecutionResults] = useState<ExecutionResult | null>(null);
  const [userInput, setUserInput] = useState('');
  const { toast } = useToast();

  // Initialize execution steps
  useEffect(() => {
    if (isOpen) {
      const steps: ExecutionStep[] = [
        { id: '1', name: 'Inicialização do Agente', status: 'pending', progress: 0 },
        { id: '2', name: 'Análise de Contexto', status: 'pending', progress: 0 },
        { id: '3', name: 'Processamento de Dados', status: 'pending', progress: 0 },
        { id: '4', name: 'Geração de Resultados', status: 'pending', progress: 0 },
        { id: '5', name: 'Finalização', status: 'pending', progress: 0 }
      ];
      setExecutionSteps(steps);
      setCurrentStep(0);
      setExecutionResults(null);
    }
  }, [isOpen]);

  const startExecution = async () => {
    if (!userInput.trim()) {
      toast({
        title: "Entrada necessária",
        description: "Por favor, forneça uma entrada para o agente processar.",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    setCurrentStep(0);

    try {
      // Simulate execution steps
      for (let i = 0; i < executionSteps.length; i++) {
        setCurrentStep(i);
        
        // Update step status
        setExecutionSteps(prev => prev.map((step, index) => 
          index === i 
            ? { ...step, status: 'running', startTime: new Date(), progress: 0 }
            : step
        ));

        // Simulate step execution with progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setExecutionSteps(prev => prev.map((step, index) => 
            index === i 
              ? { ...step, progress }
              : step
          ));
        }

        // Mark step as completed
        setExecutionSteps(prev => prev.map((step, index) => 
          index === i 
            ? { 
                ...step, 
                status: 'completed', 
                endTime: new Date(),
                progress: 100,
                result: `Step ${i + 1} completed successfully`
              }
            : step
        ));

        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Set final results
      const result: ExecutionResult = {
        success: true,
        data: {
          agentId,
          agentName,
          userInput,
          executionSteps: executionSteps.length,
          totalTime: Date.now()
        },
        executionTime: Date.now()
      };
      setExecutionResults(result);

      toast({
        title: "Execução concluída",
        description: "O agente executou todas as tarefas com sucesso.",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro na execução",
        description: `Falha durante a execução: ${errorMessage}`,
        variant: "destructive"
      });

      // Mark current step as failed
      setExecutionSteps(prev => prev.map((step, index) => 
        index === currentStep 
          ? { 
              ...step, 
              status: 'failed', 
              error: errorMessage,
              endTime: new Date()
            }
          : step
      ));
    } finally {
      setIsExecuting(false);
    }
  };

  const stopExecution = () => {
    setIsExecuting(false);
    toast({
      title: "Execução interrompida",
      description: "A execução do agente foi interrompida pelo usuário.",
    });
  };

  const resetExecution = () => {
    setExecutionSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      progress: 0,
      result: undefined,
      error: undefined,
      startTime: undefined,
      endTime: undefined
    })));
    setCurrentStep(0);
    setExecutionResults(null);
    setUserInput('');
  };

  const getStepIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running':
        return <RotateCcw className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStepColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-muted text-muted-foreground';
      case 'running':
        return 'bg-primary text-primary-foreground';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Execução do Agente: {agentName}
          </DialogTitle>
          <DialogDescription>
            Execute o agente virtual com entrada personalizada e acompanhe o progresso em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Entrada para o Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userInput">Instruções ou dados para processamento:</Label>
                  <Textarea
                    id="userInput"
                    placeholder="Descreva a tarefa ou forneça dados para o agente processar..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isExecuting}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={startExecution}
                    disabled={isExecuting || !userInput.trim()}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isExecuting ? 'Executando...' : 'Iniciar Execução'}
                  </Button>
                  
                  {isExecuting && (
                    <Button
                      onClick={stopExecution}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Parar
                    </Button>
                  )}
                  
                  <Button
                    onClick={resetExecution}
                    variant="outline"
                    disabled={isExecuting}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resetar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Execution Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso da Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executionSteps.map((step, index) => (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStepIcon(step.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStepColor(step.status)}`}>
                          {step.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {step.startTime && (
                          <span>Início: {step.startTime.toLocaleTimeString()}</span>
                        )}
                        {step.endTime && (
                          <span>Fim: {step.endTime.toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <Progress value={step.progress} className="h-2" />
                    
                    {step.result && (
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        {step.result}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        Erro: {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {executionResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Resultados da Execução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant="secondary" className="ml-2">
                        {executionResults.success ? 'Sucesso' : 'Falha'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Tempo de Execução:</span>
                      <span className="ml-2">{executionResults.executionTime}ms</span>
                    </div>
                  </div>
                  
                  {executionResults.data && (
                    <div>
                      <span className="font-medium">Dados:</span>
                      <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto">
                        {JSON.stringify(executionResults.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {executionResults.error && (
                    <div>
                      <span className="font-medium text-red-600">Erro:</span>
                      <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-700">
                        {executionResults.error}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentExecutionDialog;