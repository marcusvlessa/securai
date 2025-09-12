import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  CheckCircle,
  Building,
  Globe,
  MapPin
} from 'lucide-react';
import { ProcessedInstagramData } from '@/services/instagramParserService';

interface InstagramProfileProps {
  data: ProcessedInstagramData;
}

export const InstagramProfile: React.FC<InstagramProfileProps> = ({ data }) => {
  const profile = data.profile;

  if (!profile) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Perfil não encontrado</h3>
        <p className="text-muted-foreground">
          Não foi possível extrair dados de perfil do arquivo fornecido
        </p>
      </div>
    );
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'active': 'default',
      'disabled': 'destructive',
      'deactivated': 'secondary'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getVerificationBadge = () => {
    if (profile.verificationStatus === 'verified') {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verificado
        </Badge>
      );
    }
    return <Badge variant="outline">Não verificado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header do Perfil */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {profile.profilePicture ? (
                <AvatarImage src={profile.profilePicture} alt={profile.username} />
              ) : (
                <AvatarFallback className="text-lg">
                  {profile.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">@{profile.username}</h2>
                {getVerificationBadge()}
                {getStatusBadge(profile.accountStatus)}
              </div>
              
              {profile.displayName && (
                <p className="text-lg text-muted-foreground mb-2">{profile.displayName}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {profile.businessAccount && (
                  <Badge variant="outline">
                    <Building className="h-3 w-3 mr-1" />
                    Conta Comercial
                  </Badge>
                )}
                
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {data.conversations.length} conversas
                </Badge>
                
                <Badge variant="outline">
                  <Globe className="h-3 w-3 mr-1" />
                  {data.media.length} mídias
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.email.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mails
                </h4>
                <div className="space-y-1">
                  {profile.email.map((email, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      {email}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.phone.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefones
                </h4>
                <div className="space-y-1">
                  {profile.phone.map((phone, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      {phone}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.email.length === 0 && profile.phone.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma informação de contato disponível
              </p>
            )}
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(profile.accountStatus)}
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Verificação:</span>
                {getVerificationBadge()}
              </div>
              
              {profile.businessAccount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge variant="outline">
                    {profile.businessAccount ? 'Comercial' : 'Pessoal'}
                  </Badge>
                </div>
              )}

              <Separator />

              {profile.registrationDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registro:</span>
                  <span className="text-sm font-medium">
                    {formatDate(profile.registrationDate)}
                  </span>
                </div>
              )}

              {profile.registrationIP && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IP de Registro:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {profile.registrationIP}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações de Privacidade */}
      {profile.privacySettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configurações de Privacidade
            </CardTitle>
            <CardDescription>
              Configurações de privacidade extraídas do perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(profile.privacySettings, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Resumo Estatístico */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Atividade</CardTitle>
          <CardDescription>
            Estatísticas baseadas nos dados extraídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{data.conversations.length}</div>
              <div className="text-sm text-muted-foreground">Conversas Totais</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {data.conversations.reduce((sum, conv) => sum + conv.messageCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Mensagens Totais</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{data.media.length}</div>
              <div className="text-sm text-muted-foreground">Arquivos de Mídia</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};