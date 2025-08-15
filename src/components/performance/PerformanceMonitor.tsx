import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Database, Zap } from 'lucide-react';

interface PerformanceMetrics {
  responseTime: number;
  apiCalls: number;
  cacheHits: number;
  errorRate: number;
  modelAccuracy: Record<string, number>;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    errorRate: 0,
    modelAccuracy: {}
  });

  useEffect(() => {
    // Simular métricas em tempo real
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        responseTime: Math.random() * 2000 + 500,
        apiCalls: prev.apiCalls + Math.floor(Math.random() * 3),
        cacheHits: prev.cacheHits + Math.floor(Math.random() * 2),
        errorRate: Math.random() * 5,
        modelAccuracy: {
          'llama3-70b-8192': 0.95 + Math.random() * 0.05,
          'llama3-8b-8192': 0.88 + Math.random() * 0.05,
          'whisper-large-v3': 0.92 + Math.random() * 0.05
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value > threshold) return 'destructive';
    if (value > threshold * 0.7) return 'secondary';
    return 'default';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(metrics.responseTime)}ms</div>
          <Badge variant={getPerformanceColor(metrics.responseTime, 1500)}>
            {metrics.responseTime < 1000 ? 'Rápido' : metrics.responseTime < 2000 ? 'Normal' : 'Lento'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chamadas API</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.apiCalls}</div>
          <p className="text-xs text-muted-foreground">
            Total de requisições
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.cacheHits}</div>
          <p className="text-xs text-muted-foreground">
            Respostas em cache
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
          <Badge variant={getPerformanceColor(metrics.errorRate, 3)}>
            {metrics.errorRate < 1 ? 'Excelente' : metrics.errorRate < 3 ? 'Bom' : 'Atenção'}
          </Badge>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Precisão dos Modelos de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.modelAccuracy).map(([model, accuracy]) => (
              <div key={model} className="flex items-center justify-between">
                <span className="text-sm font-medium">{model}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${accuracy * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(accuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};