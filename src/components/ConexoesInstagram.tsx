import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  MessageSquare, 
  Network,
  Download,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react';
import { ProcessedInstagramData } from '@/services/instagramParserService';
import { LinkGraph, LinkNode, LinkEdge } from '@/services/linkAnalysisService';

interface ConexoesInstagramProps {
  data: ProcessedInstagramData;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'conversation';
  properties?: {
    messageCount?: number;
    lastActivity?: string;
    conversations?: number;
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'message' | 'participation';
  properties?: {
    count?: number;
    weight?: number;
    lastInteraction?: string;
  };
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const ConexoesInstagram: React.FC<ConexoesInstagramProps> = ({ data }) => {
  const [showConversations, setShowConversations] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  const graphData = useMemo((): GraphData => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const userMessageCounts = new Map<string, number>();
    const userInteractions = new Map<string, Map<string, number>>();

    // Processar usuários e contar mensagens
    data.users.forEach(user => {
      const messageCount = data.conversations.reduce((count, conv) => {
        return count + conv.messages.filter(msg => msg.sender === user.username).length;
      }, 0);

      userMessageCounts.set(user.username, messageCount);

      nodes.push({
        id: user.id,
        label: user.displayName || user.username,
        type: 'user',
        properties: {
          messageCount,
          conversations: user.conversations.length,
          lastActivity: data.conversations
            .filter(conv => conv.participants.includes(user.username))
            .reduce((latest, conv) => {
              const userLastMessage = conv.messages
                .filter(msg => msg.sender === user.username)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              
              if (!userLastMessage) return latest;
              
              const messageTime = new Date(userLastMessage.timestamp).getTime();
              return !latest || messageTime > new Date(latest).getTime() 
                ? userLastMessage.timestamp.toISOString() 
                : latest;
            }, null as string | null) || undefined
        }
      });
    });

    // Processar conversas se necessário
    if (showConversations) {
      data.conversations.forEach(conv => {
        if (conv.participants.length > 1) {
          nodes.push({
            id: conv.id,
            label: conv.title || `Conversa ${conv.participants.length}P`,
            type: 'conversation',
            properties: {
              messageCount: conv.messages.length
            }
          });

          // Conectar participantes à conversa
          conv.participants.forEach(participant => {
            const userNode = nodes.find(n => n.type === 'user' && n.label === participant);
            if (userNode) {
              edges.push({
                id: `${userNode.id}-${conv.id}`,
                source: userNode.id,
                target: conv.id,
                type: 'participation',
                properties: {
                  count: conv.messages.filter(msg => msg.sender === participant).length
                }
              });
            }
          });
        }
      });
    }

    // Processar interações diretas entre usuários
    data.conversations.forEach(conv => {
      if (conv.participants.length === 2) {
        const [user1, user2] = conv.participants;
        const user1Node = nodes.find(n => n.type === 'user' && n.label === user1);
        const user2Node = nodes.find(n => n.type === 'user' && n.label === user2);
        
        if (user1Node && user2Node) {
          const messageCount = conv.messages.length;
          const lastMessage = conv.messages.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0];

          edges.push({
            id: `${user1Node.id}-${user2Node.id}`,
            source: user1Node.id,
            target: user2Node.id,
            type: 'message',
            properties: {
              count: messageCount,
              weight: Math.min(messageCount / 10, 10), // Normalizar peso para visualização
              lastInteraction: lastMessage?.timestamp.toISOString()
            }
          });
        }
      } else if (conv.participants.length > 2 && !showConversations) {
        // Para conversas em grupo sem nós de conversa, conectar todos os pares
        for (let i = 0; i < conv.participants.length; i++) {
          for (let j = i + 1; j < conv.participants.length; j++) {
            const user1 = conv.participants[i];
            const user2 = conv.participants[j];
            const user1Node = nodes.find(n => n.type === 'user' && n.label === user1);
            const user2Node = nodes.find(n => n.type === 'user' && n.label === user2);
            
            if (user1Node && user2Node) {
              const existingEdge = edges.find(e => 
                (e.source === user1Node.id && e.target === user2Node.id) ||
                (e.source === user2Node.id && e.target === user1Node.id)
              );
              
              if (!existingEdge) {
                const sharedMessages = conv.messages.length;
                edges.push({
                  id: `${user1Node.id}-${user2Node.id}`,
                  source: user1Node.id,
                  target: user2Node.id,
                  type: 'message',
                  properties: {
                    count: sharedMessages,
                    weight: Math.min(sharedMessages / 20, 5)
                  }
                });
              }
            }
          }
        }
      }
    });

    return { nodes, edges };
  }, [data, showConversations]);

  const statistics = useMemo(() => {
    const totalUsers = data.users.length;
    const totalConversations = data.conversations.length;
    const totalMessages = data.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const avgMessagesPerConv = totalMessages / totalConversations;
    
    const userActivity = data.users.map(user => {
      const messageCount = data.conversations.reduce((count, conv) => {
        return count + conv.messages.filter(msg => msg.sender === user.username).length;
      }, 0);
      return { user: user.username, messages: messageCount };
    }).sort((a, b) => b.messages - a.messages);

    const mostActiveUser = userActivity[0];
    
    // Calcular conexões por usuário baseado em conversas
    const userConnections = new Map<string, Set<string>>();
    data.conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (!userConnections.has(participant)) {
          userConnections.set(participant, new Set());
        }
        conv.participants.forEach(other => {
          if (other !== participant) {
            userConnections.get(participant)!.add(other);
          }
        });
      });
    });

    // Incluir conexões de seguidores/seguindo
    const mainUser = data.profile?.username || data.users.find(u => u.isMainUser)?.username || 'main_user';
    data.following.forEach(follow => {
      if (!userConnections.has(mainUser)) {
        userConnections.set(mainUser, new Set());
      }
      userConnections.get(mainUser)!.add(follow.username);
    });

    data.followers.forEach(follower => {
      if (!userConnections.has(follower.username)) {
        userConnections.set(follower.username, new Set());
      }
      userConnections.get(follower.username)!.add(mainUser);
    });

    const avgConnections = userConnections.size > 0 ? 
      Array.from(userConnections.values()).reduce((sum, set) => sum + set.size, 0) / userConnections.size : 0;

    return {
      totalUsers,
      totalConversations,
      totalMessages,
      avgMessagesPerConv: Math.round(avgMessagesPerConv),
      mostActiveUser,
      avgConnections: Math.round(avgConnections),
      networkDensity: (graphData.edges.length / (totalUsers * (totalUsers - 1) / 2)) * 100
    };
  }, [data, graphData]);

  const handleExportGraph = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `instagram_network_${data.metadata.originalFilename}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.avgConnections} conexões/usuário
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.avgMessagesPerConv} msgs/conversa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Densidade da Rede</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.networkDensity.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Conectividade geral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Ativo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{statistics.mostActiveUser?.user || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.mostActiveUser?.messages || 0} mensagens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles do Grafo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Mapa de Conexões
          </CardTitle>
          <CardDescription>
            Visualização interativa das conexões entre usuários do Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-conversations"
                  checked={showConversations}
                  onCheckedChange={setShowConversations}
                />
                <Label htmlFor="show-conversations">Mostrar conversas como nós</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-labels"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <Label htmlFor="show-labels">Mostrar rótulos</Label>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportGraph}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Grafo
              </Button>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Análise Avançada
              </Button>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Usuário</span>
            </div>
            {showConversations && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-secondary"></div>
                <span>Conversa</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-muted-foreground"></div>
              <span>Conexão (espessura = intensidade)</span>
            </div>
          </div>

          {/* Grafo */}
          <div className="border rounded-lg h-96">
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Grafo de conexões será exibido aqui</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Insights da Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Usuários com Mais Interações</h4>
              <div className="space-y-2">
                {data.users
                  .map(user => {
                    const messageCount = data.conversations.reduce((count, conv) => {
                      return count + conv.messages.filter(msg => msg.sender === user.username).length;
                    }, 0);
                    const conversationCount = data.conversations.filter(conv => 
                      conv.participants.includes(user.username)
                    ).length;
                    
                    return {
                      user: user.username,
                      messages: messageCount,
                      conversations: conversationCount,
                      score: messageCount + (conversationCount * 2)
                    };
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((user, index) => (
                     <div key={`user-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <span className="text-sm font-medium">{user.user}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-sm font-medium">{user.messages} msgs</div>
                        <div className="text-muted-foreground">{user.conversations} conversas</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Conversas Mais Ativas</h4>
              <div className="space-y-2">
                {data.conversations
                  .sort((a, b) => b.messages.length - a.messages.length)
                  .slice(0, 5)
                  .map((conv, index) => (
                    <div key={conv.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <span className="text-sm font-medium truncate">
                          {conv.title || `${conv.participants.join(', ')}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{conv.messages.length} msgs</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(conv.lastActivity).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};