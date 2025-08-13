
import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, FilePlus, Folder } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';
import { generateInvestigationReportWithGroq } from '../services/groqService';

const InvestigationReport = () => {
  const { currentCase, getCaseData } = useCase();
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [evidences, setEvidences] = useState<any[]>([]);

  // Fetch evidence data when case changes
  useEffect(() => {
    if (currentCase) {
      const combinedEvidence: any[] = [];
      
      // Combine all types of evidence
      const occurrenceAnalysisData = getCaseData('occurrenceAnalysis') || [];
      occurrenceAnalysisData.forEach((item: any) => {
        combinedEvidence.push({
          name: item.filename || "Documento sem nome",
          type: 'text',
          content: item.analysis || "",
          date: item.timestamp
        });
      });

      const imageAnalysisData = getCaseData('imageAnalysis') || [];
      imageAnalysisData.forEach((item: any) => {
        combinedEvidence.push({
          name: item.imageName || "Imagem sem nome",
          type: 'image',
          analysis: item.processingResults,
          date: item.timestamp
        });
      });

      const audioAnalysisData = getCaseData('audioAnalysis') || [];
      audioAnalysisData.forEach((item: any) => {
        combinedEvidence.push({
          name: item.filename || "Áudio sem nome",
          type: 'audio',
          transcript: item.transcript || "",
          date: item.timestamp
        });
      });

      const linkAnalysisData = getCaseData('linkAnalysis') || [];
      linkAnalysisData.forEach((item: any) => {
        combinedEvidence.push({
          name: item.filename || "Análise de vínculo sem nome",
          type: 'link',
          graphData: item.networkData || null,
          date: item.timestamp
        });
      });

      // Sort by date (newest first)
      combinedEvidence.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setEvidences(combinedEvidence);
    }
  }, [currentCase, getCaseData]);

  const generateReport = async () => {
    if (!currentCase) {
      toast.error('Por favor, selecione um caso primeiro');
      return;
    }

    if (evidences.length === 0) {
      toast.error('Não há evidências disponíveis para gerar um relatório');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('Generating report with evidence count:', evidences.length);
      
      // Send evidence data to report generator
      const report = await generateInvestigationReportWithGroq(currentCase, evidences);
      
      console.log('Report generated successfully, length:', report.length);
      setReportContent(report);
      setActiveTab('report');
      toast.success('Relatório de investigação gerado com sucesso');
    } catch (error) {
      console.error('Error generating investigation report:', error);
      toast.error('Erro ao gerar relatório de investigação: ' + 
                 (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!reportContent) {
      toast.error('Não há relatório para baixar');
      return;
    }

    const element = document.createElement('a');
    const file = new Blob([reportContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Relatório_${currentCase?.title || 'Investigação'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Relatório de Investigação</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Gere relatórios detalhados baseados nas evidências do caso
        </p>
      </div>

      {!currentCase ? (
        <Card className="mb-6 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-200">
                Selecione um caso antes de prosseguir com o relatório de investigação.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Information */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5" /> Informações do Caso
                </CardTitle>
                <CardDescription>
                  {currentCase.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome do Caso</h3>
                    <p className="text-base font-medium">{currentCase.title || "Sem título"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</h3>
                    <p className="text-sm">{currentCase.description || "Sem descrição"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                    <p className="text-sm">{currentCase.status || "Ativo"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Evidências Disponíveis</h3>
                    <p className="text-sm">{evidences.length} item(s)</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={generateReport} 
                  disabled={isGenerating || evidences.length === 0}
                  className="w-full"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </CardFooter>
            </Card>

            {/* Report and Evidence Tabs */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-0">
                <CardTitle>Análise e Visualização</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="report">Relatório</TabsTrigger>
                    <TabsTrigger value="evidence">Evidências ({evidences.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="report" className="mt-4">
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                          Analisando evidências e gerando relatório...
                        </p>
                      </div>
                    ) : reportContent ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm">{reportContent}</pre>
                        </div>
                        <Button onClick={downloadReport} size="sm" className="w-full">
                          Baixar Relatório
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                        <FileText className="h-16 w-16 opacity-20 mb-4" />
                        <p>Clique em "Gerar Relatório" para criar um relatório detalhado</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="evidence" className="mt-4">
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {evidences.length > 0 ? (
                        evidences.map((item, index) => (
                          <Card key={index} className="bg-gray-50 dark:bg-gray-900">
                            <CardHeader className="p-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                {item.type === 'text' && <FileText className="h-4 w-4" />}
                                {item.type === 'image' && <FilePlus className="h-4 w-4" />}
                                {item.type === 'audio' && <FileText className="h-4 w-4" />}
                                {item.type === 'link' && <FileText className="h-4 w-4" />}
                                {item.name}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {new Date(item.date).toLocaleString()} - Tipo: {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 text-xs">
                              {item.type === 'text' && (
                                <div className="line-clamp-2">{item.content.substring(0, 100)}...</div>
                              )}
                              {item.type === 'image' && (
                                <div>
                                  {item.analysis?.ocrText ? (
                                    <p className="line-clamp-2">Texto extraído: {item.analysis.ocrText.substring(0, 50)}...</p>
                                  ) : (
                                    <p>Texto extraído: Nenhum</p>
                                  )}
                                  <p>Faces detectadas: {item.analysis?.facesDetected || 0}</p>
                                </div>
                              )}
                              {item.type === 'audio' && (
                                <p className="line-clamp-2">Transcrição: {item.transcript.substring(0, 100)}...</p>
                              )}
                              {item.type === 'link' && (
                                <p>Análise de vínculo com {item.graphData?.nodes?.length || 0} entidades e {item.graphData?.links?.length || 0} conexões</p>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                          <p>Não há evidências disponíveis para este caso</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Full Report */}
          <Card>
            <CardHeader>
              <CardTitle>Relatório Completo</CardTitle>
              <CardDescription>
                Visualize o relatório de investigação gerado a partir das evidências
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportContent ? (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md min-h-[300px] max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{reportContent}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400 min-h-[300px]">
                  <FileText className="h-16 w-16 opacity-20 mb-4" />
                  <p>Gere um relatório para visualizá-lo aqui</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InvestigationReport;
