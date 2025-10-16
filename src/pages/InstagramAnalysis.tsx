import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Upload, Users, MessageSquare, Search, Image, Volume2, Download, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { InstagramUploader } from '@/components/InstagramUploader';
import { InstagramViewer } from '@/components/InstagramViewer';
import { InstagramSearch } from '@/components/InstagramSearch';
import { InstagramMedia } from '@/components/InstagramMedia';
import { InstagramChats } from '@/components/InstagramChats';
import { InstagramProfile } from '@/components/InstagramProfile';
import { InstagramDevices } from '@/components/InstagramDevices';
import { InstagramIPs } from '@/components/InstagramIPs';
import { InstagramFollowers } from '@/components/InstagramFollowers';
import { ConexoesInstagram } from '@/components/ConexoesInstagram';
import { InstagramReport } from '@/components/InstagramReport';
import { InstagramRequestParams } from '@/components/InstagramRequestParams';
import { InstagramNCMEC } from '@/components/InstagramNCMEC';
import { InstagramDisappearingMessages } from '@/components/InstagramDisappearingMessages';
import { ApiKeyInput } from '@/components/ui/api-key-input';
import { ProcessedInstagramData } from '@/services/instagramParserService';

interface ProcessedSummary {
  id: string;
  filename: string;
  users: number;
  conversations: number;
  media: number;
  processedAt: string;
  status: 'processing' | 'completed' | 'error';
}

const InstagramAnalysis = () => {
  const { toast } = useToast();
  const [processedFiles, setProcessedFiles] = useState<Map<string, ProcessedInstagramData>>(new Map());
  const [processedSummaries, setProcessedSummaries] = useState<ProcessedSummary[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const selectedFile = selectedFileId ? processedFiles.get(selectedFileId) : null;

  const handleFileProcessed = (data: ProcessedInstagramData) => {
    // Armazenar dados completos
    setProcessedFiles(prev => new Map(prev).set(data.id, data));
    
    // Criar resumo para lista
    const summary: ProcessedSummary = {
      id: data.id,
      filename: data.metadata.originalFilename,
      users: data.users.length,
      conversations: data.conversations.length,
      media: data.media.length,
      processedAt: data.metadata.processedAt.toISOString(),
      status: 'completed'
    };
    
    setProcessedSummaries(prev => [...prev, summary]);
    setSelectedFileId(data.id);
    
    toast({
      title: "Arquivo processado",
      description: `${summary.filename} foi processado com sucesso`,
    });
  };

  const handleFileSelect = (summary: ProcessedSummary) => {
    setSelectedFileId(summary.id);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise de Dados do Instagram</h2>
          <p className="text-muted-foreground">
            Faça upload e analise dados exportados do Instagram
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos Processados</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedSummaries.length}</div>
            <p className="text-xs text-muted-foreground">
              +{processedSummaries.filter(f => f.status === 'completed').length} completos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processedSummaries.reduce((sum, f) => sum + f.users, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Identificados nos dados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processedSummaries.reduce((sum, f) => sum + f.conversations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Threads analisados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mídia</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processedSummaries.reduce((sum, f) => sum + f.media, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Imagens e vídeos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Upload de Dados</CardTitle>
            <CardDescription>
              Faça upload de arquivos ZIP exportados do Instagram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstagramUploader onFileProcessed={handleFileProcessed} />
            
            {processedSummaries.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Arquivos Processados:</h4>
                <div className="space-y-2">
                  {processedSummaries.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFileId === file.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.users} usuários • {file.conversations} conversas
                          </p>
                        </div>
                        <Badge 
                          variant={file.status === 'completed' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {file.status === 'completed' ? 'Completo' : 
                           file.status === 'processing' ? 'Processando' : 'Erro'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Análise de Dados</CardTitle>
            <CardDescription>
              Visualize e analise os dados processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-13 gap-1">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="warnings">⚠️ Avisos</TabsTrigger>
                  <TabsTrigger value="params">Parâmetros</TabsTrigger>
                  <TabsTrigger value="chats">Conversas</TabsTrigger>
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="devices">Dispositivos</TabsTrigger>
                  <TabsTrigger value="ips">IPs</TabsTrigger>
                  <TabsTrigger value="followers">Seguidores</TabsTrigger>
                  <TabsTrigger value="ncmec">NCMEC</TabsTrigger>
                  <TabsTrigger value="disappearing">Efêmeras</TabsTrigger>
                  <TabsTrigger value="search">Buscar</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                  <TabsTrigger value="report">Relatório</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <InstagramViewer fileData={{
                    id: selectedFile.id,
                    filename: selectedFile.metadata.originalFilename,
                    users: selectedFile.users.length,
                    conversations: selectedFile.conversations.length,
                    media: selectedFile.media.length,
                    processedAt: selectedFile.metadata.processedAt.toISOString(),
                    status: 'completed' as const
                  }} />
                </TabsContent>
                
                <TabsContent value="warnings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Status das Seções</CardTitle>
                      <CardDescription>
                        Seções disponíveis e não encontradas no arquivo processado
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                          <Badge variant="default" className="bg-green-600">✅ Disponíveis</Badge>
                        </h3>
                        <ul className="space-y-2">
                          {selectedFile.metadata.availableSections?.map((section, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>{section}</span>
                            </li>
                          ))}
                          {(!selectedFile.metadata.availableSections || selectedFile.metadata.availableSections.length === 0) && (
                            <li className="text-sm text-muted-foreground">Nenhuma seção disponível</li>
                          )}
                        </ul>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">⚠️ Não Encontradas</Badge>
                        </h3>
                        <ul className="space-y-2">
                          {selectedFile.metadata.warnings?.map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-orange-600 mt-0.5">⚠</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                          {(!selectedFile.metadata.warnings || selectedFile.metadata.warnings.length === 0) && (
                            <li className="text-sm text-muted-foreground">Nenhum aviso</li>
                          )}
                        </ul>
                      </div>
                      
                      <Separator />
                      
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">📋 Resumo</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total de conversas:</span>
                            <span className="ml-2 font-semibold">{selectedFile.conversations.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total de mídias:</span>
                            <span className="ml-2 font-semibold">{selectedFile.media.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usuários identificados:</span>
                            <span className="ml-2 font-semibold">{selectedFile.users.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mensagens totais:</span>
                            <span className="ml-2 font-semibold">
                              {selectedFile.conversations.reduce((sum, c) => sum + c.messageCount, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="params">
                  <InstagramRequestParams data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="chats">
                  <InstagramChats data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="profile">
                  <InstagramProfile data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="devices">
                  <InstagramDevices data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="ips">
                  <InstagramIPs data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="followers">
                  <InstagramFollowers data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="ncmec">
                  <InstagramNCMEC data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="disappearing">
                  <InstagramDisappearingMessages data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="search">
                  <InstagramSearch fileData={{
                    id: selectedFile.id,
                    filename: selectedFile.metadata.originalFilename,
                    users: selectedFile.users.length,
                    conversations: selectedFile.conversations.length,
                    media: selectedFile.media.length,
                    processedAt: selectedFile.metadata.processedAt.toISOString(),
                    status: 'completed' as const
                  }} />
                </TabsContent>
                
                <TabsContent value="media">
                  <InstagramMedia data={selectedFile} />
                </TabsContent>

                <TabsContent value="report">
                  <InstagramReport data={selectedFile} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum arquivo selecionado</h3>
                <p className="text-muted-foreground">
                  Faça upload de um arquivo ZIP para começar a análise
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstagramAnalysis;