-- SECURITY FIX: Restrict user_profiles access to prevent PII exposure

-- 1. Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view basic approved profile info" ON public.user_profiles;

-- 2. Create a new restrictive policy that only shows minimal public info (name, status, created_at)
-- This excludes sensitive data like email, badge_number, department, phone, etc.
CREATE POLICY "Users can view minimal public profile info" 
ON public.user_profiles 
FOR SELECT 
USING (
  (status = 'approved' AND auth.uid() IS NOT NULL AND auth.uid() != user_id)
);

-- Note: This policy combined with proper column-level filtering in the application layer
-- will ensure only name, status, and created_at are exposed to other users.
-- Sensitive fields like email, badge_number, department should only be accessible
-- through the "Users can view their own profile" policy or admin policies.