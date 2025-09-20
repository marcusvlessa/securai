import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Filter,
  MoreVertical,
  Phone,
  VideoIcon,
  Send
} from 'lucide-react';
import { ProcessedInstagramData, InstagramConversation, InstagramMessage } from '@/services/instagramParserService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MediaViewer } from './MediaViewer';

interface InstagramChatsProps {
  data: ProcessedInstagramData;
}

export const InstagramChats: React.FC<InstagramChatsProps> = ({ data }) => {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'media'>('all');

  // Get main user (profile owner) - check both username and display name
  const mainUser = data.profile?.username || data.profile?.displayName || 'user';
  const mainUserDisplay = data.profile?.displayName || data.profile?.username || 'Usuário Principal';

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
    if (!message.mediaPath || message.type !== 'audio') return null;
    
    try {
      const mediaItem = data.media.find(m => 
        m.filename === message.mediaPath || 
        m.filename.includes(message.mediaPath!) ||
        message.mediaPath!.includes(m.filename)
      );
      
      if (!mediaItem || !mediaItem.blob) {
        toast({
          title: "Mídia não encontrada",
          description: "Não foi possível encontrar o arquivo de áudio",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Transcrevendo áudio...",
        description: "Aguarde enquanto processamos o áudio"
      });

      const arrayBuffer = await mediaItem.blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data: transcriptionResult, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioData: base64Audio,
          groqApiKey: localStorage.getItem('groq_api_key') || ''
        }
      });

      if (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        toast({
          title: "Erro na transcrição",
          description: "Não foi possível transcrever o áudio",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Transcrição concluída",
        description: "Áudio transcrito com sucesso"
      });

      return transcriptionResult?.text || null;

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleClassifyImage = async (message: InstagramMessage) => {
    if (!message.mediaPath || message.type !== 'image') return;
    
    try {
      const mediaItem = data.media.find(m => 
        m.filename === message.mediaPath || 
        m.filename.includes(message.mediaPath!) ||
        message.mediaPath!.includes(m.filename)
      );
      
      if (!mediaItem || !mediaItem.blob) {
        toast({
          title: "Mídia não encontrada",
          description: "Não foi possível encontrar o arquivo de imagem",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Classificando imagem...",
        description: "Aguarde enquanto analisamos a imagem"
      });

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
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getDisplayNameForUser = (username: string): string => {
    // Primeiro buscar nos dados processados do usuário
    const userData = data.users.find(u => u.username === username);
    if (userData?.displayName) {
      return userData.displayName;
    }
    
    // Mapeamento expandido e atualizado
    const userMappings: Record<string, string> = {
      '73mb_': 'Marcelo Brandão',
      'meryfelix17': 'Mery Felix',
      'ericknunes7': 'Erick Nunes (ALEMÃO)',
      'jgmeira0': 'João Meira (Jão)',
      'carollebolsas': 'Carole Bolsas',
      'diegocruz2683': 'Diego Cruz',
      'rafa.ramosm': 'Rafael Ramos',
      'aninhaavelino': 'Ana Avelino',
      'user1': 'Usuário 1',
      'user2': 'Usuário 2'
    };
    
    return userMappings[username] || username.charAt(0).toUpperCase() + username.slice(1).replace(/[._]/g, ' ');
  };

  const getUserAvatar = (username: string): string | undefined => {
    const userData = data.users.find(u => u.username === username);
    return userData?.profilePicture;
  };

  const getUserInitials = (username: string) => {
    if (!username) return 'U';
    
    const displayName = getDisplayNameForUser(username);
    
    // For display names with spaces, use first letter of each word
    if (displayName.includes(' ')) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    // For usernames, use first 2 characters
    return displayName.substring(0, 2).toUpperCase();
  };

  const getUserColor = (username: string) => {
    const colors = [
      'bg-gradient-to-br from-red-500 to-red-600', 
      'bg-gradient-to-br from-blue-500 to-blue-600', 
      'bg-gradient-to-br from-green-500 to-green-600', 
      'bg-gradient-to-br from-yellow-500 to-yellow-600', 
      'bg-gradient-to-br from-purple-500 to-purple-600', 
      'bg-gradient-to-br from-pink-500 to-pink-600', 
      'bg-gradient-to-br from-indigo-500 to-indigo-600', 
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const isMessageFromMainUser = (sender: string) => {
    return sender === mainUser || 
           sender === data.profile?.displayName || 
           sender === data.profile?.username ||
           sender.toLowerCase().includes('marcelo') ||
           sender.toLowerCase().includes('73mb_');
  };

  const getMediaPreview = (message: InstagramMessage) => {
    if (!message.mediaPath) return null;
    
    const mediaItem = data.media.find(m => 
      m.filename === message.mediaPath || 
      m.filename.includes(message.mediaPath!) ||
      message.mediaPath!.includes(m.filename)
    );
    
    if (!mediaItem) return null;
    
    return {
      ...mediaItem,
      id: message.mediaPath,
      type: message.type,
      filename: message.mediaPath,
      timestamp: message.timestamp
    };
  };

  return (
    <div className="flex h-[700px] border rounded-lg bg-background">
      {/* Lista de conversas - Estilo WhatsApp */}
      <div className="w-1/3 border-r bg-muted/30">
        {/* Header da lista */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Conversas</h3>
              <Badge variant="secondary">{filteredConversations.length}</Badge>
            </div>
          </div>
          
          {/* Busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-10 bg-muted/50 border-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros */}
          <div className="flex gap-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="flex-1"
            >
              Todas
            </Button>
            <Button
              variant={filterType === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('text')}
              className="flex-1"
            >
              Texto
            </Button>
            <Button
              variant={filterType === 'media' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('media')}
              className="flex-1"
            >
              Mídia
            </Button>
          </div>
        </div>

        {/* Lista de conversas */}
        <ScrollArea className="flex-1 h-[calc(700px-180px)]">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-primary/10 border border-primary/20'
                    : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar do chat */}
                  <div className="relative">
                    {conversation.participants.length === 1 ? (
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={getUserColor(conversation.participants[0])}>
                          {getUserInitials(conversation.participants[0])}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex -space-x-2">
                        {conversation.participants.slice(0, 2).map((participant, idx) => (
                          <Avatar key={idx} className="h-10 w-10 border-2 border-background">
                            <AvatarFallback className={getUserColor(participant)}>
                              {getUserInitials(participant)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Nome do chat */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {conversation.participants.filter(p => !isMessageFromMainUser(p)).map(p => getDisplayNameForUser(p)).join(', ') || 'Mensagens pessoais'}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.lastActivity)}
                      </span>
                    </div>
                    
                    {/* Última mensagem */}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {conversation.messages[conversation.messages.length - 1]?.content || 'Mídia'}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        {conversation.messages.some(m => m.type !== 'text') && (
                          <div className="flex gap-1 opacity-60">
                            {conversation.messages.some(m => m.type === 'image') && getMediaIcon('image')}
                            {conversation.messages.some(m => m.type === 'video') && getMediaIcon('video')}
                            {conversation.messages.some(m => m.type === 'audio') && getMediaIcon('audio')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Estatísticas */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation.messages.length} msgs
                      </Badge>
                      {conversation.mediaCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {conversation.mediaCount} mídia
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área de mensagens - Estilo Instagram/WhatsApp */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Header do chat */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={getUserColor(selectedConversation.participants[0])}>
                      {getUserInitials(selectedConversation.participants[0])}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation.participants.filter(p => !isMessageFromMainUser(p)).map(p => getDisplayNameForUser(p)).join(', ') || 'Mensagens pessoais'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.participants.length} participantes • {selectedConversation.messages.length} mensagens
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <VideoIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>

            {/* Área de mensagens com scroll */}
            <ScrollArea className="flex-1 p-4 bg-muted/20">
              <div className="space-y-4">
                {selectedConversation.messages.map((message, index) => {
                  const isFromMainUser = isMessageFromMainUser(message.sender);
                  const showAvatar = index === 0 || 
                    selectedConversation.messages[index - 1]?.sender !== message.sender;
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex gap-3 ${isFromMainUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`${showAvatar ? 'opacity-100' : 'opacity-0'} flex-shrink-0`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getUserAvatar(message.sender)} />
                          <AvatarFallback className={getUserColor(message.sender)}>
                            {getUserInitials(message.sender)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* Mensagem */}
                      <div className={`flex flex-col max-w-[70%] ${isFromMainUser ? 'items-end' : 'items-start'}`}>
                        {/* Nome do remetente e timestamp */}
                        {showAvatar && (
                          <div className={`flex items-center gap-2 mb-1 ${isFromMainUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-xs font-medium">{getDisplayNameForUser(message.sender)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        )}
                        
                        {/* Bolha da mensagem */}
                        <div className={`
                          rounded-2xl px-4 py-2 max-w-full break-words
                          ${isFromMainUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background border'
                          }
                        `}>
                          {/* Conteúdo de texto */}
                          {message.content && (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          )}
                          
                          {/* Mídia */}
                          {message.mediaPath && (
                            <div className="mt-2">
                              {message.type === 'image' && (
                                <MediaViewer 
                                  media={getMediaPreview(message)}
                                  trigger={
                                    <div className="bg-muted/20 rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                      <div className="flex items-center gap-2">
                                        <Image className="h-4 w-4" />
                                        <span className="text-sm">Imagem: {message.mediaPath}</span>
                                      </div>
                                    </div>
                                  }
                                />
                              )}
                              
                              {message.type === 'video' && (
                                <MediaViewer 
                                  media={getMediaPreview(message)}
                                  trigger={
                                    <div className="bg-muted/20 rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                      <div className="flex items-center gap-2">
                                        <Video className="h-4 w-4" />
                                        <span className="text-sm">Vídeo: {message.mediaPath}</span>
                                      </div>
                                    </div>
                                  }
                                />
                              )}
                              
                              {message.type === 'audio' && (
                                <MediaViewer 
                                  media={getMediaPreview(message)}
                                  trigger={
                                    <div className="bg-muted/20 rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Volume2 className="h-4 w-4" />
                                          <span className="text-sm">Áudio: {message.mediaPath}</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTranscribeAudio(message);
                                          }}
                                        >
                                          <Mic className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Input de mensagem (desabilitado - apenas visual) */}
            <div className="p-4 border-t bg-background">
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Digite uma mensagem..." 
                  disabled 
                  className="flex-1"
                />
                <Button disabled size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Visualização somente leitura - Dados extraídos do Instagram
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-muted-foreground max-w-md">
                Escolha uma conversa da lista para visualizar as mensagens no estilo Instagram/WhatsApp
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  <span>Imagens</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  <span>Vídeos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Volume2 className="h-4 w-4" />
                  <span>Áudios</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};