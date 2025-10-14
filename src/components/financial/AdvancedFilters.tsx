import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface AdvancedFiltersProps {
  filters: {
    dateRange?: DateRange;
    amountRange: { min: number; max: number };
    showOnlyAlerts: boolean;
  };
  onFilterChange: (filters: any) => void;
}

export const AdvancedFilters = ({ filters, onFilterChange }: AdvancedFiltersProps) => {
  const updateFilter = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange?.from}
                selected={filters.dateRange}
                onSelect={(range) => updateFilter('dateRange', range)}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <Label>
            Faixa de Valores: R$ {filters.amountRange.min.toLocaleString('pt-BR')} - R$ {filters.amountRange.max.toLocaleString('pt-BR')}
          </Label>
          <Slider
            min={0}
            max={1000000}
            step={1000}
            value={[filters.amountRange.min, filters.amountRange.max]}
            onValueChange={(value) => updateFilter('amountRange', { min: value[0], max: value[1] })}
            className="py-4"
          />
        </div>

        {/* Show Only Alerts */}
        <div className="flex items-center justify-between">
          <Label htmlFor="only-alerts">Mostrar apenas transações com alertas</Label>
          <Switch
            id="only-alerts"
            checked={filters.showOnlyAlerts}
            onCheckedChange={(checked) => updateFilter('showOnlyAlerts', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};