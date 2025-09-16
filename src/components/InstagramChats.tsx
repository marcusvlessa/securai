import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  MessageSquare, 
  Users, 
  Clock, 
  Image, 
  Video, 
  Volume2,
  Play,
  Download,
  Mic,
  Brain,
  Filter
} from 'lucide-react';
import { ProcessedInstagramData, InstagramConversation, InstagramMessage } from '@/services/instagramParserService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InstagramChatsProps {
  data: ProcessedInstagramData;
}

export const InstagramChats: React.FC<InstagramChatsProps> = ({ data }) => {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'media'>('all');

  const filteredConversations = useMemo(() => {
    return data.conversations.filter(conv => {
      const matchesSearch = !searchTerm || 
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
        conv.messages.some(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterType === 'all' || 
        (filterType === 'media' && conv.messages.some(m => m.type !== 'text')) ||
        (filterType === 'text' && conv.messages.every(m => m.type === 'text'));
      
      return matchesSearch && matchesFilter;
    });
  }, [data.conversations, searchTerm, filterType]);

  const handleTranscribeAudio = async (message: InstagramMessage) => {
    if (!message.mediaPath || message.type !== 'audio') return;
    
    try {
      // Encontrar o blob da mídia
      const mediaItem = data.media.find(m => 
        m.path.includes(message.mediaPath!) || m.filename.includes(message.mediaPath!)
      );
      
      if (!mediaItem) {
        toast({
          title: "Mídia não encontrada",
          description: "Não foi possível encontrar o arquivo de áudio",
          variant: "destructive"
        });
        return;
      }

      // Converter blob para base64
      const arrayBuffer = await mediaItem.blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  // Enhanced transcription with response format
  const { data: transcriptionResult, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
    body: {
      audioData: base64Audio,
      groqApiKey: localStorage.getItem('groq_api_key') || ''
    }
  });

  if (transcriptionError) {
    console.error('Transcription error:', transcriptionError);
    return null;
  }

  return transcriptionResult?.text || null;

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio",
        variant: "destructive"
      });
    }
  };

  const handleClassifyImage = async (message: InstagramMessage) => {
    if (!message.mediaPath || message.type !== 'image') return;
    
    try {
      const mediaItem = data.media.find(m => 
        m.path.includes(message.mediaPath!) || m.filename.includes(message.mediaPath!)
      );
      
      if (!mediaItem) {
        toast({
          title: "Mídia não encontrada",
          description: "Não foi possível encontrar o arquivo de imagem",
          variant: "destructive"
        });
        return;
      }

      const arrayBuffer = await mediaItem.blob.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data: result, error } = await supabase.functions.invoke('classify-image', {
        body: {
          imageBase64: base64Image,
          groqApiKey: localStorage.getItem('groq_api_key') || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Classificação concluída",
        description: result.classification || "Imagem classificada com sucesso"
      });

    } catch (error) {
      console.error('Classification error:', error);
      toast({
        title: "Erro na classificação", 
        description: "Não foi possível classificar a imagem",
        variant: "destructive"
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-[600px] border rounded-lg">
      {/* Lista de conversas */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">Conversas</h3>
            <Badge variant="secondary">{filteredConversations.length}</Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todas
            </Button>
            <Button
              variant={filterType === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('text')}
            >
              Texto
            </Button>
            <Button
              variant={filterType === 'media' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('media')}
            >
              Mídia
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-[calc(600px-120px)]">
          <div className="p-2 space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex -space-x-1">
                    {conversation.participants.slice(0, 2).map((participant, idx) => (
                      <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback>{getUserInitials(participant)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {conversation.title || conversation.participants.join(', ')}
                      </p>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {conversation.participants.length}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {conversation.messages.length} mensagens
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.lastActivity)}
                      </span>
                      
                      {conversation.messages.some(m => m.type !== 'text') && (
                        <div className="flex gap-1">
                          {conversation.messages.some(m => m.type === 'image') && getMediaIcon('image')}
                          {conversation.messages.some(m => m.type === 'video') && getMediaIcon('video')}
                          {conversation.messages.some(m => m.type === 'audio') && getMediaIcon('audio')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.title || selectedConversation.participants.join(', ')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.participants.length} participantes • {selectedConversation.messages.length} mensagens
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getUserInitials(message.sender)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{message.sender}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.type !== 'text' && (
                          <Badge variant="outline" className="text-xs">
                            {getMediaIcon(message.type)}
                            {message.type}
                          </Badge>
                        )}
                      </div>
                      
                      {message.content && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {message.mediaPath && (
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getMediaIcon(message.type)}
                              <span className="text-sm font-medium">
                                {message.mediaPath}
                              </span>
                            </div>
                            
                            <div className="flex gap-1">
                              {message.type === 'audio' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTranscribeAudio(message)}
                                >
                                  <Mic className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {message.type === 'image' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClassifyImage(message)}
                                >
                                  <Brain className="h-3 w-3" />
                                </Button>
                              )}
                              
                              <Button variant="outline" size="sm">
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-muted-foreground">
                Escolha uma conversa da lista para ver as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};