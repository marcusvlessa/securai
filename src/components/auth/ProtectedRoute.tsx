import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingSpinner } from '../ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'investigator' | 'analyst' | 'viewer'
  requiredPermission?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredPermission 
}) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Perfil não encontrado</h2>
          <p className="text-muted-foreground mt-2">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    )
  }

  // Check role requirement
  if (requiredRole) {
    const roleHierarchy = {
      'viewer': 0,
      'analyst': 1,
      'investigator': 2,
      'admin': 3
    }

    const userRoleLevel = roleHierarchy[profile.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Acesso Negado</h2>
            <p className="text-muted-foreground mt-2">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      )
    }
  }

  // Check specific permission
  if (requiredPermission && !profile.permissions.includes(requiredPermission) && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Permissão Insuficiente</h2>
          <p className="text-muted-foreground mt-2">
            Você não tem a permissão necessária para acessar esta funcionalidade.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}