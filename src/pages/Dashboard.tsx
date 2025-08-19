import { useState, useEffect } from 'react';
import { useCase } from '@/contexts/CaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Image, AudioLines, Link, AlertCircle, Upload, Plus } from 'lucide-react';
import CaseManager from '@/components/CaseManager';
import FileUploader from '@/components/FileUploader';
import { analysisService } from '@/services/analysisService';
import { fileUploadService } from '@/services/fileUploadService';

interface CaseStats {
  occurrences: number;
  images: number;
  audios: number;
  documents: number;
  analyses: number;
  lastUpdated: string;
}

export default function Dashboard() {
  const { currentCase, setCurrentCase } = useCase();
  const [caseStats, setCaseStats] = useState<CaseStats>({
    occurrences: 0,
    images: 0,
    audios: 0,
    documents: 0,
    analyses: 0,
    lastUpdated: new Date().toISOString()
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showCaseManager, setShowCaseManager] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (currentCase) {
      loadCaseStats();
      loadRecentData();
    }
  }, [currentCase]);

  const loadCaseStats = async () => {
    if (!currentCase) return;
    
    setIsLoadingStats(true);
    try {
      const [files, analyses] = await Promise.all([
        fileUploadService.getCaseFiles(currentCase.id),
        analysisService.getCaseAnalyses(currentCase.id)
      ]);

      const fileStats = files.reduce((acc, file) => {
        if (file.fileType === 'image') acc.images++;
        else if (file.fileType === 'audio') acc.audios++;
        else acc.documents++;
        return acc;
      }, { images: 0, audios: 0, documents: 0 });

      setCaseStats({
        occurrences: files.length,
        images: fileStats.images,
        audios: fileStats.audios,
        documents: fileStats.documents,
        analyses: analyses.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading case stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadRecentData = async () => {
    if (!currentCase) return;

    try {
      const [files, analyses] = await Promise.all([
        fileUploadService.getCaseFiles(currentCase.id),
        analysisService.getCaseAnalyses(currentCase.id)
      ]);

      setRecentFiles(files.slice(0, 5));
      setRecentAnalyses(analyses.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  const analysisModules = [
    {
      title: 'Análise de Texto',
      description: 'Processamento de documentos e extração de entidades',
      icon: FileText,
      color: 'bg-blue-500',
      route: '/occurrence-analysis'
    },
    {
      title: 'Análise de Imagens',
      description: 'Reconhecimento facial, OCR e detecção de objetos',
      icon: Image,
      color: 'bg-green-500',
      route: '/image-analysis'
    },
    {
      title: 'Análise de Áudio',
      description: 'Transcrição e análise de conteúdo de áudio',
      icon: AudioLines,
      color: 'bg-purple-500',
      route: '/audio-analysis'
    },
    {
      title: 'Análise de Vínculos',
      description: 'Mapeamento de relacionamentos e conexões',
      icon: Link,
      color: 'bg-orange-500',
      route: '/link-analysis'
    }
  ];

  const chartData = [
    { name: 'Documentos', value: caseStats.documents },
    { name: 'Imagens', value: caseStats.images },
    { name: 'Áudios', value: caseStats.audios },
    { name: 'Análises', value: caseStats.analyses }
  ];

  const handleCaseSelect = (selectedCase: any) => {
    const mappedCase = {
      id: selectedCase.id,
      title: selectedCase.title,
      description: selectedCase.description || '',
      dateCreated: selectedCase.created_at,
      lastModified: selectedCase.updated_at,
      status: selectedCase.status,
      case_type: selectedCase.case_type,
      priority: selectedCase.priority
    };
    setCurrentCase(mappedCase.id);
    setShowCaseManager(false);
  };

  if (!currentCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Secur:AI Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Sistema Inteligente de Análise e Investigação
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum caso selecionado. Selecione um caso existente ou crie um novo para começar.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center gap-4">
            <Button onClick={() => setShowCaseManager(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Caso
            </Button>
            <Button variant="outline" onClick={() => setShowCaseManager(true)} size="lg">
              Gerenciar Casos
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analysisModules.map((module, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-not-allowed opacity-60">
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-2`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {showCaseManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto m-4">
              <CaseManager 
                onCaseSelect={handleCaseSelect}
              />
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setShowCaseManager(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {currentCase.title}
            </h1>
            <p className="text-muted-foreground mt-1">{currentCase.description}</p>
            <Badge variant="secondary" className="mt-2">
              Caso {currentCase.status || 'ativo'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFileUploader(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button variant="outline" onClick={() => setShowCaseManager(true)}>
              Gerenciar Casos
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
              <div className="text-2xl font-bold">{caseStats.occurrences}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
              <div className="text-2xl font-bold">{caseStats.documents}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Imagens</CardTitle>
              <div className="text-2xl font-bold">{caseStats.images}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Áudios</CardTitle>
              <div className="text-2xl font-bold">{caseStats.audios}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Análises</CardTitle>
              <div className="text-2xl font-bold">{caseStats.analyses}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analysis">Módulos de Análise</TabsTrigger>
            <TabsTrigger value="files">Arquivos Recentes</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Conteúdo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>Ferramentas de análise disponíveis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisModules.map((module, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center`}>
                        <module.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{module.title}</h4>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = module.route}>
                        Abrir
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analysisModules.map((module, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" 
                      onClick={() => window.location.href = module.route}>
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-2`}>
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Iniciar Análise</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Arquivos Recentes</CardTitle>
                <CardDescription>Últimos arquivos enviados para este caso</CardDescription>
              </CardHeader>
              <CardContent>
                {recentFiles.length > 0 ? (
                  <div className="space-y-3">
                    {recentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{file.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              {file.fileType} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Badge variant={file.analysisStatus === 'completed' ? 'default' : 'secondary'}>
                          {file.analysisStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum arquivo encontrado</p>
                    <Button className="mt-4" onClick={() => setShowFileUploader(true)}>
                      Fazer Upload
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resultados de Análise</CardTitle>
                <CardDescription>Análises concluídas para este caso</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {recentAnalyses.map((analysis) => (
                      <div key={analysis.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{analysis.analysisType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(analysis.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">Modelo: {analysis.modelUsed}</p>
                        {analysis.confidenceScore && (
                          <p className="text-sm">Confiança: {(analysis.confidenceScore * 100).toFixed(1)}%</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma análise encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showCaseManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto m-4">
            <CaseManager 
              onCaseSelect={handleCaseSelect}
              selectedCaseId={currentCase?.id}
            />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowCaseManager(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {showFileUploader && currentCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full m-4">
            <FileUploader 
              caseId={currentCase.id}
              onFileUploaded={() => {
                loadCaseStats();
                loadRecentData();
                setShowFileUploader(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}