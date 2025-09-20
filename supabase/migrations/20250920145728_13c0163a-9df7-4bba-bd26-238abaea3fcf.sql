-- ENHANCED SECURITY: Create a secure public view for user profiles
-- This ensures that even at the database level, only safe columns are accessible for public viewing

-- 1. Create a secure view that only exposes safe, non-sensitive columns
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT 
  id,
  user_id,
  name,
  avatar_url,
  status,
  created_at,
  organization_id
FROM public.user_profiles
WHERE status = 'approved';

-- 2. Enable RLS on the view
ALTER VIEW public.public_user_profiles SET (security_barrier = true);

-- 3. Create RLS policy for the view to allow authenticated users to see approved profiles
CREATE POLICY "Authenticated users can view public profiles" 
ON public.public_user_profiles 
FOR SELECT 
TO authenticated
USING (true);

-- 4. Grant access to the view
GRANT SELECT ON public.public_user_profiles TO authenticated;

-- Note: This view completely excludes sensitive columns like:
-- - email (PII)
-- - badge_number (sensitive ID)
-- - department (organizational info)
-- - phone (contact info)
-- - verification_documents (sensitive files)
-- - approved_by (internal process info)
-- - rejection_reason (internal process info)
-- - last_login (behavior tracking)