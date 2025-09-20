import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  MessageSquare, 
  Image, 
  Video, 
  Globe, 
  Shield, 
  Phone, 
  Mail,
  Calendar,
  MapPin,
  Camera,
  UserPlus,
  UserMinus,
  FileText,
  Lock,
  Settings,
  Activity
} from 'lucide-react';

interface CategoryCount {
  name: string;
  count: number;
  icon: React.ReactNode;
  description: string;
}

interface InstagramNavigationProps {
  categories: Record<string, number>;
  onCategoryClick: (category: string) => void;
  activeCategory?: string;
}

// Mapeamento de categorias para ícones e descrições
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; description: string; group: string }> = {
  // Perfil & Identificação
  name: { icon: <Users className="h-4 w-4" />, description: "Nome real do usuário", group: "Perfil" },
  emails: { icon: <Mail className="h-4 w-4" />, description: "Endereços de email", group: "Perfil" },
  vanity: { icon: <Users className="h-4 w-4" />, description: "Username/handle", group: "Perfil" },
  phone_numbers: { icon: <Phone className="h-4 w-4" />, description: "Números de telefone", group: "Perfil" },
  registration_date: { icon: <Calendar className="h-4 w-4" />, description: "Data de registro", group: "Perfil" },
  registration_ip: { icon: <Globe className="h-4 w-4" />, description: "IP de registro", group: "Perfil" },
  profile_picture: { icon: <Camera className="h-4 w-4" />, description: "Foto do perfil", group: "Perfil" },
  
  // Relacionamentos
  following: { icon: <UserPlus className="h-4 w-4" />, description: "Contas seguidas", group: "Relacionamentos" },
  followers: { icon: <UserMinus className="h-4 w-4" />, description: "Seguidores", group: "Relacionamentos" },
  
  // Comunicação
  unified_messages: { icon: <MessageSquare className="h-4 w-4" />, description: "Mensagens unificadas", group: "Comunicação" },
  comments: { icon: <FileText className="h-4 w-4" />, description: "Comentários", group: "Comunicação" },
  reported_conversations: { icon: <Shield className="h-4 w-4" />, description: "Conversas reportadas", group: "Comunicação" },
  reported_disappearing_messages: { icon: <Lock className="h-4 w-4" />, description: "Mensagens que desaparecem reportadas", group: "Comunicação" },
  
  // Mídia & Conteúdo
  photos: { icon: <Image className="h-4 w-4" />, description: "Fotos", group: "Mídia" },
  videos: { icon: <Video className="h-4 w-4" />, description: "Vídeos", group: "Mídia" },
  live_videos: { icon: <Video className="h-4 w-4" />, description: "Vídeos ao vivo", group: "Mídia" },
  archived_live_videos: { icon: <Video className="h-4 w-4" />, description: "Vídeos ao vivo arquivados", group: "Mídia" },
  archived_stories: { icon: <Image className="h-4 w-4" />, description: "Stories arquivados", group: "Mídia" },
  unarchived_stories: { icon: <Image className="h-4 w-4" />, description: "Stories não arquivados", group: "Mídia" },
  notes: { icon: <FileText className="h-4 w-4" />, description: "Notas", group: "Mídia" },
  
  // Threads
  threads_profile_picture: { icon: <Camera className="h-4 w-4" />, description: "Foto do perfil Threads", group: "Threads" },
  threads_following: { icon: <UserPlus className="h-4 w-4" />, description: "Seguindo no Threads", group: "Threads" },
  threads_followers: { icon: <UserMinus className="h-4 w-4" />, description: "Seguidores no Threads", group: "Threads" },
  threads_registration_date: { icon: <Calendar className="h-4 w-4" />, description: "Data de registro Threads", group: "Threads" },
  threads_posts_and_replies: { icon: <MessageSquare className="h-4 w-4" />, description: "Posts e respostas Threads", group: "Threads" },
  threads_archived_stories: { icon: <Image className="h-4 w-4" />, description: "Stories arquivados Threads", group: "Threads" },
  threads_unified_messages: { icon: <MessageSquare className="h-4 w-4" />, description: "Mensagens unificadas Threads", group: "Threads" },
  
  // Segurança & Sistema
  logins: { icon: <Activity className="h-4 w-4" />, description: "Histórico de logins", group: "Segurança" },
  ip_addresses: { icon: <Globe className="h-4 w-4" />, description: "Endereços IP", group: "Segurança" },
  devices: { icon: <Settings className="h-4 w-4" />, description: "Dispositivos", group: "Segurança" },
  last_location: { icon: <MapPin className="h-4 w-4" />, description: "Última localização", group: "Segurança" },
  last_location_area: { icon: <MapPin className="h-4 w-4" />, description: "Área da última localização", group: "Segurança" },
  
  // Outros
  request_parameters: { icon: <FileText className="h-4 w-4" />, description: "Parâmetros da requisição", group: "Outros" },
  ncmec_reports: { icon: <Shield className="h-4 w-4" />, description: "Relatórios NCMEC", group: "Outros" },
  encrypted_groups_info: { icon: <Lock className="h-4 w-4" />, description: "Info de grupos criptografados", group: "Outros" },
  community_notes: { icon: <FileText className="h-4 w-4" />, description: "Notas da comunidade", group: "Outros" },
  threads_community_notes: { icon: <FileText className="h-4 w-4" />, description: "Notas da comunidade Threads", group: "Outros" },
  archived_quicksnap: { icon: <Image className="h-4 w-4" />, description: "Quicksnaps arquivados", group: "Outros" },
  shared_access: { icon: <Users className="h-4 w-4" />, description: "Acesso compartilhado", group: "Outros" },
  account_owner_shared_access: { icon: <Users className="h-4 w-4" />, description: "Acesso compartilhado do proprietário", group: "Outros" }
};

export default function InstagramNavigation({ categories, onCategoryClick, activeCategory }: InstagramNavigationProps) {
  // Agrupar categorias
  const groupedCategories = Object.entries(categories).reduce((acc, [category, count]) => {
    const config = CATEGORY_CONFIG[category];
    if (!config) return acc;
    
    const group = config.group;
    if (!acc[group]) acc[group] = [];
    
    acc[group].push({
      name: category,
      count,
      icon: config.icon,
      description: config.description
    });
    
    return acc;
  }, {} as Record<string, CategoryCount[]>);

  // Ordenar grupos por prioridade
  const groupOrder = ['Perfil', 'Relacionamentos', 'Comunicação', 'Mídia', 'Threads', 'Segurança', 'Outros'];
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Categorias Extraídas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {Object.keys(categories).length} categorias encontradas
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {groupOrder.map(groupName => {
            const groupCategories = groupedCategories[groupName];
            if (!groupCategories || groupCategories.length === 0) return null;
            
            return (
              <div key={groupName} className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                  {groupName}
                </h3>
                
                <div className="space-y-2">
                  {groupCategories
                    .sort((a, b) => b.count - a.count) // Ordenar por quantidade (decrescente)
                    .map(category => (
                      <button
                        key={category.name}
                        onClick={() => onCategoryClick(category.name)}
                        className={`w-full p-3 rounded-lg border text-left transition-all hover:bg-accent/50 ${
                          activeCategory === category.name ? 'bg-accent border-accent-foreground' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            <span className="font-medium text-sm capitalize">
                              {category.name.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {category.count}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      </button>
                    ))}
                </div>
                
                <Separator className="mt-4" />
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}