import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { LoadingSpinner } from '../components/ui/loading-spinner'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, AlertCircle, Users, UserCheck, UserX } from 'lucide-react'

interface PendingUser {
  id: string
  name: string
  email: string
  badge_number: string
  department: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  organization: {
    name: string
    type: string
  }
}

export const AdminPanel: React.FC = () => {
  const { hasPermission, loading: authLoading } = useAuth()
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [allUsers, setAllUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Check admin permission
  if (!authLoading && !hasPermission('admin')) {
    return <Navigate to="/app" replace />
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          badge_number,
          department,
          status,
          created_at,
          organization:organizations(name, type)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const users = (data || []) as PendingUser[]
      setAllUsers(users)
      setPendingUsers(users.filter(user => user.status === 'pending'))
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(userId)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      toast.success(
        action === 'approve' 
          ? 'Usuário aprovado com sucesso!' 
          : 'Usuário rejeitado com sucesso!'
      )
      
      await fetchUsers()
    } catch (error: any) {
      toast.error('Erro ao processar ação: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pendente</Badge>
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Aprovado</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerenciar solicitações de registro e usuários</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{pendingUsers.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <UserCheck className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{allUsers.filter(u => u.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <UserX className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{allUsers.filter(u => u.status === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Rejeitados</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{allUsers.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Solicitações Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Todos os Usuários ({allUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma solicitação pendente</h3>
                <p className="text-muted-foreground">Todas as solicitações foram processadas</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Pendentes de Aprovação</CardTitle>
                <CardDescription>
                  Analise e aprove ou rejeite as solicitações de registro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.organization?.name}</p>
                            <p className="text-sm text-muted-foreground">{user.organization?.type}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.badge_number}</TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'approve')}
                              disabled={actionLoading === user.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading === user.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUserAction(user.id, 'reject')}
                              disabled={actionLoading === user.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Usuários</CardTitle>
              <CardDescription>
                Visualizar histórico completo de usuários registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.organization?.name}</p>
                          <p className="text-sm text-muted-foreground">{user.organization?.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.badge_number}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pendingUsers.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Verifique a autenticidade das informações antes de aprovar usuários. 
            Confirme se o email corporativo é válido e se as credenciais correspondem à organização informada.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
