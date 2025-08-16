import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { LoadingSpinner } from '../../components/ui/loading-spinner'
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface Organization {
  id: string
  name: string
  type: string
}

interface OrganizationsByType {
  Federal: Organization[]
  Estadual: Organization[]
}

export const Register: React.FC = () => {
  const { signUp, user, loading: authLoading } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationsByType, setOrganizationsByType] = useState<OrganizationsByType>({ Federal: [], Estadual: [] })
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    organization_id: '',
    role: 'analyst' as 'admin' | 'investigator' | 'analyst' | 'delegado',
    name: '',
    badge_number: '',
    department: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/app" replace />
  }

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, type')
          .order('name')

        if (error) throw error
        setOrganizations(data || [])
        
        // Group organizations by type
        const grouped = (data || []).reduce((acc: OrganizationsByType, org) => {
          if (org.type === 'Federal') {
            acc.Federal.push(org)
          } else {
            acc.Estadual.push(org)
          }
          return acc
        }, { Federal: [], Estadual: [] })
        
        setOrganizationsByType(grouped)
      } catch (error) {
        console.error('Error fetching organizations:', error)
      }
    }

    fetchOrganizations()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!formData.organization_id) {
      setError('Selecione uma organização')
      return
    }

    setLoading(true)

    try {
      await signUp(formData.email, formData.password, {
        name: formData.name,
        organization_id: formData.organization_id,
        role: formData.role,
        badge_number: formData.badge_number,
        department: formData.department
      })
      
      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-green-600">Conta Criada!</CardTitle>
              <CardDescription className="text-base">
                Verifique seu email para ativar a conta
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Enviamos um link de verificação para <strong>{formData.email}</strong>. 
              Clique no link para ativar sua conta e fazer login.
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/auth/login" className="w-full">
              <Button className="w-full">
                Ir para Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Registrar no Secur:AI</CardTitle>
            <CardDescription className="text-base">
              Solicitar acesso ao sistema de análise forense
            </CardDescription>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Sua solicitação de registro será analisada por um administrador antes da aprovação. 
                Certifique-se de usar seu email corporativo oficial.
              </AlertDescription>
            </Alert>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Corporativo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu.email@organizacao.gov.br"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_id">Organização</Label>
              <Select 
                value={formData.organization_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua organização" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="px-2 py-1">
                    <Input
                      placeholder="Buscar organização..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  
                  {/* Órgãos Federais */}
                  {organizationsByType.Federal.filter(org => 
                    org.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > 0 && (
                    <>
                      <div className="px-2 py-1 text-sm font-semibold text-muted-foreground border-t">
                        Órgãos Federais
                      </div>
                      {organizationsByType.Federal
                        .filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                  
                  {/* Órgãos Estaduais */}
                  {organizationsByType.Estadual.filter(org => 
                    org.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > 0 && (
                    <>
                      <div className="px-2 py-1 text-sm font-semibold text-muted-foreground border-t">
                        Órgãos Estaduais
                      </div>
                      {organizationsByType.Estadual
                        .filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                  
                  {/* No results */}
                  {organizations.filter(org => 
                    org.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && searchTerm && (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Nenhuma organização encontrada
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge_number">Matrícula/Badge</Label>
                <Input
                  id="badge_number"
                  name="badge_number"
                  placeholder="12345"
                  value={formData.badge_number}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">Analista</SelectItem>
                    <SelectItem value="investigator">Investigador</SelectItem>
                    <SelectItem value="delegado">Delegado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                name="department"
                placeholder="Ex: Investigação Criminal, Perícia, etc."
                value={formData.department}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link
                to="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}