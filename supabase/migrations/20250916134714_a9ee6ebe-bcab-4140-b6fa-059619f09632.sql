-- Update current user's profile with complete data
UPDATE user_profiles SET 
  name = 'Marcus Investigator',
  badge_number = 'INV001', 
  department = 'Criminal Investigation',
  status = 'approved',
  approved_at = NOW(),
  approved_by = '1ded3fec-93be-493c-be18-8e4abca21b8f'
WHERE user_id = '1ded3fec-93be-493c-be18-8e4abca21b8f' AND (name IS NULL OR status = 'pending');

-- Create a default organization if needed
INSERT INTO organizations (id, name, type, address, phone, email)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Polícia Civil - Delegacia Central',
  'law_enforcement',
  'Rua das Flores, 123 - Centro',
  '(11) 3234-5678',
  'contato@policiacivil.gov.br'
) ON CONFLICT (id) DO NOTHING;

-- Link user to organization
UPDATE user_profiles 
SET organization_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
WHERE user_id = '1ded3fec-93be-493c-be18-8e4abca21b8f' AND organization_id IS NULL;