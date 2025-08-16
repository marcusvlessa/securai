-- Add status field to user_profiles for registration approval
ALTER TABLE public.user_profiles 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add verification fields
ALTER TABLE public.user_profiles 
ADD COLUMN verification_documents TEXT[], 
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT;

-- Update existing users to approved status (backwards compatibility)
UPDATE public.user_profiles SET status = 'approved' WHERE status = 'pending';

-- Insert comprehensive list of Brazilian law enforcement organizations
INSERT INTO public.organizations (name, type, address, phone, email) VALUES 
-- Polícias Federais
('Polícia Federal', 'Federal', 'Brasília, DF', '(61) 2024-8888', 'contato@pf.gov.br'),
('Polícia Rodoviária Federal', 'Federal', 'Brasília, DF', '(61) 2024-9999', 'contato@prf.gov.br'),
('Força Nacional de Segurança Pública', 'Federal', 'Brasília, DF', '(61) 2025-1000', 'contato@forcanacional.gov.br'),

-- Polícias Civis dos Estados
('Polícia Civil do Acre', 'Estadual', 'Rio Branco, AC', '(68) 3215-4000', 'contato@pc.ac.gov.br'),
('Polícia Civil de Alagoas', 'Estadual', 'Maceió, AL', '(82) 3315-2000', 'contato@pc.al.gov.br'),
('Polícia Civil do Amapá', 'Estadual', 'Macapá, AP', '(96) 3131-3000', 'contato@pc.ap.gov.br'),
('Polícia Civil do Amazonas', 'Estadual', 'Manaus, AM', '(92) 3648-4000', 'contato@pc.am.gov.br'),
('Polícia Civil da Bahia', 'Estadual', 'Salvador, BA', '(71) 3116-6000', 'contato@pc.ba.gov.br'),
('Polícia Civil do Ceará', 'Estadual', 'Fortaleza, CE', '(85) 3101-2000', 'contato@pc.ce.gov.br'),
('Polícia Civil do Distrito Federal', 'Estadual', 'Brasília, DF', '(61) 3207-7000', 'contato@pcdf.df.gov.br'),
('Polícia Civil do Espírito Santo', 'Estadual', 'Vitória, ES', '(27) 3636-1000', 'contato@pc.es.gov.br'),
('Polícia Civil de Goiás', 'Estadual', 'Goiânia, GO', '(62) 3201-7000', 'contato@pc.go.gov.br'),
('Polícia Civil do Maranhão', 'Estadual', 'São Luís, MA', '(98) 3194-7000', 'contato@pc.ma.gov.br'),
('Polícia Civil de Mato Grosso', 'Estadual', 'Cuiabá, MT', '(65) 3613-7000', 'contato@pc.mt.gov.br'),
('Polícia Civil de Mato Grosso do Sul', 'Estadual', 'Campo Grande, MS', '(67) 3318-9000', 'contato@pc.ms.gov.br'),
('Polícia Civil de Minas Gerais', 'Estadual', 'Belo Horizonte, MG', '(31) 2123-9000', 'contato@pc.mg.gov.br'),
('Polícia Civil do Pará', 'Estadual', 'Belém, PA', '(91) 3184-3000', 'contato@pc.pa.gov.br'),
('Polícia Civil da Paraíba', 'Estadual', 'João Pessoa, PB', '(83) 3218-6000', 'contato@pc.pb.gov.br'),
('Polícia Civil do Paraná', 'Estadual', 'Curitiba, PR', '(41) 3361-0000', 'contato@pc.pr.gov.br'),
('Polícia Civil de Pernambuco', 'Estadual', 'Recife, PE', '(81) 3184-3000', 'contato@pc.pe.gov.br'),
('Polícia Civil do Piauí', 'Estadual', 'Teresina, PI', '(86) 3216-6000', 'contato@pc.pi.gov.br'),
('Polícia Civil do Rio de Janeiro', 'Estadual', 'Rio de Janeiro, RJ', '(21) 2334-9000', 'contato@pc.rj.gov.br'),
('Polícia Civil do Rio Grande do Norte', 'Estadual', 'Natal, RN', '(84) 3232-7000', 'contato@pc.rn.gov.br'),
('Polícia Civil do Rio Grande do Sul', 'Estadual', 'Porto Alegre, RS', '(51) 3288-2000', 'contato@pc.rs.gov.br'),
('Polícia Civil de Rondônia', 'Estadual', 'Porto Velho, RO', '(69) 3216-5000', 'contato@pc.ro.gov.br'),
('Polícia Civil de Roraima', 'Estadual', 'Boa Vista, RR', '(95) 2121-9000', 'contato@pc.rr.gov.br'),
('Polícia Civil de Santa Catarina', 'Estadual', 'Florianópolis, SC', '(48) 3665-8000', 'contato@pc.sc.gov.br'),
('Polícia Civil de São Paulo', 'Estadual', 'São Paulo, SP', '(11) 3311-3000', 'contato@pc.sp.gov.br'),
('Polícia Civil de Sergipe', 'Estadual', 'Aracaju, SE', '(79) 3205-8000', 'contato@pc.se.gov.br'),
('Polícia Civil de Tocantins', 'Estadual', 'Palmas, TO', '(63) 3218-7000', 'contato@pc.to.gov.br'),

-- Polícias Militares dos Estados
('Polícia Militar do Acre', 'Estadual', 'Rio Branco, AC', '(68) 3223-4000', 'contato@pm.ac.gov.br'),
('Polícia Militar de Alagoas', 'Estadual', 'Maceió, AL', '(82) 3315-5000', 'contato@pm.al.gov.br'),
('Polícia Militar do Amapá', 'Estadual', 'Macapá, AP', '(96) 3131-4000', 'contato@pm.ap.gov.br'),
('Polícia Militar do Amazonas', 'Estadual', 'Manaus, AM', '(92) 3648-5000', 'contato@pm.am.gov.br'),
('Polícia Militar da Bahia', 'Estadual', 'Salvador, BA', '(71) 3116-7000', 'contato@pm.ba.gov.br'),
('Polícia Militar do Ceará', 'Estadual', 'Fortaleza, CE', '(85) 3101-3000', 'contato@pm.ce.gov.br'),
('Polícia Militar do Distrito Federal', 'Estadual', 'Brasília, DF', '(61) 3190-8000', 'contato@pmdf.df.gov.br'),
('Polícia Militar do Espírito Santo', 'Estadual', 'Vitória, ES', '(27) 3636-2000', 'contato@pm.es.gov.br'),
('Polícia Militar de Goiás', 'Estadual', 'Goiânia, GO', '(62) 3201-8000', 'contato@pm.go.gov.br'),
('Polícia Militar do Maranhão', 'Estadual', 'São Luís, MA', '(98) 3194-8000', 'contato@pm.ma.gov.br'),
('Polícia Militar de Mato Grosso', 'Estadual', 'Cuiabá, MT', '(65) 3613-8000', 'contato@pm.mt.gov.br'),
('Polícia Militar de Mato Grosso do Sul', 'Estadual', 'Campo Grande, MS', '(67) 3318-7000', 'contato@pm.ms.gov.br'),
('Polícia Militar de Minas Gerais', 'Estadual', 'Belo Horizonte, MG', '(31) 2123-8000', 'contato@pm.mg.gov.br'),
('Polícia Militar do Pará', 'Estadual', 'Belém, PA', '(91) 3184-4000', 'contato@pm.pa.gov.br'),
('Polícia Militar da Paraíba', 'Estadual', 'João Pessoa, PB', '(83) 3218-7000', 'contato@pm.pb.gov.br'),
('Polícia Militar do Paraná', 'Estadual', 'Curitiba, PR', '(41) 3361-1000', 'contato@pm.pr.gov.br'),
('Polícia Militar de Pernambuco', 'Estadual', 'Recife, PE', '(81) 3184-4000', 'contato@pm.pe.gov.br'),
('Polícia Militar do Piauí', 'Estadual', 'Teresina, PI', '(86) 3216-7000', 'contato@pm.pi.gov.br'),
('Polícia Militar do Rio de Janeiro', 'Estadual', 'Rio de Janeiro, RJ', '(21) 2334-8000', 'contato@pm.rj.gov.br'),
('Polícia Militar do Rio Grande do Norte', 'Estadual', 'Natal, RN', '(84) 3232-8000', 'contato@pm.rn.gov.br'),
('Polícia Militar do Rio Grande do Sul', 'Estadual', 'Porto Alegre, RS', '(51) 3288-1000', 'contato@pm.rs.gov.br'),
('Polícia Militar de Rondônia', 'Estadual', 'Porto Velho, RO', '(69) 3216-6000', 'contato@pm.ro.gov.br'),
('Polícia Militar de Roraima', 'Estadual', 'Boa Vista, RR', '(95) 2121-8000', 'contato@pm.rr.gov.br'),
('Polícia Militar de Santa Catarina', 'Estadual', 'Florianópolis, SC', '(48) 3665-9000', 'contato@pm.sc.gov.br'),
('Polícia Militar de São Paulo', 'Estadual', 'São Paulo, SP', '(11) 3311-4000', 'contato@pm.sp.gov.br'),
('Polícia Militar de Sergipe', 'Estadual', 'Aracaju, SE', '(79) 3205-9000', 'contato@pm.se.gov.br'),
('Polícia Militar de Tocantins', 'Estadual', 'Palmas, TO', '(63) 3218-8000', 'contato@pm.to.gov.br'),

-- Órgãos Federais de Investigação
('Receita Federal do Brasil', 'Federal', 'Brasília, DF', '(61) 2024-7000', 'contato@receita.fazenda.gov.br'),
('Agência Brasileira de Inteligência - ABIN', 'Federal', 'Brasília, DF', '(61) 2024-6000', 'contato@abin.gov.br'),
('Controladoria-Geral da União - CGU', 'Federal', 'Brasília, DF', '(61) 2020-6000', 'contato@cgu.gov.br'),
('Tribunal de Contas da União - TCU', 'Federal', 'Brasília, DF', '(61) 3316-5000', 'contato@tcu.gov.br'),

-- Ministérios Públicos
('Ministério Público Federal', 'Federal', 'Brasília, DF', '(61) 3105-6000', 'contato@mpf.mp.br'),
('Ministério Público do Acre', 'Estadual', 'Rio Branco, AC', '(68) 3215-5000', 'contato@mpac.mp.br'),
('Ministério Público de Alagoas', 'Estadual', 'Maceió, AL', '(82) 3315-6000', 'contato@mpal.mp.br'),
('Ministério Público do Amapá', 'Estadual', 'Macapá, AP', '(96) 3131-5000', 'contato@mpap.mp.br'),
('Ministério Público do Amazonas', 'Estadual', 'Manaus, AM', '(92) 3648-6000', 'contato@mpam.mp.br'),
('Ministério Público do Ceará', 'Estadual', 'Fortaleza, CE', '(85) 3101-4000', 'contato@mpce.mp.br'),
('Ministério Público do Distrito Federal e Territórios', 'Estadual', 'Brasília, DF', '(61) 3343-9000', 'contato@mpdft.mp.br'),
('Ministério Público do Espírito Santo', 'Estadual', 'Vitória, ES', '(27) 3636-3000', 'contato@mpes.mp.br'),
('Ministério Público de Goiás', 'Estadual', 'Goiânia, GO', '(62) 3201-9000', 'contato@mpgo.mp.br'),
('Ministério Público do Maranhão', 'Estadual', 'São Luís, MA', '(98) 3194-9000', 'contato@mpma.mp.br'),
('Ministério Público de Mato Grosso', 'Estadual', 'Cuiabá, MT', '(65) 3613-9000', 'contato@mpmt.mp.br'),
('Ministério Público de Mato Grosso do Sul', 'Estadual', 'Campo Grande, MS', '(67) 3318-8000', 'contato@mpms.mp.br'),
('Ministério Público de Minas Gerais', 'Estadual', 'Belo Horizonte, MG', '(31) 3330-8000', 'contato@mpmg.mp.br'),
('Ministério Público do Pará', 'Estadual', 'Belém, PA', '(91) 3184-5000', 'contato@mppa.mp.br'),
('Ministério Público da Paraíba', 'Estadual', 'João Pessoa, PB', '(83) 3218-8000', 'contato@mppb.mp.br'),
('Ministério Público do Paraná', 'Estadual', 'Curitiba, PR', '(41) 3250-4000', 'contato@mppr.mp.br'),
('Ministério Público de Pernambuco', 'Estadual', 'Recife, PE', '(81) 3182-8000', 'contato@mppe.mp.br'),
('Ministério Público do Piauí', 'Estadual', 'Teresina, PI', '(86) 3216-8000', 'contato@mppi.mp.br'),
('Ministério Público do Rio de Janeiro', 'Estadual', 'Rio de Janeiro, RJ', '(21) 2550-9000', 'contato@mprj.mp.br'),
('Ministério Público do Rio Grande do Norte', 'Estadual', 'Natal, RN', '(84) 3232-9000', 'contato@mprn.mp.br'),
('Ministério Público do Rio Grande do Sul', 'Estadual', 'Porto Alegre, RS', '(51) 3295-1000', 'contato@mprs.mp.br'),
('Ministério Público de Rondônia', 'Estadual', 'Porto Velho, RO', '(69) 3216-7000', 'contato@mpro.mp.br'),
('Ministério Público de Roraima', 'Estadual', 'Boa Vista, RR', '(95) 2121-7000', 'contato@mprr.mp.br'),
('Ministério Público de Santa Catarina', 'Estadual', 'Florianópolis, SC', '(48) 3229-9000', 'contato@mpsc.mp.br'),
('Ministério Público de São Paulo', 'Estadual', 'São Paulo, SP', '(11) 3119-9000', 'contato@mpsp.mp.br'),
('Ministério Público de Sergipe', 'Estadual', 'Aracaju, SE', '(79) 3205-7000', 'contato@mpse.mp.br'),
('Ministério Público de Tocantins', 'Estadual', 'Palmas, TO', '(63) 3218-9000', 'contato@mpto.mp.br');

-- Create RLS policy for registration status
CREATE POLICY "Users can only see approved profiles in organization lookup" 
ON public.user_profiles 
FOR SELECT 
USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Update existing RLS policies to respect status
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and delegados can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins and delegados can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'delegado'::app_role));