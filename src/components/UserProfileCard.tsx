import React from 'react'
import { Card, CardContent } from './ui/card'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'

interface PublicUserProfile {
  id: string
  user_id: string
  name?: string
  department?: string
  organization_id?: string
  status: string
  created_at: string
  avatar_url?: string
}

interface UserProfileCardProps {
  profile: PublicUserProfile
  showContactInfo?: boolean // Only for own profile or admin view
  email?: string
  phone?: string
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ 
  profile, 
  showContactInfo = false,
  email,
  phone 
}) => {
  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback className="text-lg font-medium">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">{profile.name || 'Nome não informado'}</h3>
              <Badge variant={getStatusBadgeVariant(profile.status)}>
                {profile.status}
              </Badge>
            </div>
            
            {profile.department && (
              <p className="text-sm text-muted-foreground">{profile.department}</p>
            )}
            
            {/* Only show contact info for own profile or admin users */}
            {showContactInfo && (
              <div className="space-y-1">
                {email && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Email:</span> {email}
                  </p>
                )}
                {phone && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Telefone:</span> {phone}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Criado em: {new Date(profile.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}