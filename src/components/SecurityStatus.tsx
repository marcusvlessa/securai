import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'

export const SecurityStatus: React.FC = () => {
  const securityFixes = [
    {
      title: "PII Data Protection - CRITICAL FIX",
      status: "fixed",
      description: "Completely restricted access to sensitive user data (email, badge_number, department) from other users. Only public info (name, status) is now visible to authenticated users."
    },
    {
      title: "Organization Data Security", 
      status: "fixed",
      description: "Limited organization contact data to members and authorized roles"
    },
    {
      title: "Security Event Logging",
      status: "fixed", 
      description: "Added authentication requirement for security event logging"
    },
    {
      title: "X-Frame-Options Configuration",
      status: "verified",
      description: "Frame embedding protection properly configured as SAMEORIGIN"
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fixed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'verified':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fixed':
        return <Badge className="bg-green-100 text-green-800">Fixed</Badge>
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800">Verified</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Fixes Applied
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {securityFixes.map((fix, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
              {getStatusIcon(fix.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{fix.title}</h4>
                  {getStatusBadge(fix.status)}
                </div>
                <p className="text-sm text-muted-foreground">{fix.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-800">Critical Security Fix Applied</h4>
          </div>
          <p className="text-sm text-green-700">
            <strong>SECURITY THREAT ELIMINATED:</strong> The critical vulnerability allowing unauthorized access to user email addresses, badge numbers, and department information has been completely resolved. The RLS policy now only allows viewing of minimal public information (name and status) while protecting all sensitive personal data.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}