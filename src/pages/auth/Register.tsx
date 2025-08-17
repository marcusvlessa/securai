import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Eye, EyeOff, User, Badge, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  badgeNumber: string;
  department: string;
  role: 'investigator' | 'analyst' | 'delegado';
  organizationId: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    badgeNumber: '',
    department: '',
    role: 'analyst',
    organizationId: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }

    if (!formData.password) {
      setError('Senha é obrigatória');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Senhas não coincidem');
      return false;
    }

    if (!formData.badgeNumber.trim()) {
      setError('Número de identificação é obrigatório');
      return false;
    }

    if (!formData.department.trim()) {
      setError('Departamento é obrigatório');
      return false;
    }

    if (!formData.organizationId.trim()) {
      setError('Organização é obrigatória');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp(formData.email, formData.password, {
        name: formData.name,
        badge_number: formData.badgeNumber,
        department: formData.department,
        role: formData.role,
        organization_id: formData.organizationId
      });
      
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const mockOrganizations = [
    { id: 'org-1', name: 'Polícia Civil - SP', type: 'police' },
    { id: 'org-2', name: 'Polícia Federal', type: 'federal' },
    { id: 'org-3', name: 'Polícia Militar - SP', type: 'military' },
    { id: 'org-4', name: 'Ministério Público - SP', type: 'prosecutor' },
    { id: 'org-5', name: 'Delegacia de Polícia - Centro', type: 'police' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Secur:AI</h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Inteligência Artificial para Investigação Criminal
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Solicitar Acesso ao Sistema</CardTitle>
            <CardDescription>
              Preencha os dados para solicitar acesso ao Secur:AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <User className="inline w-4 h-4 mr-2" />
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <User className="inline w-4 h-4 mr-2" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badgeNumber">
                    <Badge className="inline w-4 h-4 mr-2" />
                    Número de Identificação *
                  </Label>
                  <Input
                    id="badgeNumber"
                    type="text"
                    placeholder="Ex: 12345"
                    value={formData.badgeNumber}
                    onChange={(e) => handleChange('badgeNumber', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">
                    <Building className="inline w-4 h-4 mr-2" />
                    Departamento *
                  </Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Ex: Homicídios"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'investigator' | 'analyst' | 'delegado') => 
                      handleChange('role', value)
                    }
                  >
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigator">Investigador</SelectItem>
                      <SelectItem value="analyst">Analista</SelectItem>
                      <SelectItem value="delegado">Delegado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organização *</Label>
                  <Select 
                    value={formData.organizationId} 
                    onValueChange={(value) => handleChange('organizationId', value)}
                  >
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Selecione sua organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Importante:</strong> Sua solicitação será analisada pelos administradores do sistema. 
                  Você receberá uma confirmação por email assim que o acesso for aprovado.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando solicitação...
                  </>
                ) : (
                  'Solicitar Acesso'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                Já tem uma conta?{' '}
              </span>
              <Link 
                to="/auth/login" 
                className="text-primary hover:underline font-medium"
              >
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2024 Secur:AI. Sistema desenvolvido para órgãos de segurança pública.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;