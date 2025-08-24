import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare, Calendar, Clock, Image, FileText } from 'lucide-react';

interface ProcessedData {
  id: string;
  filename: string;
  users: number;
  conversations: number;
  media: number;
  processedAt: string;
  status: 'processing' | 'completed' | 'error';
}

interface InstagramViewerProps {
  fileData: ProcessedData;
}

export const InstagramViewer: React.FC<InstagramViewerProps> = ({ fileData }) => {
  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Arquivo</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{fileData.filename}</div>
            <p className="text-xs text-muted-foreground">
              Processado em {new Date(fileData.processedAt).toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Status</CardTitle>
            <Badge variant={fileData.status === 'completed' ? 'default' : 'secondary'}>
              {fileData.status === 'completed' ? 'Completo' : 
               fileData.status === 'processing' ? 'Processando' : 'Erro'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {fileData.status === 'completed' ? 'Análise Concluída' : 'Em Processamento'}
            </div>
            <p className="text-xs text-muted-foreground">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Identificados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileData.users}</div>
            <p className="text-xs text-muted-foreground">
              Perfis únicos encontrados
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Com conversas ativas</span>
                <span>{Math.floor(fileData.users * 0.8)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Apenas mencionados</span>
                <span>{fileData.users - Math.floor(fileData.users * 0.8)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileData.conversations}</div>
            <p className="text-xs text-muted-foreground">
              Threads de conversa
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Mensagens individuais</span>
                <span>{Math.floor(fileData.conversations * 0.7)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Grupos</span>
                <span>{fileData.conversations - Math.floor(fileData.conversations * 0.7)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos de Mídia</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileData.media}</div>
            <p className="text-xs text-muted-foreground">
              Imagens, vídeos e áudios
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Imagens</span>
                <span>{Math.floor(fileData.media * 0.6)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Vídeos</span>
                <span>{Math.floor(fileData.media * 0.3)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Áudios</span>
                <span>{Math.floor(fileData.media * 0.1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Simulada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline da Análise
          </CardTitle>
          <CardDescription>
            Cronologia do processamento dos dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Upload concluído</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(fileData.processedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Arquivo ZIP descompactado</p>
                  <p className="text-xs text-muted-foreground">
                    Extraídos {fileData.media} arquivos de mídia
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">HTML parseado com sucesso</p>
                  <p className="text-xs text-muted-foreground">
                    Identificados {fileData.users} usuários e {fileData.conversations} conversas
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Análise finalizada</p>
                  <p className="text-xs text-muted-foreground">
                    Dados organizados e prontos para consulta
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
          <CardDescription>
            Sugestões para continuar a análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Explorar Usuários</p>
                <p className="text-xs text-muted-foreground">
                  Visualizar perfis e conexões
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Buscar Conversas</p>
                <p className="text-xs text-muted-foreground">
                  Encontrar mensagens específicas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Image className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Analisar Mídia</p>
                <p className="text-xs text-muted-foreground">
                  Transcrever áudios e classificar imagens
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Exportar Relatório</p>
                <p className="text-xs text-muted-foreground">
                  Gerar documentos da análise
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};