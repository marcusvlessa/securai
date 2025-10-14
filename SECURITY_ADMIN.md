# Guia de Administração e Segurança - SecurAI

Este documento contém informações essenciais para administradores do sistema SecurAI sobre gerenciamento de usuários, roles e boas práticas de segurança.

## 📋 Índice

1. [Sistema de Roles](#sistema-de-roles)
2. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
3. [Promoção e Remoção de Admins](#promoção-e-remoção-de-admins)
4. [Auditoria e Logs](#auditoria-e-logs)
5. [Boas Práticas de Segurança](#boas-práticas-de-segurança)
6. [Troubleshooting](#troubleshooting)

---

## Sistema de Roles

O SecurAI utiliza um sistema de roles (funções) baseado em PostgreSQL Enum com as seguintes hierarquias:

### Roles Disponíveis

| Role | Descrição | Permissões |
|------|-----------|------------|
| **admin** | Administrador do sistema | Acesso total, gerenciamento de usuários, configurações |
| **delegado** | Delegado de polícia | Acesso a casos, visualização de usuários da organização |
| **investigator** | Investigador | Criação e gerenciamento de casos próprios |
| **analyst** | Analista | Análise de dados, sem criação de casos |
| **viewer** | Visualizador | Apenas leitura de casos compartilhados |

### Como o Sistema de Roles Funciona

```sql
-- Estrutura da tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

**Importante:** 
- Cada usuário pode ter múltiplas roles
- As roles são armazenadas em uma tabela separada (não no perfil do usuário)
- Isso previne ataques de escalação de privilégios

---

## Gerenciamento de Usuários

### Aprovar Novo Usuário

1. Acesse `/admin-panel`
2. Visualize a lista de usuários pendentes
3. Revise as informações do usuário:
   - Nome completo
   - Email institucional
   - Número de matrícula
   - Departamento/Organização
4. Clique em "Aprovar" ou "Rejeitar"

### Verificação Manual via SQL

```sql
-- Listar todos os usuários pendentes
SELECT 
  up.id,
  up.email,
  up.name,
  up.badge_number,
  up.status,
  up.created_at
FROM user_profiles up
WHERE up.status = 'pending'
ORDER BY up.created_at DESC;

-- Aprovar usuário específico
UPDATE user_profiles
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = 'SEU_USER_ID_AQUI'
WHERE email = 'usuario@exemplo.com';
```

---

## Promoção e Remoção de Admins

### ⚠️ Proteções de Segurança

O sistema possui proteções automáticas:

1. **Não é possível remover o último admin**
   - Um trigger impede a remoção do último administrador
   - Sempre deve haver pelo menos um admin no sistema

2. **Auditoria automática**
   - Todas as mudanças de role são registradas
   - Logs incluem: quem fez a mudança, quando e qual foi a alteração

### Promover Usuário para Admin

#### Via SQL (Recomendado)

```sql
-- Promover usuário para admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'usuario@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se a promoção funcionou
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'usuario@exemplo.com';
```

#### Via Função de Inicialização

Se não houver nenhum admin no sistema:

```sql
-- Promove o primeiro usuário cadastrado para admin
SELECT initialize_first_admin();
```

### Remover Admin (com Cuidado!)

```sql
-- Verificar quantos admins existem
SELECT COUNT(*) as total_admins
FROM user_roles
WHERE role = 'admin';

-- Remover role de admin (somente se houver mais de 1 admin)
DELETE FROM user_roles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'usuario@exemplo.com'
)
AND role = 'admin';
```

**⚠️ ATENÇÃO:** O sistema bloqueará automaticamente se você tentar remover o último admin!

---

## Auditoria e Logs

### Visualizar Logs de Segurança

```sql
-- Ver todas as mudanças de role dos últimos 30 dias
SELECT 
  se.id,
  se.created_at,
  se.event_type,
  se.event_data,
  u.email as user_email
FROM security_events se
LEFT JOIN auth.users u ON u.id = (se.event_data->>'user_id')::uuid
WHERE se.event_type IN ('role_assigned', 'role_changed', 'role_removed')
  AND se.created_at >= NOW() - INTERVAL '30 days'
ORDER BY se.created_at DESC;

-- Ver ações de um usuário específico
SELECT 
  se.id,
  se.created_at,
  se.event_type,
  se.event_data
FROM security_events se
WHERE se.user_id = 'USER_ID_AQUI'
ORDER BY se.created_at DESC
LIMIT 100;
```

### Eventos de Auditoria Registrados

| Evento | Descrição |
|--------|-----------|
| `role_assigned` | Nova role atribuída a um usuário |
| `role_changed` | Role de um usuário foi modificada |
| `role_removed` | Role foi removida de um usuário |
| `login` | Login bem-sucedido |
| `failed_login` | Tentativa de login falhou |
| `unauthorized_access` | Tentativa de acesso a recurso não autorizado |

---

## Boas Práticas de Segurança

### ✅ DO (Faça)

1. **Revise regularmente os usuários pendentes**
   - Acesse o painel admin pelo menos uma vez por semana
   - Verifique a legitimidade dos pedidos de acesso

2. **Mantenha múltiplos admins**
   - Tenha pelo menos 2-3 admins ativos
   - Distribua a responsabilidade

3. **Monitore os logs de auditoria**
   - Revise eventos suspeitos mensalmente
   - Investigue acessos não autorizados

4. **Use emails institucionais**
   - Exija que usuários se cadastrem com email institucional
   - Valide a identidade antes de aprovar

5. **Implemente rotação de senhas**
   - Oriente usuários a trocarem senhas periodicamente
   - Use senhas fortes (mínimo 12 caracteres)

### ❌ DON'T (Não Faça)

1. **Nunca armazene roles em localStorage**
   - Todas as verificações devem ser server-side
   - Não confie em dados do cliente

2. **Não remova todos os admins**
   - Sempre mantenha pelo menos um admin ativo
   - O sistema bloqueará, mas é melhor prevenir

3. **Não aprove usuários sem verificar**
   - Sempre valide emails institucionais
   - Verifique matrícula/documento quando possível

4. **Não compartilhe credenciais de admin**
   - Cada admin deve ter sua própria conta
   - Não use contas compartilhadas

5. **Não ignore logs de segurança**
   - Investigue eventos suspeitos
   - Tome ações corretivas rapidamente

---

## Troubleshooting

### Problema: Usuário não consegue acessar após aprovação

**Solução:**
```sql
-- Verificar status do perfil
SELECT 
  up.email,
  up.status,
  up.approved_at,
  ur.role
FROM user_profiles up
LEFT JOIN user_roles ur ON ur.user_id = up.user_id
WHERE up.email = 'usuario@exemplo.com';

-- Se status está approved mas sem role, atribuir role
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'investigator'::app_role
FROM user_profiles
WHERE email = 'usuario@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Problema: "Access Denied" mesmo sendo admin

**Possíveis causas:**
1. Role não foi aplicada corretamente
2. Cache do navegador desatualizado
3. Token JWT expirado

**Solução:**
```sql
-- Verificar se role de admin existe
SELECT * FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu@email.com')
AND role = 'admin';

-- Se não existir, adicionar
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'seu@email.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Depois:
1. Faça logout
2. Limpe o cache do navegador
3. Faça login novamente

### Problema: Não consigo promover primeiro admin

**Solução:**
```sql
-- Usar função de inicialização
SELECT initialize_first_admin();

-- Verificar resultado
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

### Problema: Erro "Não é possível remover o último administrador"

**Explicação:**
- Este é um comportamento esperado do sistema
- É uma proteção de segurança

**Solução:**
1. Promova outro usuário para admin primeiro
2. Depois remova o admin que deseja

```sql
-- 1. Promover novo admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'novo-admin@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Verificar que agora há 2 admins
SELECT COUNT(*) FROM user_roles WHERE role = 'admin';

-- 3. Agora pode remover o outro admin
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin-antigo@exemplo.com')
AND role = 'admin';
```

---

## Contato e Suporte

Para questões não cobertas neste guia:

- **Suporte Técnico:** suporte@securai.com.br
- **Emergências de Segurança:** security@securai.com.br
- **Documentação:** https://docs.securai.com.br

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0.0  
**Mantido por:** Equipe SecurAI
