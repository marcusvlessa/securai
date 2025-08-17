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
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute: Render', { user, profile, loading, location: location.pathname });

  // Se ainda está carregando, mostrar spinner
  if (loading) {
    console.log('ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário, redirecionar para login
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Verificar role se especificado
  if (requiredRole && profile && profile.role !== requiredRole) {
    // Usuários admin têm acesso a todos os módulos
    if (profile.role === 'admin') {
      console.log('ProtectedRoute: Admin user, access granted to all modules');
    } else {
      console.log('ProtectedRoute: Role mismatch, redirecting to unauthorized');
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Verificar permissão se especificada
  if (requiredPermission && profile && !profile.permissions.includes(requiredPermission)) {
    console.log('ProtectedRoute: Permission denied, redirecting to unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('ProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};