-- Criar tabelas para o sistema de análise de investigação

-- Tabela para casos de investigação
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  case_type TEXT NOT NULL DEFAULT 'investigation' CHECK (case_type IN ('investigation', 'financial', 'criminal', 'civil')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para arquivos carregados
CREATE TABLE public.uploaded_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para análises realizadas
CREATE TABLE public.analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('text', 'image', 'audio', 'financial', 'link_analysis', 'investigation_report')),
  model_used TEXT NOT NULL,
  input_data JSONB,
  result_data JSONB,
  confidence_score DECIMAL(5,4),
  processing_time INTEGER, -- in milliseconds
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para sessões de análise de vínculos
CREATE TABLE public.link_analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  column_mapping JSONB NOT NULL DEFAULT '{}',
  graph_data JSONB,
  analysis_summary TEXT,
  nodes_count INTEGER DEFAULT 0,
  links_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para configurações de IA
CREATE TABLE public.ai_model_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  preferred_model TEXT NOT NULL,
  priority_setting TEXT NOT NULL DEFAULT 'balanced' CHECK (priority_setting IN ('speed', 'accuracy', 'balanced')),
  auto_select BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type)
);

-- Habilitar RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cases
CREATE POLICY "Users can view their own cases" 
ON public.cases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cases" 
ON public.cases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" 
ON public.cases 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases" 
ON public.cases 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para uploaded_files
CREATE POLICY "Users can view their own files" 
ON public.uploaded_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own files" 
ON public.uploaded_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" 
ON public.uploaded_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
ON public.uploaded_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para analysis_results
CREATE POLICY "Users can view their own analysis results" 
ON public.analysis_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis results" 
ON public.analysis_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis results" 
ON public.analysis_results 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para link_analysis_sessions
CREATE POLICY "Users can view their own link analysis sessions" 
ON public.link_analysis_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own link analysis sessions" 
ON public.link_analysis_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own link analysis sessions" 
ON public.link_analysis_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own link analysis sessions" 
ON public.link_analysis_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para ai_model_preferences
CREATE POLICY "Users can view their own AI preferences" 
ON public.ai_model_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI preferences" 
ON public.ai_model_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON public.uploaded_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at
BEFORE UPDATE ON public.analysis_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_link_analysis_sessions_updated_at
BEFORE UPDATE ON public.link_analysis_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_model_preferences_updated_at
BEFORE UPDATE ON public.ai_model_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket para armazenamento de arquivos
INSERT INTO storage.buckets (id, name, public) VALUES ('case-files', 'case-files', false);

-- Políticas de storage
CREATE POLICY "Users can upload files to their own folders" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1]);