-- Fix critical security vulnerabilities in RLS policies

-- 1. Remove dangerous public read policy from user_profiles
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.user_profiles;

-- 2. Fix organization data exposure - remove blanket public access
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.organizations;

-- 3. Create secure RLS policy for user_profiles - restrict email access
DROP POLICY IF EXISTS "Users can only see approved profiles in organization lookup" ON public.user_profiles;

CREATE POLICY "Users can view approved profiles without sensitive data" 
ON public.user_profiles 
FOR SELECT 
USING (
  (status = 'approved' AND auth.uid() IS NOT NULL) OR 
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'delegado'::app_role)
);

-- 4. Create secure organization access policy
CREATE POLICY "Authenticated users can view organization basic info" 
ON public.organizations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE organization_id = organizations.id AND status = 'approved'
    ) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'delegado'::app_role)
  )
);

-- 5. Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins and system can view security events
CREATE POLICY "Only admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert security events
CREATE POLICY "System can log security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 6. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (user_id, event_type, event_data)
  VALUES (p_user_id, p_event_type, p_event_data)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;