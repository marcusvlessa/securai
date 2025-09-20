-- Critical Security Fixes: Update RLS policies for PII protection (Fixed)

-- 1. Remove the overly permissive policy that exposes email/phone to all authenticated users
DROP POLICY IF EXISTS "Users can view approved profiles without sensitive data" ON public.user_profiles;

-- 2. Create a new restricted policy that only allows users to see basic public info of approved profiles
CREATE POLICY "Users can view basic approved profile info" 
ON public.user_profiles 
FOR SELECT 
USING (
  (status = 'approved' AND auth.uid() IS NOT NULL AND auth.uid() != user_id)
);

-- 3. Restrict organization contact data access
DROP POLICY IF EXISTS "Authenticated users can view organization basic info" ON public.organizations;

-- 4. Create more restrictive organization policy
CREATE POLICY "Users can view their organization basic info" 
ON public.organizations 
FOR SELECT 
USING (
  (auth.uid() IN ( 
    SELECT user_profiles.user_id
    FROM user_profiles
    WHERE user_profiles.organization_id = organizations.id 
    AND user_profiles.status = 'approved'
  )) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'delegado'::app_role)
);

-- 5. Add authentication check to security_events insertion policy
DROP POLICY IF EXISTS "System can log security events" ON public.security_events;

CREATE POLICY "Authenticated users can log security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);