import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  UserMinus,
  Search,
  TrendingUp,
  TrendingDown,
  Heart,
  ArrowLeftRight,
  Calendar,
  Filter
} from 'lucide-react';
import { ProcessedInstagramData } from '@/services/instagramParserService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface InstagramFollowersProps {
  data: ProcessedInstagramData;
}

interface FollowRelationship {
  username: string;
  displayName?: string;
  followDate?: Date;
  unfollowDate?: Date;
  isMutual: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  interactionScore: number;
}

export const InstagramFollowers: React.FC<InstagramFollowersProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mutual' | 'following' | 'followers'>('all');

  // Processar dados de seguidores e seguindo
  const followData = useMemo((): FollowRelationship[] => {
    const relationshipMap = new Map<string, FollowRelationship>();

    // Processar lista de following
    data.following.forEach(followUser => {
      const key = followUser.username;
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          username: followUser.username,
          displayName: followUser.displayName,
          followDate: followUser.timestamp,
          isMutual: false,
          isFollowing: true,
          isFollower: false,
          interactionScore: 0
        });
      } else {
        const existing = relationshipMap.get(key)!;
        existing.isFollowing = true;
        existing.followDate = followUser.timestamp;
        existing.displayName = existing.displayName || followUser.displayName;
      }
    });

    // Processar lista de followers
    data.followers.forEach(follower => {
      const key = follower.username;
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          username: follower.username,
          displayName: follower.displayName,
          followDate: follower.timestamp,
          isMutual: false,
          isFollowing: false,
          isFollower: true,
          interactionScore: 0
        });
      } else {
        const existing = relationshipMap.get(key)!;
        existing.isFollower = true;
        if (!existing.followDate) {
          existing.followDate = follower.timestamp;
        }
        existing.displayName = existing.displayName || follower.displayName;
      }
    });

    // Calcular relacionamentos mútuos e scores de interação
    const relationships = Array.from(relationshipMap.values());
    relationships.forEach(rel => {
      rel.isMutual = rel.isFollowing && rel.isFollower;
      
      // Calcular score de interação baseado em conversas
      rel.interactionScore = data.conversations.reduce((score, conv) => {
        if (conv.participants.includes(rel.username)) {
          const userMessages = conv.messages.filter(msg => msg.sender === rel.username).length;
          return score + userMessages;
        }
        return score;
      }, 0);
    });

    return relationships.sort((a, b) => {
      // Priorizar relacionamentos mútuos, depois por score de interação
      if (a.isMutual !== b.isMutual) {
        return a.isMutual ? -1 : 1;
      }
      return b.interactionScore - a.interactionScore;
    });
  }, [data]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalFollowing = followData.filter(f => f.isFollowing).length;
    const totalFollowers = followData.filter(f => f.isFollower).length;
    const mutualFollows = followData.filter(f => f.isMutual).length;
    const onlyFollowing = followData.filter(f => f.isFollowing && !f.isFollower).length;
    const onlyFollowers = followData.filter(f => f.isFollower && !f.isFollowing).length;
    
    // Crescimento recente (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentFollowing = followData.filter(f => 
      f.isFollowing && f.followDate && f.followDate > thirtyDaysAgo
    ).length;
    
    const recentFollowers = followData.filter(f => 
      f.isFollower && f.followDate && f.followDate > thirtyDaysAgo
    ).length;

    return {
      totalFollowing,
      totalFollowers,
      mutualFollows,
      onlyFollowing,
      onlyFollowers,
      recentFollowing,
      recentFollowers,
      engagementRate: mutualFollows / Math.max(totalFollowing, 1) * 100
    };
  }, [followData]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    let filtered = followData;

    // Aplicar filtro de tipo
    switch (selectedFilter) {
      case 'mutual':
        filtered = filtered.filter(f => f.isMutual);
        break;
      case 'following':
        filtered = filtered.filter(f => f.isFollowing && !f.isFollower);
        break;
      case 'followers':
        filtered = filtered.filter(f => f.isFollower && !f.isFollowing);
        break;
      default:
        // 'all' - não filtrar
        break;
    }

    // Aplicar filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(f => 
        f.username.toLowerCase().includes(searchLower) ||
        f.displayName?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [followData, selectedFilter, searchTerm]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Data não disponível';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getRelationshipBadge = (rel: FollowRelationship) => {
    if (rel.isMutual) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <ArrowLeftRight className="h-3 w-3 mr-1" />
          Mútuo
        </Badge>
      );
    } else if (rel.isFollowing) {
      return (
        <Badge variant="outline">
          <UserPlus className="h-3 w-3 mr-1" />
          Seguindo
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <UserMinus className="h-3 w-3 mr-1" />
          Seguidor
        </Badge>
      );
    }
  };

  const getInteractionBadge = (score: number) => {
    if (score > 50) {
      return <Badge variant="default">Alta Interação</Badge>;
    } else if (score > 10) {
      return <Badge variant="secondary">Média Interação</Badge>;
    } else if (score > 0) {
      return <Badge variant="outline">Baixa Interação</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seguindo</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFollowing}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentFollowing} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seguidores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFollowers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentFollowers} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mútuos</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.mutualFollows}</div>
            <p className="text-xs text-muted-foreground">
              {stats.engagementRate.toFixed(1)}% de engajamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalFollowing > 0 ? (stats.totalFollowers / stats.totalFollowing).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Seguidores por Seguindo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar e Filtrar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Input
              placeholder="Buscar por username ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                <Filter className="h-4 w-4 mr-1" />
                Todos ({followData.length})
              </Button>
              <Button
                variant={selectedFilter === 'mutual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('mutual')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                Mútuos ({stats.mutualFollows})
              </Button>
              <Button
                variant={selectedFilter === 'following' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('following')}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Seguindo ({stats.onlyFollowing})
              </Button>
              <Button
                variant={selectedFilter === 'followers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('followers')}
              >
                <Users className="h-4 w-4 mr-1" />
                Seguidores ({stats.onlyFollowers})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de relacionamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relacionamentos ({filteredData.length})
          </CardTitle>
          <CardDescription>
            Lista completa de seguidores e pessoas seguidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((rel, index) => (
              <div
                key={`${rel.username}-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={data.users.find(u => u.username === rel.username)?.profilePicture} />
                    <AvatarFallback className="bg-primary/10">
                      {(rel.displayName || rel.username).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium">@{rel.username}</h4>
                      {getRelationshipBadge(rel)}
                      {getInteractionBadge(rel.interactionScore)}
                    </div>
                    
                    {rel.displayName && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {rel.displayName}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {rel.followDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(rel.followDate)}
                        </div>
                      )}
                      
                      {rel.interactionScore > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {rel.interactionScore} mensagens
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    #{index + 1}
                  </div>
                  {rel.isMutual && (
                    <div className="text-xs text-green-600">
                      Amigo próximo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum relacionamento encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente uma busca diferente' : 'Nenhum seguidor ou seguindo detectado nos dados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise de Crescimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análise de Crescimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Top Interações</h4>
              <div className="space-y-2">
                {followData
                  .filter(f => f.interactionScore > 0)
                  .sort((a, b) => b.interactionScore - a.interactionScore)
                  .slice(0, 5)
                  .map((rel, index) => (
                    <div key={`interaction-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <span className="text-sm font-medium">@{rel.username}</span>
                        {rel.isMutual && <ArrowLeftRight className="h-3 w-3 text-green-600" />}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rel.interactionScore} mensagens
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Relacionamentos Mútuos Recentes</h4>
              <div className="space-y-2">
                {followData
                  .filter(f => f.isMutual && f.followDate)
                  .sort((a, b) => (b.followDate?.getTime() || 0) - (a.followDate?.getTime() || 0))
                  .slice(0, 5)
                  .map((rel, index) => (
                    <div key={`mutual-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <span className="text-sm font-medium">@{rel.username}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(rel.followDate)}
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