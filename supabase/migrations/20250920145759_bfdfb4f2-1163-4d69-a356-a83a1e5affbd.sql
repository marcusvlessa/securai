-- ENHANCED SECURITY: Create secure function for public profile access
-- This completely prevents access to sensitive columns at the database level

-- 1. Create a security definer function that returns only safe profile data
CREATE OR REPLACE FUNCTION public.get_public_user_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  status text,
  created_at timestamp with time zone,
  organization_id uuid
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    up.id,
    up.user_id,
    up.name,
    up.avatar_url,
    up.status,
    up.created_at,
    up.organization_id
  FROM public.user_profiles up
  WHERE up.status = 'approved'
    AND up.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND auth.uid() IS NOT NULL;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_user_profiles() TO authenticated;

-- 3. Create a simpler, more restrictive policy on user_profiles to block direct access to sensitive data
DROP POLICY IF EXISTS "Users can view minimal public profile info" ON public.user_profiles;

-- 4. Create a very restrictive policy that prevents any direct column access to sensitive data
CREATE POLICY "Block direct access to user profiles for non-owners" 
ON public.user_profiles 
FOR SELECT 
USING (
  -- Only allow users to see their own full profile, or admin/delegado access
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'delegado'::app_role)
);

-- Note: This approach completely blocks direct SELECT access to user_profiles
-- Applications must use the get_public_user_profiles() function for safe public access