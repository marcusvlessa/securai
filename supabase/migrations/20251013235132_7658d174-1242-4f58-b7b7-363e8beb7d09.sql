-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  counterparty TEXT,
  agency TEXT,
  account TEXT,
  bank TEXT,
  amount DECIMAL(20, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  method TEXT CHECK (method IN ('PIX', 'TED', 'TEF', 'Espécie', 'Cartão', 'Boleto', 'Outros')),
  channel TEXT,
  country TEXT DEFAULT 'BR',
  holder_document TEXT,
  counterparty_document TEXT,
  evidence_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_case_id ON public.financial_transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_holder_document ON public.financial_transactions(holder_document);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_counterparty_document ON public.financial_transactions(counterparty_document);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_amount ON public.financial_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_method ON public.financial_transactions(method);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_transactions
CREATE POLICY "Users can view their case transactions"
  ON public.financial_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_transactions.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their case transactions"
  ON public.financial_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_transactions.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their case transactions"
  ON public.financial_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_transactions.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their case transactions"
  ON public.financial_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_transactions.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Create financial_red_flags table
CREATE TABLE IF NOT EXISTS public.financial_red_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  evidence_count INTEGER DEFAULT 0,
  transaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
  parameters JSONB DEFAULT '{}'::jsonb,
  score DECIMAL(5, 2) DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for red flags
CREATE INDEX IF NOT EXISTS idx_financial_red_flags_case_id ON public.financial_red_flags(case_id);
CREATE INDEX IF NOT EXISTS idx_financial_red_flags_severity ON public.financial_red_flags(severity);
CREATE INDEX IF NOT EXISTS idx_financial_red_flags_created_at ON public.financial_red_flags(created_at);

-- Enable RLS
ALTER TABLE public.financial_red_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_red_flags
CREATE POLICY "Users can view their case red flags"
  ON public.financial_red_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_red_flags.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their case red flags"
  ON public.financial_red_flags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_red_flags.case_id
      AND cases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their case red flags"
  ON public.financial_red_flags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = financial_red_flags.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at on financial_transactions
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();