
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Database, Link as LinkIcon, AlertCircle, Play, Download, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';
import { processLinkAnalysisDataWithGroq, makeGroqAIRequest } from '../services/groqService';
import LinkAnalysisUploader from '../components/LinkAnalysisUploader';

interface NetworkNode {
  id: string;
  label: string;
  group: string;
  size: number;
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;
  type: string;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

const LinkAnalysis = () => {
  const { currentCase, saveToCurrentCase } = useCase();
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<any>({});
  const [fileType, setFileType] = useState<string>('');
  const [graphImage, setGraphImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
  
  // Effect to draw the network graph when data changes
  useEffect(() => {
    if (networkData && networkData.nodes && networkData.links) {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      drawNetworkGraph(networkData, canvas);
      
      // Convert canvas to data URL for display
      const dataUrl = canvas.toDataURL('image/png');
      setGraphImage(dataUrl);
    }
  }, [networkData]);

  const handleDataUploaded = (data: any[], mapping: any, dataType: string) => {
    setUploadedData(data);
    setColumnMapping(mapping);
    setFileType(dataType);
    toast.success(`${data.length} registros carregados para análise de vínculos`);
  };

  const processData = async () => {
    if (!uploadedData.length) {
      toast.error('Por favor, carregue dados primeiro');
      return;
    }
    
    if (!currentCase) {
      toast.error('Por favor, selecione um caso antes de prosseguir');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Transform uploaded data into network format using AI
      const dataForAnalysis = {
        fileType,
        columnMapping,
        sampleData: uploadedData.slice(0, 10), // Send first 10 records as sample
        totalRecords: uploadedData.length
      };
      
      // Process the data with GROQ to create network graph
      const networkResult = await processLinkAnalysisDataWithGroq(currentCase, JSON.stringify(dataForAnalysis));
      
      // Add default values if API returns incomplete data  
      const processedData: NetworkData = {
        nodes: networkResult.nodes || [],
        links: networkResult.edges || networkResult.links || []
      };
      
      // Update the network data state
      setNetworkData(processedData);
      
      // Save to case
      saveToCurrentCase({
        timestamp: new Date().toISOString(),
        dataType: fileType,
        recordsProcessed: uploadedData.length,
        networkData: processedData
      }, 'linkAnalysis');
      
      toast.success(`Análise de vínculos processada: ${processedData.nodes.length} entidades, ${processedData.links.length} conexões`);
    } catch (error) {
      console.error('Error processing link analysis data:', error);
      toast.error('Erro ao processar dados para análise de vínculos: ' + 
                 (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateInsights = async () => {
    if (!networkData || !currentCase) {
      toast.error('Processe os dados primeiro para gerar insights');
      return;
    }

    setIsGeneratingInsights(true);

    try {
      // Prepare network features for AI analysis
      const features = {
        totalNodes: networkData.nodes.length,
        totalLinks: networkData.links.length,
        density: networkData.links.length > 0 ? 
          (2 * networkData.links.length) / (networkData.nodes.length * (networkData.nodes.length - 1)) : 0,
        nodeGroups: [...new Set(networkData.nodes.map(n => n.group))],
        linkTypes: [...new Set(networkData.links.map(l => l.type))],
        topConnectedNodes: networkData.nodes
          .map(node => ({
            ...node,
            connections: networkData.links.filter(l => l.source === node.id || l.target === node.id).length
          }))
          .sort((a, b) => b.connections - a.connections)
          .slice(0, 5)
      };

      const messages = [
        {
          role: "system",
          content: 
            "Você é um especialista em análise de vínculos e investigações. " +
            "Analise as características da rede fornecida e gere insights investigativos " +
            "sobre padrões suspeitos, entidades-chave, e recomendações para a investigação. " +
            "Forneça um relatório estruturado em português."
        },
        {
          role: "user", 
          content: `Analise esta rede de vínculos e forneça insights investigativos:\n\n` +
                  `Caso: ${currentCase.title}\n` +
                  `Tipo de dados: ${fileType}\n` +
                  `Características da rede:\n${JSON.stringify(features, null, 2)}`
        }
      ];

      const insightsResult = await makeGroqAIRequest(messages, 2048);
      setInsights(insightsResult);
      
      toast.success('Insights de investigação gerados com sucesso');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Erro ao gerar insights: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const drawNetworkGraph = (data: NetworkData, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc'; // Light background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('Análise de Vínculos', canvas.width/2, 30);
    
    // Check if we have nodes and links
    if (!data.nodes || data.nodes.length === 0 || !data.links || data.links.length === 0) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Não há dados suficientes para exibir o grafo', canvas.width/2, canvas.height/2);
      return;
    }
    
    // Clean and prepare data: remove self-loops and isolated nodes
    const nodeMap = new Map<string, NetworkNode>();
    data.nodes.forEach(n => nodeMap.set(n.id, n));

    const validLinks = (data.links || [])
      .filter(l => l.source !== l.target && nodeMap.has(l.source) && nodeMap.has(l.target));

    const degrees: Record<string, number> = {};
    validLinks.forEach(l => {
      degrees[l.source] = (degrees[l.source] || 0) + 1;
      degrees[l.target] = (degrees[l.target] || 0) + 1;
    });

    const nodes = data.nodes.filter(n => (degrees[n.id] || 0) > 0);

    if (nodes.length === 0 || validLinks.length === 0) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Não há vínculos válidos para exibir (verifique o mapeamento de colunas).', canvas.width/2, canvas.height/2);
      return;
    }

    // Fruchterman-Reingold force-directed layout for melhor organização
    const width = canvas.width;
    const height = canvas.height;
    const area = width * height;
    const k = Math.sqrt(area / nodes.length) * 0.6; // distância ideal
    const tInitial = Math.max(width, height) / 10;
    let t = tInitial;
    const iterations = 200;
    const padding = 60;

    // Posições iniciais em círculo com leve variação
    const pos: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) / 3;
      pos[n.id] = {
        x: width / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: height / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
      };
    });

    // Funções de força
    const frRepel = (dist: number) => (k * k) / Math.max(dist, 0.01);
    const frAttract = (dist: number) => (dist * dist) / k;

    for (let iter = 0; iter < iterations; iter++) {
      const disp: Record<string, { x: number; y: number }> = {};
      nodes.forEach(n => (disp[n.id] = { x: 0, y: 0 }));

      // Forças repulsivas entre todos os nós
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i].id;
          const n2 = nodes[j].id;
          const dx = pos[n1].x - pos[n2].x;
          const dy = pos[n1].y - pos[n2].y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const force = frRepel(dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          disp[n1].x += fx; disp[n1].y += fy;
          disp[n2].x -= fx; disp[n2].y -= fy;
        }
      }

      // Forças atrativas nas arestas
      validLinks.forEach(l => {
        const s = l.source; const tId = l.target;
        const dx = pos[s].x - pos[tId].x;
        const dy = pos[s].y - pos[tId].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const weight = Math.max(1, Math.log10((l.value || 1) + 1));
        const force = frAttract(dist) * weight * 0.5; // suaviza
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[s].x -= fx; disp[s].y -= fy;
        disp[tId].x += fx; disp[tId].y += fy;
      });

      // Atualiza posições com resfriamento
      nodes.forEach(n => {
        const d = Math.hypot(disp[n.id].x, disp[n.id].y) || 0.01;
        const limit = Math.min(t, d);
        pos[n.id].x += (disp[n.id].x / d) * limit;
        pos[n.id].y += (disp[n.id].y / d) * limit;
        pos[n.id].x = Math.max(padding, Math.min(width - padding, pos[n.id].x));
        pos[n.id].y = Math.max(padding, Math.min(height - padding, pos[n.id].y));
      });

      t *= 0.95; // resfriamento
      if (t < 0.1) break;
    }

    // Desenha arestas primeiro
    validLinks.forEach(link => {
      const sourcePos = pos[link.source];
      const targetPos = pos[link.target];
      if (!sourcePos || !targetPos) return;

      switch (link.type) {
        case 'associate':
        case 'knows':
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          break;
        case 'owns':
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          break;
        case 'works_at':
        case 'lives_at':
        case 'visits':
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          break;
        case 'client':
        case 'transaction':
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
          break;
        case 'related_to':
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
          break;
        default:
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
      }

      ctx.lineWidth = Math.max(2, Math.min(6, 1 + Math.log10(((link.value || 1) + 1)) * 2));
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();

      ctx.font = '9px Arial';
      ctx.fillStyle = '#64748b';
      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;
      ctx.fillText(link.type, midX, midY);
    });

    // Desenha nós por cima
    nodes.forEach(node => {
      const p = pos[node.id];
      if (!p) return;

      switch (node.group) {
        case 'suspect':
          ctx.fillStyle = '#ef4444';
          break;
        case 'victim':
          ctx.fillStyle = '#3b82f6';
          break;
        case 'witness':
          ctx.fillStyle = '#10b981';
          break;
        case 'location':
          ctx.fillStyle = '#f59e0b';
          break;
        case 'evidence':
          ctx.fillStyle = '#8b5cf6';
          break;
        case 'organization':
          ctx.fillStyle = '#ec4899';
          break;
        default:
          ctx.fillStyle = '#64748b';
      }

      const size = Math.max(5, Math.min(15, node.size || Math.sqrt(degrees[node.id] || 1) + 4));
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(String(node.label), p.x, p.y + size + 10);
    });

    // Legenda
    const legendX = 20;
    let legendY = 60;
    const types = ['suspect', 'victim', 'witness', 'location', 'evidence', 'organization'];
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const legends = ['Suspeito', 'Vítima', 'Testemunha', 'Local', 'Evidência', 'Organização'];

    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.fillText('Legenda:', legendX, legendY - 20);

    types.forEach((type, i) => {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(legendX + 7, legendY, 7, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '11px Arial';
      ctx.fillText(legends[i], legendX + 20, legendY + 4);

      legendY += 20;
    });

    // Estatísticas filtradas
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.fillText('Estatísticas:', canvas.width - 150, 60);

    ctx.font = '11px Arial';
    ctx.fillText(`Nós: ${nodes.length}`, canvas.width - 150, 80);
    ctx.fillText(`Arestas: ${validLinks.length}`, canvas.width - 150, 100);

    const density = (2 * validLinks.length) / (nodes.length * (nodes.length - 1));
    ctx.fillText(`Densidade: ${isFinite(density) ? density.toFixed(3) : '0.000'}`, canvas.width - 150, 120);

    const avgDegree = nodes.length ? (validLinks.length * 2) / nodes.length : 0;
    ctx.fillText(`Grau médio: ${avgDegree.toFixed(2)}`, canvas.width - 150, 140);
  };

  return (
    <div className="page-container py-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <LinkIcon className="h-8 w-8 text-brand" />
          Análise de Vínculo
        </h1>
        <p className="page-description">
          Identifique conexões e relações a partir de dados tabulares
        </p>
      </div>

      {!currentCase ? (
        <Card className="border-warning bg-warning-light">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="text-warning-foreground">
                Selecione um caso antes de prosseguir com a análise de vínculo.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LinkAnalysisUploader onDataUploaded={handleDataUploaded} />

            {uploadedData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Processamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={processData}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Executar Análise de Vínculos'}
                  </Button>
                  
                  {networkData && (
                    <Button
                      onClick={generateInsights}
                      disabled={isGeneratingInsights}
                      variant="outline"
                      className="w-full"
                    >
                      {isGeneratingInsights ? 'Gerando...' : 'Gerar Insights de Investigação'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Como Funciona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0">
                      1
                    </div>
                    <p>
                      Faça upload de um arquivo CSV, TXT, XLS ou XLSX contendo dados tabulares com informações relacionais.
                      O sistema espera colunas identificando entidades e suas relações.
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0">
                      2
                    </div>
                    <p>
                      O sistema processará os dados para identificar conexões, calculando proximidade por grau (conexões diretas)
                      e proximidade por frequência (número de interações).
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0">
                      3
                    </div>
                    <p>
                      Um grafo de vínculos será gerado visualmente, mostrando as entidades como nós e suas relações como conexões.
                      O tamanho e cor dos nós e conexões representam sua importância na rede.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="space-y-6">
              <Card className="h-96 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" /> Visualização de Vínculos
                  </CardTitle>
                  <CardDescription>
                    Gráfico de relacionamentos entre entidades encontradas nos dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                      <p className="mt-4 text-gray-600 dark:text-gray-400">
                        Processando dados e gerando visualização de vínculos...
                      </p>
                    </div>
                  ) : graphImage ? (
                    <div className="h-full flex flex-col">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md flex-1 overflow-auto">
                        <img 
                          src={graphImage} 
                          alt="Gráfico de vínculos" 
                          className="max-w-full h-auto mx-auto"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">Estatísticas dos Vínculos</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                            <p className="text-xs">Entidades: <span className="font-semibold">{networkData?.nodes.length || 0}</span></p>
                            <p className="text-xs">Conexões: <span className="font-semibold">{networkData?.links.length || 0}</span></p>
                            {networkData && (
                              <>
                                <p className="text-xs">Grau Médio: <span className="font-semibold">
                                  {(networkData.links.length * 2 / networkData.nodes.length).toFixed(1)}
                                </span></p>
                                <p className="text-xs">Densidade: <span className="font-semibold">
                                  {((2 * networkData.links.length) / (networkData.nodes.length * (networkData.nodes.length - 1))).toFixed(3)}
                                </span></p>
                              </>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (graphImage) {
                              const link = document.createElement('a');
                              link.download = 'analise-vinculos.png';
                              link.href = graphImage;
                              link.click();
                            }
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <LinkIcon className="h-16 w-16 opacity-20 mb-4" />
                      <p>Carregue dados e execute a análise para visualizar os vínculos</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Insights de Investigação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm">{insights}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkAnalysis;
