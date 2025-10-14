-- Promover usuário atual para admin
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'marcusvlessa@gmail.com'
);

-- Criar função de inicialização de primeiro admin
CREATE OR REPLACE FUNCTION public.initialize_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
  first_user_id UUID;
BEGIN
  -- Verificar se já existe algum admin
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Se não existir nenhum admin, promover o primeiro usuário
  IF admin_count = 0 THEN
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (first_user_id, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'Primeiro usuário (%) promovido para admin', first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Sistema já possui % admin(s) configurado(s)', admin_count;
  END IF;
END;
$$;

-- Criar função de proteção contra remoção do último admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Só verificar se está removendo um admin
  IF OLD.role = 'admin' THEN
    -- Contar admins restantes (excluindo o que está sendo removido)
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND user_id != OLD.user_id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador do sistema';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar trigger de proteção
DROP TRIGGER IF EXISTS protect_last_admin ON public.user_roles;
CREATE TRIGGER protect_last_admin
BEFORE DELETE ON public.user_roles
FOR EACH ROW
WHEN (OLD.role = 'admin')
EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Criar função de auditoria para mudanças de role
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'role_assigned',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM public.log_security_event(
      'role_changed',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_removed',
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger de auditoria
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();