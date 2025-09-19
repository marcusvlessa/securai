import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Globe, 
  MapPin, 
  Shield, 
  Search,
  Eye,
  Clock,
  AlertTriangle,
  Building,
  Wifi,
  Smartphone
} from 'lucide-react';
import { ProcessedInstagramData } from '@/services/instagramParserService';
import { geoLocationService, GeoLocationInfo } from '@/services/geoLocationService';
import { useToast } from '@/components/ui/use-toast';

interface InstagramIPsProps {
  data: ProcessedInstagramData;
}

interface IPActivityInfo {
  ip: string;
  usageCount: number;
  lastSeen: Date;
  firstSeen: Date;
  devices: string[];
  locations: string[];
  suspicious: boolean;
  geoInfo?: GeoLocationInfo | null;
}

export const InstagramIPs: React.FC<InstagramIPsProps> = ({ data }) => {
  const { toast } = useToast();
  const [geoData, setGeoData] = useState<Map<string, GeoLocationInfo | null>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedIP, setExpandedIP] = useState<string | null>(null);

  // Processar dados de IP dos dispositivos e logins
  const ipActivityData = useMemo((): IPActivityInfo[] => {
    const ipMap = new Map<string, IPActivityInfo>();

    // Processar dispositivos
    data.devices.forEach(device => {
      if (device.ipAddress) {
        const ip = device.ipAddress;
        if (!ipMap.has(ip)) {
          ipMap.set(ip, {
            ip,
            usageCount: 0,
            lastSeen: device.lastUsed || new Date(),
            firstSeen: device.lastUsed || new Date(),
            devices: [],
            locations: [],
            suspicious: false
          });
        }
        
        const ipInfo = ipMap.get(ip)!;
        ipInfo.usageCount++;
        ipInfo.devices.push(`${device.deviceType} - ${device.deviceName}`);
        
        if (device.lastUsed) {
          if (device.lastUsed > ipInfo.lastSeen) {
            ipInfo.lastSeen = device.lastUsed;
          }
          if (device.lastUsed < ipInfo.firstSeen) {
            ipInfo.firstSeen = device.lastUsed;
          }
        }
      }
    });

    // Processar logins
    data.logins.forEach(login => {
      if (login.ipAddress) {
        const ip = login.ipAddress;
        if (!ipMap.has(ip)) {
          ipMap.set(ip, {
            ip,
            usageCount: 0,
            lastSeen: login.timestamp || new Date(),
            firstSeen: login.timestamp || new Date(),
            devices: [],
            locations: [],
            suspicious: false
          });
        }
        
        const ipInfo = ipMap.get(ip)!;
        ipInfo.usageCount++;
        
        if (login.location && !ipInfo.locations.includes(login.location)) {
          ipInfo.locations.push(login.location);
        }
        
        if (login.timestamp) {
          if (login.timestamp > ipInfo.lastSeen) {
            ipInfo.lastSeen = login.timestamp;
          }
          if (login.timestamp < ipInfo.firstSeen) {
            ipInfo.firstSeen = login.timestamp;
          }
        }
      }
    });

    // Detectar atividade suspeita
    const allIPs = Array.from(ipMap.values());
    const avgUsage = allIPs.reduce((sum, ip) => sum + ip.usageCount, 0) / allIPs.length;
    
    allIPs.forEach(ipInfo => {
      // Marcar como suspeito se:
      // 1. Muito pouco uso (1-2 vezes)
      // 2. Uso muito acima da média
      // 3. Múltiplos dispositivos diferentes
      ipInfo.suspicious = (
        ipInfo.usageCount <= 2 || 
        ipInfo.usageCount > avgUsage * 3 ||
        ipInfo.devices.length > 3
      );
    });

    return allIPs.sort((a, b) => b.usageCount - a.usageCount);
  }, [data]);

  // Carregar dados de geolocalização
  useEffect(() => {
    const loadGeoData = async () => {
      setLoading(true);
      try {
        const uniqueIPs = ipActivityData.map(ip => ip.ip);
        const geoResults = await geoLocationService.getMultipleLocations(uniqueIPs);
        setGeoData(geoResults);
        
        toast({
          title: "Geolocalização carregada",
          description: `Localização obtida para ${Array.from(geoResults.values()).filter(Boolean).length} de ${uniqueIPs.length} IPs`,
        });
      } catch (error) {
        console.error('Erro ao carregar geolocalização:', error);
        toast({
          title: "Erro na geolocalização",
          description: "Não foi possível obter dados de localização para alguns IPs",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (ipActivityData.length > 0) {
      loadGeoData();
    }
  }, [ipActivityData, toast]);

  // Filtrar IPs por termo de busca
  const filteredIPs = useMemo(() => {
    if (!searchTerm) return ipActivityData;
    
    return ipActivityData.filter(ipInfo => {
      const geoInfo = geoData.get(ipInfo.ip);
      const searchLower = searchTerm.toLowerCase();
      
      return (
        ipInfo.ip.includes(searchLower) ||
        geoInfo?.country.toLowerCase().includes(searchLower) ||
        geoInfo?.city.toLowerCase().includes(searchLower) ||
        geoInfo?.isp.toLowerCase().includes(searchLower) ||
        ipInfo.devices.some(device => device.toLowerCase().includes(searchLower))
      );
    });
  }, [ipActivityData, geoData, searchTerm]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getLocationFlag = (countryCode: string) => {
    if (!countryCode || countryCode === 'XX') return '🌐';
    return String.fromCodePoint(...countryCode.toUpperCase().split('').map(char => 0x1F1E6 + char.charCodeAt(0) - 65));
  };

  const getSuspiciousReason = (ipInfo: IPActivityInfo): string => {
    const reasons = [];
    if (ipInfo.usageCount <= 2) reasons.push('Uso muito baixo');
    if (ipInfo.usageCount > 20) reasons.push('Uso muito alto');
    if (ipInfo.devices.length > 3) reasons.push('Múltiplos dispositivos');
    return reasons.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ipActivityData.length}</div>
            <p className="text-xs text-muted-foreground">
              {Array.from(geoData.values()).filter(Boolean).length} com localização
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Suspeitos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {ipActivityData.filter(ip => ip.suspicious).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Países Únicos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(Array.from(geoData.values()).filter(Boolean).map(geo => geo!.country)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Localizações diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IP Mais Usado</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {ipActivityData[0]?.ip || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {ipActivityData[0]?.usageCount || 0} acessos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar IPs
          </CardTitle>
          <CardDescription>
            Busque por endereço IP, país, cidade, ISP ou dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Lista de IPs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Endereços IP Detectados
            {loading && <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full ml-2" />}
          </CardTitle>
          <CardDescription>
            Análise detalhada de todos os endereços IP identificados nos dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIPs.map((ipInfo) => {
              const geoInfo = geoData.get(ipInfo.ip);
              const isExpanded = expandedIP === ipInfo.ip;
              
              return (
                <div
                  key={ipInfo.ip}
                  className={`border rounded-lg p-4 transition-colors ${
                    ipInfo.suspicious ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-mono bg-muted px-2 py-1 rounded">
                          {ipInfo.ip}
                        </code>
                        
                        {ipInfo.suspicious && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Suspeito
                          </Badge>
                        )}
                        
                        {geoInfo && (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {getLocationFlag(geoInfo.countryCode)}
                            </span>
                            <span className="text-sm font-medium">
                              {geoInfo.city}, {geoInfo.country}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{ipInfo.usageCount} acessos</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Último: {formatDate(ipInfo.lastSeen)}</span>
                        </div>
                        
                        {geoInfo && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{geoInfo.isp}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span>{ipInfo.devices.length} dispositivos</span>
                        </div>
                      </div>
                      
                      {ipInfo.suspicious && (
                        <div className="mt-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {getSuspiciousReason(ipInfo)}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIP(isExpanded ? null : ipInfo.ip)}
                    >
                      {isExpanded ? 'Ocultar' : 'Detalhes'}
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-2">
                      {/* Informações de Geolocalização */}
                      {geoInfo && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Localização
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>País:</strong> {geoInfo.country} ({geoInfo.countryCode})</div>
                            <div><strong>Região:</strong> {geoInfo.regionName}</div>
                            <div><strong>Cidade:</strong> {geoInfo.city}</div>
                            <div><strong>Fuso:</strong> {geoInfo.timezone}</div>
                            <div><strong>ISP:</strong> {geoInfo.isp}</div>
                            <div><strong>Organização:</strong> {geoInfo.org}</div>
                            {geoInfo.mobile && <Badge variant="outline">Móvel</Badge>}
                            {geoInfo.proxy && <Badge variant="outline">Proxy</Badge>}
                            {geoInfo.hosting && <Badge variant="outline">Hosting</Badge>}
                          </div>
                        </div>
                      )}
                      
                      {/* Dispositivos Associados */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Dispositivos ({ipInfo.devices.length})
                        </h4>
                        <div className="space-y-1">
                          {Array.from(new Set(ipInfo.devices)).map((device, index) => (
                            <div key={index} className="text-sm p-2 bg-muted rounded">
                              {device}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Timeline de Atividade */}
                      <div className="md:col-span-2">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Timeline de Atividade
                        </h4>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div>
                            <strong>Primeiro acesso:</strong> {formatDate(ipInfo.firstSeen)}
                          </div>
                          <div>
                            <strong>Último acesso:</strong> {formatDate(ipInfo.lastSeen)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {filteredIPs.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum IP encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente uma busca diferente' : 'Nenhum endereço IP detectado nos dados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};