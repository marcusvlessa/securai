-- Fix security function search path issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  profile_data JSONB;
BEGIN
  profile_data := NEW.raw_user_meta_data;
  
  -- Insert user profile
  INSERT INTO public.user_profiles (
    user_id,
    email,
    name,
    badge_number,
    department,
    organization_id
  ) VALUES (
    NEW.id,
    NEW.email,
    profile_data->>'name',
    profile_data->>'badge_number',
    profile_data->>'department',
    (profile_data->>'organization_id')::UUID
  );
  
  -- Assign default role (investigator)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'investigator');
  
  RETURN NEW;
END;
$function$;

-- Restrict organization access to only users within the same organization
DROP POLICY IF EXISTS "Organizations are viewable by authenticated users" ON public.organizations;

CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.user_profiles 
    WHERE organization_id = organizations.id
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);