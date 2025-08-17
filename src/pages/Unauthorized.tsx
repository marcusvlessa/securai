import React from 'react';
import { AlertTriangle, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Você não tem permissão para acessar esta página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Esta área requer permissões específicas que não estão disponíveis na sua conta.
              </p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Possíveis motivos:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Seu perfil não possui a role necessária</li>
              <li>Suas permissões foram revogadas</li>
              <li>O sistema está em manutenção</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            
            <Button 
              onClick={() => navigate('/settings')}
              className="w-full"
              variant="outline"
            >
              <Shield className="h-4 w-4 mr-2" />
              Verificar Permissões
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
