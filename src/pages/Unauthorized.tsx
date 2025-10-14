import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          </div>
          <CardDescription>
            Você não possui permissão para acessar esta página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do Perfil Atual */}
          {profile && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Seu perfil atual:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><strong>Nome:</strong> {profile.name || 'Não informado'}</li>
                    <li><strong>Email:</strong> {profile.email}</li>
                    <li><strong>Função:</strong> {profile.role || 'Não atribuída'}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Explicação do Erro */}
          <div>
            <h3 className="font-semibold mb-2">Por que estou vendo esta mensagem?</h3>
            <p className="text-muted-foreground mb-3">
              Esta página requer permissões especiais que seu perfil atual não possui.
              Possíveis motivos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>A página requer função de <strong>Administrador</strong> e você possui função de <strong>{profile?.role || 'usuário'}</strong></li>
              <li>Seu perfil está aguardando aprovação por um administrador</li>
              <li>Suas permissões foram alteradas recentemente</li>
              <li>Você não está autorizado a acessar este módulo específico</li>
            </ul>
          </div>

          {/* Como Resolver */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Como obter acesso?
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Entre em contato com um administrador do sistema</li>
              <li>Solicite as permissões necessárias para este módulo</li>
              <li>Aguarde a aprovação do administrador</li>
              <li>Faça logout e login novamente após a aprovação</li>
            </ol>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              Voltar ao Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/settings')}
              className="flex-1"
            >
              Verificar Permissões
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                window.location.href = 'mailto:admin@securai.com.br?subject=Solicitação de Permissões&body=Olá, gostaria de solicitar permissões para acessar o sistema SecurAI.';
              }}
              className="flex-1"
            >
              Contatar Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
