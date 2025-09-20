import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Activity,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface InstagramCategoryViewProps {
  category: string;
  data: string[];
  onClose: () => void;
}

// Mapear categorias para ícones
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  name: <Users className="h-5 w-5" />,
  emails: <Mail className="h-5 w-5" />,
  vanity: <Users className="h-5 w-5" />,
  phone_numbers: <Phone className="h-5 w-5" />,
  registration_date: <Calendar className="h-5 w-5" />,
  registration_ip: <Globe className="h-5 w-5" />,
  profile_picture: <Camera className="h-5 w-5" />,
  following: <UserPlus className="h-5 w-5" />,
  followers: <UserMinus className="h-5 w-5" />,
  unified_messages: <MessageSquare className="h-5 w-5" />,
  comments: <FileText className="h-5 w-5" />,
  photos: <Image className="h-5 w-5" />,
  videos: <Video className="h-5 w-5" />,
  logins: <Activity className="h-5 w-5" />,
  ip_addresses: <Globe className="h-5 w-5" />,
  devices: <Settings className="h-5 w-5" />,
  last_location: <MapPin className="h-5 w-5" />,
};

export default function InstagramCategoryView({ category, data, onClose }: InstagramCategoryViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Filtrar dados baseado no termo de busca
  const filteredData = data.filter(item => 
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para formatar dados específicos de cada categoria
  const formatCategoryData = (item: string, index: number) => {
    switch (category) {
      case 'following':
      case 'followers':
        // Extrair username, ID e nome do formato: "username (Instagram: ID) [nome]"
        const followRegex = /([\w\.\-]+) \(Instagram: (\d+)\) \[?(.*?)\]?/;
        const followMatch = item.match(followRegex);
        if (followMatch) {
          const [, username, id, nome] = followMatch;
          return (
            <div key={index} className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">@{username}</p>
                  <p className="text-sm text-muted-foreground">{nome || 'Sem nome'}</p>
                </div>
                <Badge variant="outline">ID: {id}</Badge>
              </div>
            </div>
          );
        }
        break;
        
      case 'unified_messages':
        // Mostrar preview das mensagens
        return (
          <div key={index} className="p-4 border rounded-lg bg-card">
            <div className="flex items-start justify-between mb-2">
              <Badge variant="secondary">Mensagem {index + 1}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {item.length > 200 ? `${item.substring(0, 200)}...` : item}
            </p>
          </div>
        );
        
      case 'ip_addresses':
        // Mostrar IPs com possível geolocalização
        return (
          <div key={index} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-mono">{item}</span>
              </div>
              <Badge variant="outline">IP {index + 1}</Badge>
            </div>
          </div>
        );
        
      case 'emails':
        return (
          <div key={index} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="font-mono">{item}</span>
            </div>
          </div>
        );
        
      case 'phone_numbers':
        return (
          <div key={index} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="font-mono">{item}</span>
            </div>
          </div>
        );
        
      default:
        // Formato padrão para outras categorias
        return (
          <div key={index} className="p-4 border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <p className="text-sm">{item}</p>
              <Badge variant="outline">{index + 1}</Badge>
            </div>
          </div>
        );
    }
    
    // Fallback
    return (
      <div key={index} className="p-4 border rounded-lg bg-card">
        <p className="text-sm">{item}</p>
      </div>
    );
  };

  // Função para exportar dados da categoria
  const exportData = () => {
    const csvContent = filteredData.map(item => `"${item.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram_${category}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryIcon = CATEGORY_ICONS[category] || <FileText className="h-5 w-5" />;
  const categoryTitle = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {categoryIcon}
            {categoryTitle}
            <Badge variant="secondary">{data.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nesta categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
        
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            {filteredData.length} de {data.length} registros encontrados
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] p-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dado disponível'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((item, index) => formatCategoryData(item, index))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}