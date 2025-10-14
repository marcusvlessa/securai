import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Upload, FileText, AlertTriangle, Download, Zap, TrendingUp, DollarSign, Users, Filter, Eye, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { useCase } from '@/contexts/CaseContext';
import { 
  uploadRIFData, 
  runRedFlagAnalysis, 
  getFinancialMetrics, 
  getFinancialTransactions, 
  generateCOAFReport,
  getRedFlagAlerts,
  exportFinancialData
} from '@/services/financialService';

interface RIFUploadProps {
  onDataUploaded: () => void;
}

const RIFUpload: React.FC<RIFUploadProps> = ({ onDataUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentCase } = useCase();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (!currentCase?.id) {
      toast.error('⚠️ Selecione um caso válido na barra lateral antes de fazer upload de arquivos RIF');
      return;
    }

    console.log('📤 Iniciando upload RIF para caso:', currentCase.id, currentCase.title);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📄 Processando arquivo ${i + 1}/${files.length}:`, file.name);
        setUploadProgress(((i + 1) / files.length) * 100);
        
        await uploadRIFData({
          caseId: currentCase.id,
          file: file,
          mappingPreset: 'RIF-COAF'
        });
      }
      
      toast.success(`✅ ${files.length} arquivo(s) RIF processado(s) com sucesso`);
      await onDataUploaded();
    } catch (error: any) {
      console.error('❌ Erro no upload RIF:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      
      if (errorMessage.includes('row-level security')) {
        toast.error('🔒 Erro de permissão: Você não tem autorização para adicionar transações a este caso');
      } else if (errorMessage.includes('invalid input syntax for type uuid')) {
        toast.error('⚠️ Erro: ID do caso inválido. Selecione um caso válido');
      } else {
        toast.error(`❌ Erro ao processar: ${errorMessage}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Arquivos RIF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onClick={() => document.getElementById('rif-upload')?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <div className="cursor-pointer">
              <span className="text-sm font-medium">Arraste arquivos RIF aqui ou clique para selecionar</span>
              <p className="text-xs text-muted-foreground mt-1">
                Suporte: TXT, CSV, XLSX, JSON, PDF (RIF do COAF)
              </p>
            </div>
            <Input
              id="rif-upload"
              type="file"
              multiple
              accept=".txt,.csv,.xlsx,.json,.pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={isUploading || !currentCase}
            />
          </div>
        
        {isUploading && (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Processando arquivos... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Os arquivos RIF devem conter campos: data, descrição, contraparte, agência, conta, banco, valor, tipo de transação.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

interface FinancialMetrics {
  totalCredits: string;
  totalDebits: string;
  balance: string;
  avgTicket: string;
  transactionCount: number;
  topCounterparties: Array<{ name: string; amount: string; count: number }>;
  periodData: Array<{ date: string; credits: number; debits: number }>;
  methodDistribution: Array<{ method: string; amount: number; count: number }>;
  timeHeatmap: Array<{ hour: number; day: string; count: number }>;
}

interface RedFlagAlert {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidenceCount: number;
  transactionIds: string[];
  createdAt: string;
  parameters: Record<string, any>;
}

const FinancialAnalysis: React.FC = () => {
  const { currentCase } = useCase();
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [filters, setFilters] = useState({
    minValue: '',
    method: '',
    counterparty: ''
  });

  const loadMetrics = async () => {
    if (!currentCase?.id) {
      console.log('⚠️ loadMetrics: Nenhum caso válido selecionado');
      return;
    }
    
    console.log('📊 loadMetrics: Carregando para caso:', currentCase.id);
    setIsLoadingMetrics(true);
    try {
      const metricsData = await getFinancialMetrics(currentCase.id, {
        timeRange: selectedTimeRange,
        ...filters
      });
      setMetrics(metricsData);
      console.log('✅ Métricas carregadas:', metricsData);
    } catch (error: any) {
      console.error('❌ Erro ao carregar métricas:', error);
      // Não mostrar toast se for erro de dados não encontrados
      if (!error?.message?.includes('syntax')) {
        toast.error('Erro ao carregar métricas financeiras');
      }
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadAlerts = async () => {
    if (!currentCase?.id) {
      console.log('⚠️ loadAlerts: Nenhum caso válido selecionado');
      return;
    }
    
    console.log('🚨 loadAlerts: Carregando para caso:', currentCase.id);
    try {
      const alertsData = await getRedFlagAlerts(currentCase.id);
      setAlerts(alertsData);
      console.log('✅ Alertas carregados:', alertsData.length);
    } catch (error: any) {
      console.error('❌ Erro ao carregar alertas:', error);
      if (!error?.message?.includes('syntax')) {
        toast.error('Erro ao carregar alertas COAF');
      }
    }
  };

  const loadTransactions = async () => {
    if (!currentCase?.id) {
      console.log('⚠️ loadTransactions: Nenhum caso válido selecionado');
      return;
    }
    
    console.log('📋 loadTransactions: Carregando para caso:', currentCase.id);
    try {
      const transactionsData = await getFinancialTransactions(currentCase.id, {
        page: 1,
        pageSize: 100,
        ...filters
      });
      setTransactions(transactionsData.transactions || []);
      console.log('✅ Transações carregadas:', transactionsData.transactions?.length || 0);
    } catch (error: any) {
      console.error('❌ Erro ao carregar transações:', error);
      if (!error?.message?.includes('syntax')) {
        toast.error('Erro ao carregar transações');
      }
    }
  };

  const runAnalysis = async () => {
    if (!currentCase?.id) return;
    
    setIsRunningAnalysis(true);
    try {
      await runRedFlagAnalysis({
        caseId: currentCase.id,
        thresholds: {
          fractioningThreshold: 10000,
          fanInOutThreshold: 10,
          circularityWindow: 30,
          incompatibleProfileMultiplier: 5
        },
        window: 30
      });
      
      toast.success('Análise de red flags executada com sucesso');
      await loadAlerts();
      await loadMetrics();
    } catch (error) {
      toast.error('Erro ao executar análise COAF');
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  const generateReport = async () => {
    if (!currentCase?.id) return;
    
    setIsGeneratingReport(true);
    try {
      const reportData = await generateCOAFReport({
        caseId: currentCase.id,
        filters: filters,
        includeCharts: true
      });
      
      // Create and download PDF
      const blob = new Blob([reportData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-coaf-${currentCase.title}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Relatório COAF gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório COAF');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    if (!currentCase?.id) return;
    
    try {
      const data = await exportFinancialData({
        caseId: currentCase.id,
        filters: filters,
        format
      });
      
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dados-financeiros-${currentCase.title}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Dados exportados em ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  useEffect(() => {
    if (currentCase?.id) {
      loadMetrics();
      loadAlerts();
      loadTransactions();
    }
  }, [currentCase?.id, selectedTimeRange, filters]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  if (!currentCase) {
    return (
      <div className="page-container py-8">
        <div className="page-header mb-6">
          <h1 className="page-title">Análise Financeira (RIF/COAF)</h1>
          <p className="page-description">
            Análise de registros financeiros com detecção de red flags conforme COAF
          </p>
        </div>
        
        <Alert className="bg-warning/10 border-warning">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertDescription className="text-base">
            <strong>Selecione um caso</strong> na barra lateral esquerda para acessar a Análise Financeira (RIF/COAF).
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Você pode criar um novo caso ou selecionar um caso existente no menu "Casos".
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="page-container py-8 space-y-6">
      <div className="page-header">
        <h1 className="page-title">Análise Financeira (RIF/COAF)</h1>
        <p className="page-description">
          Análise de registros financeiros com detecção de red flags conforme COAF e Lei 9.613/1998
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload RIF</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="alerts">Alertas COAF</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <RIFUpload onDataUploaded={async () => {
            await Promise.all([
              loadMetrics(),
              loadAlerts(),
              loadTransactions()
            ]);
          }} />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Empty State */}
          {!currentCase && (
            <Alert className="bg-warning/10 border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Selecione um caso na barra lateral para visualizar o dashboard financeiro.
              </AlertDescription>
            </Alert>
          )}
          
          {currentCase && !metrics && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Nenhum dado financeiro encontrado. Faça upload de um arquivo RIF na aba "Upload RIF".
              </AlertDescription>
            </Alert>
          )}
          
          {/* Controls */}
          {currentCase && (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Controles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <select 
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="1y">Último ano</option>
                    <option value="all">TODOS os períodos</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Valor Mínimo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
                    className="w-32"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Método</Label>
                  <select 
                    value={filters.method}
                    onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="PIX">PIX</option>
                    <option value="TED">TED</option>
                    <option value="TEF">TEF</option>
                    <option value="Espécie">Espécie</option>
                  </select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button 
                    onClick={runAnalysis} 
                    disabled={isRunningAnalysis}
                    className="run-button"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {isRunningAnalysis ? 'Executando...' : 'Executar Análise'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* KPI Cards */}
          {currentCase && metrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.totalCredits)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(metrics.totalDebits)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(metrics.balance)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transações</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.transactionCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Ticket médio: {formatCurrency(metrics.avgTicket)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {metrics && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Fluxo Temporal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="credits" stroke="#10b981" name="Créditos" />
                      <Line type="monotone" dataKey="debits" stroke="#ef4444" name="Débitos" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Método</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.methodDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Red Flags COAF
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="empty-state">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum alerta encontrado</p>
                  <p className="text-sm text-muted-foreground">Execute a análise para detectar red flags</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.type}</h4>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{alert.evidenceCount} evidências</span>
                        <span>{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Transações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 50).map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                        <TableCell>{transaction.counterparty}</TableCell>
                        <TableCell>{transaction.method}</TableCell>
                        <TableCell className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                            {transaction.type === 'credit' ? 'Crédito' : 'Débito'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                Relatórios e Exportações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">Relatório COAF (PDF)</h4>
                  <p className="text-sm text-muted-foreground">
                    Gera relatório completo conforme padrões COAF com gráficos e análises.
                  </p>
                  <Button 
                    onClick={generateReport}
                    disabled={isGeneratingReport}
                    className="w-full"
                  >
                    <FileBarChart className="h-4 w-4 mr-2" />
                    {isGeneratingReport ? 'Gerando...' : 'Gerar Relatório PDF'}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Exportar Dados</h4>
                  <p className="text-sm text-muted-foreground">
                    Exporta transações e métricas para análise externa.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => exportData('csv')}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => exportData('xlsx')}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalysis;