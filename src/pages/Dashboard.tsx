
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useCase } from '../contexts/CaseContext';
import { AlertCircle, FileText, Layers, PieChart, ChevronRight, BookOpen, BarChartHorizontal, Folder, ImageIcon, AudioLines, Camera, FolderArchive, List, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCaseStatistics, getImageAnalysesByCaseId, getOccurrencesByCaseId, getAudioTranscriptionsByCaseId } from '../services/databaseService';

interface CaseStats {
  occurrencesCount: number;
  imagesCount: number;
  audiosCount: number;
  crimeTypes: { name: string; count: number }[];
  lastUpdated: string;
}

const Dashboard = () => {
  const { cases, currentCase } = useCase();
  const navigate = useNavigate();
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  // Load case statistics when current case changes
  useEffect(() => {
    if (currentCase) {
      loadCaseStats();
    } else {
      setCaseStats(null);
    }
  }, [currentCase]);

  // Load statistics for the current case
  const loadCaseStats = async () => {
    if (!currentCase) return;
    
    setIsLoadingStats(true);
    
    try {
      // Get statistics from database
      const stats = await getCaseStatistics(currentCase.id);
      
      // Get actual counts from database
      const occurrences = await getOccurrencesByCaseId(currentCase.id);
      const images = await getImageAnalysesByCaseId(currentCase.id);
      const audios = await getAudioTranscriptionsByCaseId(currentCase.id);
      
      // Format crime types data for the chart
      const crimeTypes = stats?.statistics.crimeTypes 
        ? Object.entries(stats.statistics.crimeTypes).map(([name, count]) => ({
            name,
            count: count as number
          }))
        : [];
      
      setCaseStats({
        occurrencesCount: occurrences.length,
        imagesCount: images.length,
        audiosCount: audios.length,
        crimeTypes,
        lastUpdated: stats?.statistics.lastUpdated || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading case statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="page-container py-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Shield className="h-8 w-8 text-brand" />
          Dashboard
        </h1>
        <p className="page-description">
          Visão geral dos casos e análises investigativas
        </p>
      </div>

      {!currentCase ? (
        <div>
          <Card className="border-warning bg-warning-light">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                <p className="text-warning-foreground">
                  Selecione um caso para visualizar seu dashboard ou crie um novo caso.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-brand" /> Casos Recentes
                </CardTitle>
                <CardDescription>
                  Lista dos casos mais recentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cases.length > 0 ? (
                  <div className="space-y-4">
                    {cases.slice(0, 5).map((caseItem) => (
                      <div 
                        key={caseItem.id} 
                        className="flex justify-between items-center p-3 hover:bg-accent rounded-md cursor-pointer transition-colors"
                        onClick={() => navigate(`/case-management`)}
                      >
                        <div className="flex items-center gap-3">
                          <FolderArchive className="h-5 w-5 text-brand" />
                          <div>
                            <h4 className="font-medium">{caseItem.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(caseItem.dateCreated).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhum caso criado ainda</p>
                    <Button onClick={() => navigate('/case-management')} className="gradient-text">
                      Criar Novo Caso
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" /> Módulos Disponíveis
                </CardTitle>
                <CardDescription>
                  Acesse os módulos de análise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="flex justify-start items-center gap-2 h-auto py-3"
                    onClick={() => navigate('/occurrence-analysis')}
                  >
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <span>Análise de Ocorrências</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex justify-start items-center gap-2 h-auto py-3"
                    onClick={() => navigate('/image-analysis')}
                  >
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    <span>Análise de Imagens</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex justify-start items-center gap-2 h-auto py-3"
                    onClick={() => navigate('/audio-analysis')}
                  >
                    <AudioLines className="h-5 w-5 text-purple-600" />
                    <span>Análise de Áudio</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex justify-start items-center gap-2 h-auto py-3"
                    onClick={() => navigate('/link-analysis')}
                  >
                    <Layers className="h-5 w-5 text-orange-600" />
                    <span>Análise de Vínculos</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex justify-start items-center gap-2 h-auto py-3 col-span-1 md:col-span-2"
                    onClick={() => navigate('/investigation-report')}
                  >
                    <BookOpen className="h-5 w-5 text-red-600" />
                    <span>Relatório de Investigação</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Folder className="h-5 w-5 text-brand" />
                  <span>{currentCase.title}</span>
                </h2>
                <p className="text-muted-foreground mt-1">
                  {currentCase.description || 'Sem descrição'}
                </p>
              </div>
              <Badge className="status-active">
                {currentCase.status || 'Ativo'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="stat-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ocorrências</p>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <div className="loading-spinner h-6 w-6"></div>
                      ) : (
                        caseStats?.occurrencesCount || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Documentos analisados
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-success opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Imagens</p>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <div className="loading-spinner h-6 w-6"></div>
                      ) : (
                        caseStats?.imagesCount || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagens processadas
                    </p>
                  </div>
                  <Camera className="h-8 w-8 text-brand opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Áudios</p>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <div className="loading-spinner h-6 w-6"></div>
                      ) : (
                        caseStats?.audiosCount || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Áudios transcritos
                    </p>
                  </div>
                  <AudioLines className="h-8 w-8 text-info opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChartHorizontal className="h-5 w-5" /> Tipos de Crimes Identificados
                  </CardTitle>
                  <CardDescription>
                    Análise dos tipos de crimes detectados nos documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {caseStats?.crimeTypes && caseStats.crimeTypes.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={caseStats.crimeTypes}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                        >
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="name" 
                            type="category"
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Ocorrências" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                     <div className="empty-state h-64">
                       <PieChart className="h-10 w-10 text-muted-foreground mb-3" />
                       <p className="text-muted-foreground">
                         Nenhum tipo de crime identificado ainda. 
                         Analise documentos para gerar estatísticas.
                       </p>
                     </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gray-400">Tags</Badge> Etiquetas de Crimes
                </CardTitle>
                <CardDescription>
                  Tags automáticas geradas pela IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {caseStats?.crimeTypes && caseStats.crimeTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {caseStats.crimeTypes.map((crime) => (
                      <Badge 
                        key={crime.name}
                        variant="secondary" 
                        className="bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {crime.name}
                      </Badge>
                    ))}
                  </div>
                 ) : (
                   <p className="text-muted-foreground py-6 text-center">
                     Nenhuma tag detectada ainda
                   </p>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
