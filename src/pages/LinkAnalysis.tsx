
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  Network, 
  Brain, 
  Download,
  Eye,
  EyeOff,
  Filter,
  Search,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Shield,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { AdvancedLinkGraph } from '@/components/AdvancedLinkGraph';
import { 
  LinkAnalysisService, 
  ParsedData, 
  LinkGraph, 
  LinkNode, 
  LinkEdge 
} from '@/services/linkAnalysisService';

export default function LinkAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [graph, setGraph] = useState<LinkGraph | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  
  // Configurações do grafo
  const [sourceColumn, setSourceColumn] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [relationshipColumn, setRelationshipColumn] = useState<string>('');
  const [weightColumn, setWeightColumn] = useState<string>('');
  
  // Estados de visualização
  const [showPreview, setShowPreview] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    console.log('📁 Arquivo selecionado:', selectedFile.name, selectedFile.type, selectedFile.size);
    
    setFile(selectedFile);
    setIsProcessing(true);
    
    try {
      console.log('🚀 Iniciando análise do arquivo:', selectedFile.name);
      
      // Analisar arquivo
      const result = await LinkAnalysisService.analyzeFile(selectedFile);
      
      console.log('✅ Resultado da análise:', result);
      console.log('📊 Dados parseados:', result.parsedData);
      console.log('🔗 Grafo gerado:', result.graph);
      
      setParsedData(result.parsedData);
      setGraph(null);
      
      // Aplicar identificação padrão robusta
      applyDefaultColumnIdentification(result.parsedData);
      
      setShowGraph(false);
      
      console.log('🎯 Estado após processamento:', {
        parsedData: result.parsedData,
        graph: null,
        showGraph: false,
        sourceColumn,
        targetColumn
      });
      
      toast.success(`Arquivo processado com sucesso! ${result.parsedData.totalRows} linhas analisadas. Configure as colunas e clique em "Processar Análise de Vínculos".`);
      
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      toast.error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Função robusta para identificação padrão de colunas
  const applyDefaultColumnIdentification = (data: ParsedData) => {
    if (!data || !data.columns || data.columns.length === 0) {
      console.error('❌ Dados inválidos para identificação de colunas');
      return;
    }

    console.log('🔍 Aplicando identificação padrão de colunas...');
    console.log('📊 Colunas disponíveis:', data.columns);
    console.log('📊 Total de linhas:', data.data.length);

    // Padrões expandidos para identificação
    const patterns = {
      source: [
        'origem', 'source', 'from', 'de', 'remetente', 'emissor', 'cliente', 'fornecedor',
        'vendedor', 'comprador', 'pagador', 'recebedor', 'pessoa1', 'entidade1', 'sujeito1',
        'ator1', 'participante1', 'primeiro', 'inicio', 'partida', 'id', 'codigo', 'numero',
        'matricula', 'registro', 'cpf', 'cnpj', 'documento', 'identificacao', 'rif',
        'ordem', 'indexador', 'titular', 'responsavel', 'país', 'encaminhamento'
      ],
      target: [
        'destino', 'target', 'to', 'para', 'destinatario', 'receptor', 'beneficiario',
        'recebedor', 'cliente', 'fornecedor', 'vendedor', 'comprador', 'pessoa2', 'entidade2',
        'sujeito2', 'ator2', 'participante2', 'segundo', 'fim', 'chegada', 'nome', 'descricao',
        'titulo', 'rotulo', 'identificacao', 'beneficiario', 'remetente', 'observacoes',
        'interlocutor', 'assinante'
      ],
      relationship: [
        'tipo', 'relacao', 'relacionamento', 'operacao', 'acao', 'vinculo', 'status',
        'categoria', 'funcao', 'papel', 'atividade', 'observacoes', 'descricao', 'motivo',
        'finalidade', 'objetivo', 'resultado', 'consequencia', 'periodo', 'data'
      ],
      weight: [
        'valor', 'montante', 'quantia', 'preco', 'custo', 'peso', 'forca', 'intensidade',
        'frequencia', 'importancia', 'relevancia', 'score', 'rating', 'classificacao',
        'prioridade', 'urgencia', 'criticidade', 'risco'
      ]
    };

    // Função para calcular score de uma coluna baseado nos padrões
    const calculateColumnScore = (columnName: string, patternList: string[]) => {
      const colLower = columnName.toLowerCase();
      let score = 0;
      
      patternList.forEach(pattern => {
        if (colLower.includes(pattern)) {
          score += 10; // Match exato
        } else if (colLower.includes(pattern.substring(0, 3))) {
          score += 5; // Match parcial
        }
      });
      
      // Bônus para colunas com dados únicos
      const uniqueValues = new Set(data.data.map(row => row[columnName])).size;
      if (uniqueValues > 1) {
        score += Math.min(uniqueValues / 10, 5); // Máximo 5 pontos
      }
      
      // Bônus para colunas com dados válidos
      const validValues = data.data.filter(row => {
        const val = row[columnName];
        return val !== '' && val !== null && val !== undefined && val !== '-';
      }).length;
      score += (validValues / data.data.length) * 3; // Máximo 3 pontos
      
      return score;
    };

    // Calcular scores para todas as colunas
    const columnScores = data.columns.map(col => ({
      name: col,
      sourceScore: calculateColumnScore(col, patterns.source),
      targetScore: calculateColumnScore(col, patterns.target),
      relationshipScore: calculateColumnScore(col, patterns.relationship),
      weightScore: calculateColumnScore(col, patterns.weight)
    }));

    console.log('📊 Scores das colunas:', columnScores);

    // Selecionar melhores colunas baseado nos scores
    const bestSource = columnScores.reduce((best, current) => 
      current.sourceScore > best.sourceScore ? current : best
    );
    const bestTarget = columnScores.reduce((best, current) => 
      current.targetScore > best.targetScore ? current : best
    );
    const bestRelationship = columnScores.reduce((best, current) => 
      current.relationshipScore > best.relationshipScore ? current : best
    );
    const bestWeight = columnScores.reduce((best, current) => 
      current.weightScore > best.weightScore ? current : best
    );

    // Garantir que origem e destino sejam diferentes
    let finalSource = bestSource.name;
    let finalTarget = bestTarget.name;
    
    if (finalSource === finalTarget && data.columns.length > 1) {
      // Se são iguais, usar a segunda melhor opção para destino
      const secondBestTarget = columnScores
        .filter(col => col.name !== finalSource)
        .reduce((best, current) => 
          current.targetScore > best.targetScore ? current : best
        );
      finalTarget = secondBestTarget.name;
    }

    // Aplicar configuração automática
    setSourceColumn(finalSource);
    setTargetColumn(finalTarget);
    setRelationshipColumn(bestRelationship.relationshipScore > 0 ? bestRelationship.name : '');
    setWeightColumn(bestWeight.weightScore > 0 ? bestWeight.name : '');

    console.log('✅ Identificação padrão aplicada:', {
      source: finalSource,
      target: finalTarget,
      relationship: bestRelationship.relationshipScore > 0 ? bestRelationship.name : 'N/A',
      weight: bestWeight.weightScore > 0 ? bestWeight.name : 'N/A'
    });

    // Se não conseguiu identificar automaticamente, usar as primeiras colunas
    if (!finalSource || !finalTarget) {
      console.log('⚠️ Usando fallback para primeiras colunas');
      setSourceColumn(data.columns[0] || '');
      setTargetColumn(data.columns[1] || '');
    }
  };

  // Função para detectar automaticamente as melhores colunas (manual)
  const detectBestColumns = () => {
    if (!parsedData) return;
    applyDefaultColumnIdentification(parsedData);
    toast.success('Configuração automática aplicada com sucesso!');
  };

  // Gerar grafo personalizado
  const generateCustomGraph = useCallback(async () => {
    if (!parsedData) {
      toast.error('Faça upload de um arquivo primeiro');
      return;
    }

    if (!sourceColumn || !targetColumn) {
      toast.error('Configure as colunas de origem e destino');
      return;
    }

    if (sourceColumn === targetColumn) {
      toast.error('Origem e destino devem ser colunas diferentes');
      return;
    }

    try {
      setIsProcessing(true);
      
      console.log('🚀 Gerando grafo com configurações:', {
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn,
        totalRows: parsedData.totalRows,
        columns: parsedData.columns
      });
      
      // Validar que as colunas existem nos dados
      if (!parsedData.columns.includes(sourceColumn)) {
        throw new Error(`Coluna de origem "${sourceColumn}" não encontrada nos dados`);
      }
      
      if (!parsedData.columns.includes(targetColumn)) {
        throw new Error(`Coluna de destino "${targetColumn}" não encontrada nos dados`);
      }
      
      // Verificar dados das colunas selecionadas
      const sourceValues = parsedData.data.slice(0, 5).map(row => row[sourceColumn]);
      const targetValues = parsedData.data.slice(0, 5).map(row => row[targetColumn]);
      
      console.log('🔍 Valores das colunas selecionadas:', {
        sourceColumn,
        sourceValues,
        targetColumn,
        targetValues
      });
      
      const customGraph = LinkAnalysisService.generateCustomGraph(
        parsedData,
        sourceColumn,
        targetColumn,
        relationshipColumn || undefined,
        weightColumn || undefined
      );
      
      setGraph(customGraph);
      setShowGraph(true);
      
      console.log('✅ Grafo gerado com sucesso:', customGraph);
      
      toast.success(`Grafo gerado com sucesso! ${customGraph.metadata.totalNodes} entidades e ${customGraph.metadata.totalEdges} relacionamentos.`);
      
      // Mudar para a aba de visualização automaticamente
      setActiveTab('visualization');
      
    } catch (error) {
      console.error('❌ Erro ao gerar grafo:', error);
      toast.error(`Erro ao gerar grafo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, sourceColumn, targetColumn, relationshipColumn, weightColumn]);

  // Analisar com IA
  const analyzeWithAI = useCallback(async () => {
    if (!graph) {
      toast.error('Gere um grafo primeiro');
      return;
    }

    try {
      setIsAnalyzingAI(true);
      
      console.log('🤖 Iniciando análise de IA para grafo:', graph);
      
      const analysis = await LinkAnalysisService.analyzeGraphWithAI(graph);
      setAiAnalysis(analysis);
      
      console.log('✅ Análise de IA concluída:', analysis);
      
      toast.success('Análise de IA concluída!');
      
      // Mudar para a aba de análise automaticamente
      setActiveTab('analysis');
      
    } catch (error) {
      console.error('❌ Erro na análise de IA:', error);
      toast.error(`Erro na análise de IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsAnalyzingAI(false);
    }
  }, [graph]);

  // Handlers de eventos do grafo
  const handleNodeClick = useCallback((node: LinkNode) => {
    console.log('Nó clicado:', node);
    toast.info(`Entidade selecionada: ${node.id} (${node.type})`);
  }, []);

  const handleEdgeClick = useCallback((edge: LinkEdge) => {
    console.log('Aresta clicada:', edge);
    toast.info(`Relacionamento: ${edge.source} → ${edge.target} [${edge.type}]`);
  }, []);

  // Resetar análise
  const resetAnalysis = useCallback(() => {
    setFile(null);
    setParsedData(null);
    setGraph(null);
    setAiAnalysis('');
    setSourceColumn('');
    setTargetColumn('');
    setRelationshipColumn('');
    setWeightColumn('');
    setShowGraph(false);
    setShowPreview(true);
    setActiveTab('upload');
    setShowConfigPanel(false);
  }, []);

  // Verificar se as colunas estão configuradas
  const isConfigurationValid = sourceColumn && targetColumn && sourceColumn !== targetColumn;

  // Debug: mostrar estado das configurações
  useEffect(() => {
    if (parsedData) {
      console.log('🔍 Estado das configurações:', {
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn,
        isConfigurationValid,
        totalColumns: parsedData.columns.length,
        columns: parsedData.columns
      });
    }
  }, [parsedData, sourceColumn, targetColumn, relationshipColumn, weightColumn, isConfigurationValid]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <Shield className="h-10 w-10 text-primary" />
          Análise de Vínculos
        </h1>
        <p className="text-muted-foreground text-lg">
          Sistema profissional de análise de vínculos e relacionamentos investigativos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">📤 Upload</TabsTrigger>
          <TabsTrigger value="visualization" disabled={!parsedData}>📊 Visualização</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!parsedData}>🤖 Análise IA</TabsTrigger>
        </TabsList>

        {/* Tab: Upload */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Arraste e solte seu arquivo aqui</p>
                  <p className="text-sm text-muted-foreground">
                    Ou clique para selecionar um arquivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos suportados: CSV, Excel (XLS/XLSX), JSON, TXT
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".csv,.xls,.xlsx,.json,.txt"
                  onChange={handleFileUpload}
                  className="mt-4"
                  disabled={isProcessing}
                />
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando arquivo...
                </div>
              )}

              {parsedData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Arquivo processado com sucesso!</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{parsedData.totalRows}</div>
                      <div className="text-sm text-muted-foreground">Linhas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{parsedData.columns.length}</div>
                      <div className="text-sm text-muted-foreground">Colunas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{(parsedData.fileInfo.size / 1024).toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">KB</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{parsedData.fileInfo.type || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Tipo</div>
                    </div>
                  </div>

                  {/* Botão de Configurações */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowConfigPanel(!showConfigPanel)} 
                      variant="outline"
                      className="flex-1"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {showConfigPanel ? 'Ocultar' : 'Mostrar'} Configurações
                    </Button>
                    
                    <Button onClick={() => setShowPreview(!showPreview)} variant="outline">
                      {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showPreview ? 'Ocultar' : 'Mostrar'} Preview
                    </Button>
                  </div>

                  {/* Painel de Configurações */}
                  {showConfigPanel && (
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-blue-800">
                            ⚙️ Configuração do Grafo
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfigPanel(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Configuração Automática */}
                        <div className="p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-blue-800 mb-2">
                            <Brain className="h-4 w-4" />
                            <span className="font-medium">Configuração Automática</span>
                          </div>
                          <p className="text-sm text-blue-700 mb-3">
                            Detecte automaticamente as melhores colunas para análise de vínculos.
                          </p>
                          <Button 
                            onClick={detectBestColumns}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isProcessing}
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Detectar Configuração Automaticamente
                          </Button>
                        </div>

                        {/* Seleção Manual de Colunas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sourceColumn" className="text-sm font-medium">
                              Coluna de Origem *
                            </Label>
                            <Select value={sourceColumn} onValueChange={setSourceColumn}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a coluna de origem" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedData.columns.map((column, index) => (
                                  <SelectItem key={index} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="targetColumn" className="text-sm font-medium">
                              Coluna de Destino *
                            </Label>
                            <Select value={targetColumn} onValueChange={setTargetColumn}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a coluna de destino" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedData.columns.map((column, index) => (
                                  <SelectItem key={index} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="relationshipColumn" className="text-sm font-medium">
                              Coluna de Relacionamento
                            </Label>
                            <Select value={relationshipColumn} onValueChange={setRelationshipColumn}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a coluna de relacionamento" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedData.columns.map((column, index) => (
                                  <SelectItem key={index} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="weightColumn" className="text-sm font-medium">
                              Coluna de Peso/Valor
                            </Label>
                            <Select value={weightColumn} onValueChange={setWeightColumn}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a coluna de peso" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedData.columns.map((column, index) => (
                                  <SelectItem key={index} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Status da Configuração */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-lg border ${
                            sourceColumn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="text-sm font-medium">Origem</div>
                            <div className={`text-xs ${sourceColumn ? 'text-green-700' : 'text-red-700'}`}>
                              {sourceColumn || 'Não configurada'}
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg border ${
                            targetColumn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="text-sm font-medium">Destino</div>
                            <div className={`text-xs ${targetColumn ? 'text-green-700' : 'text-red-700'}`}>
                              {targetColumn || 'Não configurada'}
                            </div>
                          </div>
                        </div>

                        {/* Validação */}
                        {sourceColumn && targetColumn && sourceColumn === targetColumn && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">⚠️ Origem e destino são a mesma coluna</span>
                            </div>
                          </div>
                        )}

                        {/* Botão de Geração */}
                        <Button 
                          onClick={generateCustomGraph} 
                          disabled={!isConfigurationValid || isProcessing}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Gerando Grafo...
                            </>
                          ) : (
                            <>
                              <Network className="h-4 w-4 mr-2" />
                              Processar Análise de Vínculos
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Status da configuração automática */}
                  {parsedData && !showConfigPanel && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800 mb-2">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Status da Configuração</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium">Origem:</span> 
                          <span className={`ml-2 ${sourceColumn ? 'text-green-600' : 'text-red-600'}`}>
                            {sourceColumn || 'Não detectada'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Destino:</span> 
                          <span className={`ml-2 ${targetColumn ? 'text-green-600' : 'text-red-600'}`}>
                            {targetColumn || 'Não detectada'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Relacionamento:</span> 
                          <span className={`ml-2 ${relationshipColumn ? 'text-green-600' : 'text-gray-600'}`}>
                            {relationshipColumn || 'Não detectado'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Peso:</span> 
                          <span className={`ml-2 ${weightColumn ? 'text-green-600' : 'text-gray-600'}`}>
                            {weightColumn || 'Não detectado'}
                          </span>
                        </div>
                      </div>
                      {!isConfigurationValid && (
                        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                          ⚠️ Configure as colunas para gerar o grafo
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão de Processar Análise de Vínculos */}
                  {parsedData && (
                    <div className="mt-4">
                      <Button 
                        onClick={generateCustomGraph} 
                        disabled={!isConfigurationValid || isProcessing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Network className="h-4 w-4 mr-2" />
                            Processar Análise de Vínculos
                          </>
                        )}
                      </Button>
                      {!isConfigurationValid && (
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          Configure as colunas de origem e destino para processar a análise
                        </p>
                      )}
                    </div>
                  )}

                  {showPreview && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Preview dos Dados:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              {parsedData.columns.map((column, index) => (
                                <th key={index} className="border border-border p-2 text-left">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.preview.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {parsedData.columns.map((column, colIndex) => (
                                  <td key={colIndex} className="border border-border p-2">
                                    {String(row[column] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Visualização */}
        <TabsContent value="visualization" className="space-y-4">
          {!graph ? (
            <Card>
              <CardContent className="text-center p-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4" />
                <p>Configure e gere um grafo primeiro para visualizá-lo</p>
                {parsedData && (
                  <Button 
                    onClick={() => setActiveTab('upload')} 
                    className="mt-4"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Ir para Configurações
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Estatísticas do Grafo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Estatísticas do Grafo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{graph.metadata.totalNodes}</div>
                      <div className="text-sm text-muted-foreground">Entidades</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{graph.metadata.totalEdges}</div>
                      <div className="text-sm text-muted-foreground">Relacionamentos</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{graph.metadata.density.toFixed(3)}</div>
                      <div className="text-sm text-muted-foreground">Densidade</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{graph.metadata.averageDegree.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Grau Médio</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Tipos de Entidades:</h4>
                      <div className="flex flex-wrap gap-2">
                        {graph.metadata.nodeTypes.map((type, index) => (
                          <Badge key={index} variant="secondary">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Tipos de Relacionamentos:</h4>
                      <div className="flex flex-wrap gap-2">
                        {graph.metadata.edgeTypes.map((type, index) => (
                          <Badge key={index} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visualização do Grafo */}
              <AdvancedLinkGraph
                graph={graph}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
              />
            </>
          )}
        </TabsContent>

        {/* Tab: Análise IA */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Análise com Inteligência Artificial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!graph ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4" />
                  <p>Gere um grafo primeiro para realizar a análise de IA</p>
                  {parsedData && (
                    <Button 
                      onClick={() => setActiveTab('upload')} 
                      className="mt-4"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Ir para Configurações
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={analyzeWithAI} 
                      disabled={isAnalyzingAI}
                      className="flex-1"
                    >
                      {isAnalyzingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Analisar com IA
                        </>
                      )}
                    </Button>
                  </div>

                  {aiAnalysis && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="prose prose-sm max-w-none">
                        <div 
                          className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg"
                          dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
