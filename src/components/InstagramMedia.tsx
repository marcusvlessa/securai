import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Image, 
  Video, 
  Volume2, 
  FileText, 
  Play, 
  Pause, 
  Download, 
  Eye, 
  Mic,
  Brain,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { ProcessedInstagramData, InstagramMedia as MediaFile } from '@/services/instagramParserService';
import { supabase } from '@/integrations/supabase/client';

interface MediaItem extends MediaFile {
  size?: number;
  timestamp?: string;  
  transcript?: string;
  classification?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}

interface InstagramMediaProps {
  data: ProcessedInstagramData;
}

export const InstagramMedia: React.FC<InstagramMediaProps> = ({ data }) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [classificationProgress, setClassificationProgress] = useState(0);

  // Converter dados reais para formato local com status de processamento
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    return data.media.map((mediaFile): MediaItem => ({
      ...mediaFile,
      size: mediaFile.blob?.size || 0,
      timestamp: new Date().toISOString(),
      transcript: mediaFile.transcript,
      classification: mediaFile.classification,
      processingStatus: (mediaFile.transcript || mediaFile.classification) ? 'completed' : 'pending'
    }));
  });

  const handleTranscribeAudio = async (itemId: string) => {
    const item = mediaItems.find(m => m.id === itemId);
    if (!item || item.type !== 'audio') return;

    setProcessingItem(itemId);
    setTranscriptionProgress(0);
    
    try {
      // Converter blob para base64
      const arrayBuffer = await item.blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Simular progresso
      const progressInterval = setInterval(() => {
        setTranscriptionProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data: result, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioData: base64Audio,
          groqApiKey: localStorage.getItem('groq_api_key') || ''
        }
      });

      clearInterval(progressInterval);
      setTranscriptionProgress(100);

      if (error) throw error;

      // Atualizar item com transcrição
      setMediaItems(prev => 
        prev.map(mediaItem => 
          mediaItem.id === itemId 
            ? { 
                ...mediaItem, 
                transcript: result.transcript || 'Transcrição não disponível',
                processingStatus: 'completed' as const
              }
            : mediaItem
        )
      );
      
      toast({
        title: "Transcrição concluída",
        description: "O áudio foi transcrito com sucesso",
      });
      
    } catch (error) {
      console.error('Transcription error:', error);
      setMediaItems(prev => 
        prev.map(mediaItem => 
          mediaItem.id === itemId 
            ? { ...mediaItem, processingStatus: 'error' as const }
            : mediaItem
        )
      );
      
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio. Verifique a configuração da API GROQ.",
        variant: "destructive",
      });
    } finally {
      setProcessingItem(null);
      setTranscriptionProgress(0);
    }
  };

  const handleClassifyImage = async (itemId: string) => {
    const item = mediaItems.find(m => m.id === itemId);
    if (!item || item.type !== 'image') return;

    setProcessingItem(itemId);
    setClassificationProgress(0);
    
    try {
      // Converter blob para base64
      const arrayBuffer = await item.blob.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Simular progresso
      const progressInterval = setInterval(() => {
        setClassificationProgress(prev => Math.min(prev + 15, 90));
      }, 150);

      const { data: result, error } = await supabase.functions.invoke('classify-image', {
        body: {
          imageBase64: base64Image,
          groqApiKey: localStorage.getItem('groq_api_key') || ''
        }
      });

      clearInterval(progressInterval);
      setClassificationProgress(100);

      if (error) throw error;
      
      // Atualizar item com classificação
      setMediaItems(prev => 
        prev.map(mediaItem => 
          mediaItem.id === itemId 
            ? { 
                ...mediaItem, 
                classification: result.classification || 'Classificação não disponível',
                processingStatus: 'completed' as const
              }
            : mediaItem
        )
      );
      
      toast({
        title: "Classificação concluída",
        description: "A imagem foi classificada com sucesso",
      });
      
    } catch (error) {
      console.error('Classification error:', error);
      setMediaItems(prev => 
        prev.map(mediaItem => 
          mediaItem.id === itemId 
            ? { ...mediaItem, processingStatus: 'error' as const }
            : mediaItem
        )
      );
      
      toast({
        title: "Erro na classificação",
        description: "Não foi possível classificar a imagem. Verifique a configuração da API GROQ.",
        variant: "destructive",
      });
    } finally {
      setProcessingItem(null);
      setClassificationProgress(0);
    }
  };

  const handleBulkProcess = async () => {
    const pendingItems = mediaItems.filter(item => item.processingStatus === 'pending');
    
    for (const item of pendingItems) {
      if (item.type === 'audio') {
        await handleTranscribeAudio(item.id);
      } else if (item.type === 'image') {
        await handleClassifyImage(item.id);
      }
    }
  };

  const filteredItems = mediaItems.filter(item => {
    if (selectedTab === 'all') return true;
    return item.type === selectedTab;
  });

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Volume2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const pendingCount = mediaItems.filter(item => item.processingStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Estatísticas e Ações */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaItems.length}</div>
            <p className="text-xs text-muted-foreground">Arquivos de mídia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imagens</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediaItems.filter(item => item.type === 'image').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {mediaItems.filter(item => item.type === 'image' && item.classification).length} classificadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áudios</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediaItems.filter(item => item.type === 'audio').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {mediaItems.filter(item => item.type === 'audio' && item.transcript).length} transcritos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vídeos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediaItems.filter(item => item.type === 'video').length}
            </div>
            <p className="text-xs text-muted-foreground">Arquivos de vídeo</p>
          </CardContent>
        </Card>
      </div>

      {/* Processamento em Lote */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Processamento Automático
            </CardTitle>
            <CardDescription>
              {pendingCount} arquivo(s) aguardando processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                onClick={handleBulkProcess}
                disabled={processingItem !== null}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Processar Todos os Arquivos
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Resultados
              </Button>
            </div>
            
            {processingItem && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Processando {mediaItems.find(item => item.id === processingItem)?.filename}...
                </p>
                <Progress 
                  value={transcriptionProgress > 0 ? transcriptionProgress : classificationProgress} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Mídias */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos de Mídia</CardTitle>
          <CardDescription>
            Visualize e processe imagens, vídeos e áudios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({mediaItems.length})</TabsTrigger>
              <TabsTrigger value="image">
                Imagens ({mediaItems.filter(item => item.type === 'image').length})
              </TabsTrigger>
              <TabsTrigger value="video">
                Vídeos ({mediaItems.filter(item => item.type === 'video').length})
              </TabsTrigger>
              <TabsTrigger value="audio">
                Áudios ({mediaItems.filter(item => item.type === 'audio').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <MediaItemCard 
                      key={item.id} 
                      item={item}
                      onTranscribe={handleTranscribeAudio}
                      onClassify={handleClassifyImage}
                      isProcessing={processingItem === item.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface MediaItemCardProps {
  item: MediaItem;
  onTranscribe: (id: string) => void;
  onClassify: (id: string) => void;
  isProcessing: boolean;
}

const MediaItemCard: React.FC<MediaItemCardProps> = ({ 
  item, 
  onTranscribe, 
  onClassify, 
  isProcessing 
}) => {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  const getStatusBadge = () => {
    switch (item.processingStatus) {
      case 'completed':
        return <Badge variant="default">Processado</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Volume2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="mt-1">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{item.filename}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(item.size || 0)} • {item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : 'N/A'}
            </p>
            
            {/* Conteúdo processado */}
            {item.transcript && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <p className="font-medium flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  Transcrição:
                </p>
                <p className="mt-1">{item.transcript}</p>
              </div>
            )}
            
            {item.classification && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <p className="font-medium flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Classificação:
                </p>
                <p className="mt-1">{item.classification}</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge()}
            
            <div className="flex gap-1">
              <Button variant="outline" size="sm">
                <Eye className="h-3 w-3" />
              </Button>
              
              {item.type === 'audio' && !item.transcript && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTranscribe(item.id)}
                  disabled={isProcessing}
                >
                  <Mic className="h-3 w-3" />
                </Button>
              )}
              
              {item.type === 'image' && !item.classification && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onClassify(item.id)}
                  disabled={isProcessing}
                >
                  <Brain className="h-3 w-3" />
                </Button>
              )}
              
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};