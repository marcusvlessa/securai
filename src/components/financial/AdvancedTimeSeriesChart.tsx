import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface TimeSeriesData {
  date: string;
  credits: number;
  debits: number;
  balance: number;
  transactionCount: number;
}

interface AdvancedTimeSeriesChartProps {
  data: TimeSeriesData[];
  onDrillDown?: (range: { start: string; end: string }) => void;
}

export const AdvancedTimeSeriesChart = ({ data, onDrillDown }: AdvancedTimeSeriesChartProps) => {
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');

  const zoom = () => {
    if (refAreaLeft && refAreaRight && onDrillDown) {
      const left = refAreaLeft;
      const right = refAreaRight;
      
      setRefAreaLeft('');
      setRefAreaRight('');
      
      onDrillDown({ start: left, end: right });
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600">
              Créditos: R$ {payload[0].payload.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-red-600">
              Débitos: R$ {payload[0].payload.debits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-blue-600">
              Saldo: R$ {payload[0].payload.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-muted-foreground">
              Transações: {payload[0].payload.transactionCount}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Fluxo Temporal de Transações
          <span className="text-sm text-muted-foreground font-normal ml-2">
            (Arraste para zoom)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={data}
            onMouseDown={(e: any) => setRefAreaLeft(e.activeLabel || '')}
            onMouseMove={(e: any) => refAreaLeft && setRefAreaRight(e.activeLabel || '')}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="credits" 
              name="Créditos"
              fill="hsl(var(--chart-2))" 
              stroke="hsl(var(--chart-2))"
              fillOpacity={0.3} 
            />
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="debits" 
              name="Débitos"
              fill="hsl(var(--chart-1))" 
              stroke="hsl(var(--chart-1))"
              fillOpacity={0.3} 
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="balance" 
              name="Saldo"
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
            
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="hsl(var(--primary))"
              className="text-xs"
            />
            
            {refAreaLeft && refAreaRight && (
              <ReferenceArea 
                yAxisId="left" 
                x1={refAreaLeft} 
                x2={refAreaRight} 
                strokeOpacity={0.3}
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};