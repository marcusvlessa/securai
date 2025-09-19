import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Monitor, 
  Tablet,
  MapPin,
  Clock,
  Wifi,
  Shield,
  Activity
} from 'lucide-react';
import { ProcessedInstagramData } from '@/services/instagramParserService';

interface InstagramDevicesProps {
  data: ProcessedInstagramData;
}

export const InstagramDevices: React.FC<InstagramDevicesProps> = ({ data }) => {
  const { devices, logins } = data;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDeviceIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('phone') || lowerType.includes('mobile')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (lowerType.includes('tablet') || lowerType.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    } else {
      return <Monitor className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'active': 'default',
      'inactive': 'secondary',
      'removed': 'destructive'
    };
    
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-yellow-100 text-yellow-800',
      'removed': 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className={colors[status]}>
        {status === 'active' ? 'Ativo' : 
         status === 'inactive' ? 'Inativo' : 
         status === 'removed' ? 'Removido' : status}
      </Badge>
    );
  };

  // Group logins by IP for better visualization
  const loginsByIP = logins.reduce((acc, login) => {
    if (!acc[login.ip]) {
      acc[login.ip] = [];
    }
    acc[login.ip].push(login);
    return acc;
  }, {} as Record<string, typeof logins>);

  const uniqueIPs = Object.keys(loginsByIP);

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              {devices.filter(d => d.status === 'active').length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logins.length}</div>
            <p className="text-xs text-muted-foreground">
              {logins.filter(l => l.success).length} bem-sucedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Únicos</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueIPs.length}</div>
            <p className="text-xs text-muted-foreground">
              Endereços diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Localizações</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logins.filter(l => l.location).map(l => l.location)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Cidades diferentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista de Dispositivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Dispositivos Registrados
            </CardTitle>
            <CardDescription>
              Lista de dispositivos associados à conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {devices.map((device, index) => (
                    <div key={device.uuid || index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(device.deviceType)}
                          <div>
                            <h4 className="font-semibold">
                              {device.deviceModel || `${device.deviceType} Device`}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {device.uuid}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(device.status)}
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span>{device.deviceType}</span>
                        </div>

                        {device.os && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">OS:</span>
                            <span>{device.os}</span>
                          </div>
                        )}

                        {device.appVersion && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">App:</span>
                            <span>{device.appVersion}</span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Último acesso:</span>
                          <span>{formatDate(device.lastSeen)}</span>
                        </div>

                        {device.firstSeen && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Primeiro acesso:</span>
                            <span>{formatDate(device.firstSeen)}</span>
                          </div>
                        )}

                        {device.ipAddresses && device.ipAddresses.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">IPs:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {device.ipAddresses.slice(0, 3).map((ip, idx) => (
                                <code key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                  {ip}
                                </code>
                              ))}
                              {device.ipAddresses.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{device.ipAddresses.length - 3} mais
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo encontrado</h3>
                <p className="text-muted-foreground">
                  Não foram encontrados dados de dispositivos no arquivo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Logins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Histórico de Acessos
            </CardTitle>
            <CardDescription>
              Registro de acessos à conta por IP
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logins.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {uniqueIPs.map(ip => {
                    const ipLogins = loginsByIP[ip];
                    const lastLogin = ipLogins[ipLogins.length - 1];
                    const successCount = ipLogins.filter(l => l.success).length;
                    
                    return (
                      <div key={ip} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold font-mono text-sm">{ip}</h4>
                            {lastLogin.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lastLogin.location}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {ipLogins.length} acesso{ipLogins.length > 1 ? 's' : ''}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sucesso:</span>
                            <span className={successCount === ipLogins.length ? 'text-green-600' : 'text-yellow-600'}>
                              {successCount}/{ipLogins.length}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Último acesso:</span>
                            <span>{formatDate(lastLogin.timestamp)}</span>
                          </div>

                          {lastLogin.device && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Dispositivo:</span>
                              <span className="truncate max-w-32">{lastLogin.device}</span>
                            </div>
                          )}

                          {lastLogin.method && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Método:</span>
                              <span>{lastLogin.method}</span>
                            </div>
                          )}
                        </div>

                        {ipLogins.length > 1 && (
                          <details className="mt-3">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Ver todos os acessos ({ipLogins.length})
                            </summary>
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                              {ipLogins.slice().reverse().map((login, idx) => (
                                <div key={idx} className="flex justify-between text-xs p-2 bg-muted rounded">
                                  <span>{formatDate(login.timestamp)}</span>
                                  <Badge 
                                    variant={login.success ? 'default' : 'destructive'}
                                    className="h-4 text-xs"
                                  >
                                    {login.success ? 'OK' : 'Falha'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum login encontrado</h3>
                <p className="text-muted-foreground">
                  Não foram encontrados dados de acesso no arquivo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};