import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, MessageSquare, Calendar, Filter, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProcessedData {
  id: string;
  filename: string;
  users: number;
  conversations: number;
  media: number;
  processedAt: string;
  status: 'processing' | 'completed' | 'error';
}

interface InstagramSearchProps {
  fileData: ProcessedData;
}

export const InstagramSearch: React.FC<InstagramSearchProps> = ({ fileData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      // Simular busca
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Resultados simulados
      const mockResults = [
        {
          type: 'message',
          id: '1',
          content: `Mensagem contendo "${searchTerm}"`,
          sender: 'usuario1',
          timestamp: '2024-01-15T10:30:00Z',
          conversation: 'Conversa com João'
        },
        {
          type: 'user',
          id: '2',
          username: searchTerm.toLowerCase(),
          displayName: searchTerm,
          messageCount: 45,
          conversationCount: 3
        },
        {
          type: 'media',
          id: '3',
          filename: `foto_${searchTerm}.jpg`,
          mediaType: 'image',
          messageId: 'msg_123',
          timestamp: '2024-01-10T15:20:00Z'
        }
      ];
      
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Interface de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar nos Dados
          </CardTitle>
          <CardDescription>
            Pesquise por usuários, mensagens, palavras-chave ou conteúdo de mídia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Digite sua busca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchTerm.trim() || isSearching}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="messages">Mensagens</SelectItem>
                <SelectItem value="users">Usuários</SelectItem>
                <SelectItem value="media">Mídia</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Busca */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados da Busca</CardTitle>
                <CardDescription>
                  {searchResults.length} resultado(s) encontrado(s) para "{searchTerm}"
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos ({searchResults.length})</TabsTrigger>
                <TabsTrigger value="messages">
                  Mensagens ({searchResults.filter(r => r.type === 'message').length})
                </TabsTrigger>
                <TabsTrigger value="users">
                  Usuários ({searchResults.filter(r => r.type === 'user').length})
                </TabsTrigger>
                <TabsTrigger value="media">
                  Mídia ({searchResults.filter(r => r.type === 'media').length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {searchResults.map((result) => (
                      <SearchResultItem key={result.id} result={result} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="messages" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {searchResults
                      .filter(r => r.type === 'message')
                      .map((result) => (
                        <SearchResultItem key={result.id} result={result} />
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="users" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {searchResults
                      .filter(r => r.type === 'user')
                      .map((result) => (
                        <SearchResultItem key={result.id} result={result} />
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="media" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {searchResults
                      .filter(r => r.type === 'media')
                      .map((result) => (
                        <SearchResultItem key={result.id} result={result} />
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Análise de Vínculos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análise de Vínculos
          </CardTitle>
          <CardDescription>
            Encontre conexões entre usuários e identifique padrões de comunicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Usuários Mais Ativos</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario1</span>
                  <Badge variant="secondary">142 mensagens</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario2</span>
                  <Badge variant="secondary">98 mensagens</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario3</span>
                  <Badge variant="secondary">76 mensagens</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Conexões Frequentes</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario1 ↔ @usuario2</span>
                  <Badge variant="secondary">45 trocas</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario1 ↔ @usuario3</span>
                  <Badge variant="secondary">32 trocas</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">@usuario2 ↔ @usuario4</span>
                  <Badge variant="secondary">28 trocas</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button className="w-full" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Gerar Mapa de Conexões Completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SearchResultItem: React.FC<{ result: any }> = ({ result }) => {
  const getIcon = () => {
    switch (result.type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'media':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = () => {
    switch (result.type) {
      case 'message':
        return 'default';
      case 'user':
        return 'secondary';
      case 'media':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {result.type === 'message' && (
              <>
                <p className="text-sm font-medium truncate">
                  {result.conversation}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Por {result.sender} • {new Date(result.timestamp).toLocaleString('pt-BR')}
                </p>
              </>
            )}
            
            {result.type === 'user' && (
              <>
                <p className="text-sm font-medium">
                  {result.displayName} (@{result.username})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.messageCount} mensagens em {result.conversationCount} conversas
                </p>
              </>
            )}
            
            {result.type === 'media' && (
              <>
                <p className="text-sm font-medium truncate">
                  {result.filename}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.type} • {new Date(result.timestamp).toLocaleString('pt-BR')}
                </p>
              </>
            )}
          </div>
          <Badge variant={getBadgeVariant() as "default" | "secondary" | "outline"}>
            {result.type === 'message' ? 'Mensagem' :
             result.type === 'user' ? 'Usuário' : 'Mídia'}
          </Badge>
        </div>
      </div>
    </div>
  );
};