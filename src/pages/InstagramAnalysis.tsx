import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Users, MessageSquare, Search, Image, Volume2, Download, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { InstagramUploader } from '@/components/InstagramUploader';
import { InstagramViewer } from '@/components/InstagramViewer';
import { InstagramSearch } from '@/components/InstagramSearch';
import { InstagramMedia } from '@/components/InstagramMedia';
import { InstagramChats } from '@/components/InstagramChats';
import { InstagramProfile } from '@/components/InstagramProfile';
import { InstagramDevices } from '@/components/InstagramDevices';
import { ConexoesInstagram } from '@/components/ConexoesInstagram';
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
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="chats">Conversas</TabsTrigger>
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="devices">Dispositivos</TabsTrigger>
                  <TabsTrigger value="search">Buscar</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                  <TabsTrigger value="connections">Conexões</TabsTrigger>
                  <TabsTrigger value="settings">Config</TabsTrigger>
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
                
                <TabsContent value="chats">
                  <InstagramChats data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="profile">
                  <InstagramProfile data={selectedFile} />
                </TabsContent>
                
                <TabsContent value="devices">
                  <InstagramDevices data={selectedFile} />
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
                
                <TabsContent value="connections">
                  <ConexoesInstagram data={selectedFile} />
                </TabsContent>

                <TabsContent value="settings">
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <h3 className="text-lg font-semibold">Configurações GROQ</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure a API GROQ para transcrição de áudio e classificação de imagem
                      </p>
                    </div>
                    <ApiKeyInput />
                  </div>
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