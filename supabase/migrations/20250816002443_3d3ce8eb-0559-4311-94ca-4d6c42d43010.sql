-- Allow unauthenticated users to view organizations during registration
CREATE POLICY "Allow public read access to organizations" 
ON public.organizations 
FOR SELECT 
TO public
USING (true);

-- This policy allows anyone (including unauthenticated users) to view organizations
-- This is necessary for the registration process where users need to select their organization
-- The existing policies for INSERT, UPDATE, DELETE remain restricted to admins only