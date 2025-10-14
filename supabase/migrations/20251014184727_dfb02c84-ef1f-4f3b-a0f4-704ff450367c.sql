-- Criar tabela para cache de métricas financeiras
CREATE TABLE IF NOT EXISTS public.financial_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_credits NUMERIC(20,2) NOT NULL DEFAULT 0,
  total_debits NUMERIC(20,2) NOT NULL DEFAULT 0,
  balance NUMERIC(20,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  avg_transaction_amount NUMERIC(20,2),
  top_counterparties JSONB DEFAULT '[]'::jsonb,
  method_distribution JSONB DEFAULT '{}'::jsonb,
  temporal_data JSONB DEFAULT '[]'::jsonb,
  metrics_data JSONB DEFAULT '{}'::jsonb,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, period_start, period_end)
);

-- Habilitar RLS
ALTER TABLE public.financial_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their case metrics cache"
  ON public.financial_metrics_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_metrics_cache.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their case metrics cache"
  ON public.financial_metrics_cache
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_metrics_cache.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their case metrics cache"
  ON public.financial_metrics_cache
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_metrics_cache.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their case metrics cache"
  ON public.financial_metrics_cache
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_metrics_cache.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_metrics_cache_case_id ON public.financial_metrics_cache(case_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_period ON public.financial_metrics_cache(period_start, period_end);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_metrics_cache_updated_at
  BEFORE UPDATE ON public.financial_metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();