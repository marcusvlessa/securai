# 🔧 Configuração do Supabase para Secur:AI

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com)
2. Projeto criado no Supabase
3. Node.js e npm instalados

## 🚀 Passos para Configuração

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Digite um nome para o projeto (ex: "securai")
6. Escolha uma senha para o banco de dados
7. Escolha uma região (recomendado: São Paulo)
8. Clique em "Create new project"

### 2. Obter Credenciais

1. No seu projeto, vá para **Settings** > **API**
2. Copie a **URL** do projeto
3. Copie a **anon public** key

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# GROQ API Configuration
VITE_GROQ_API_KEY=sua-chave-groq-aqui

# App Configuration
VITE_APP_NAME=Secur:AI
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
```

### 4. Executar Migrações

1. Instale o CLI do Supabase:
```bash
npm install -g supabase
```

2. Execute as migrações:
```bash
supabase db push
```

### 5. Configurar Autenticação

1. No Supabase, vá para **Authentication** > **Settings**
2. Configure os provedores de email
3. Configure as URLs de redirecionamento:
   - Site URL: `http://localhost:8080`
   - Redirect URLs: `http://localhost:8080/auth/callback`

### 6. Testar o Sistema

1. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse: `http://localhost:8080`
3. Tente fazer login com um usuário de teste

## 🔍 Solução de Problemas

### Erro: "Missing Supabase environment variables"

**Solução**: Verifique se o arquivo `.env.local` existe e está configurado corretamente.

### Erro: "Invalid API key"

**Solução**: Verifique se a chave anônima está correta no arquivo `.env.local`.

### Erro: "Connection failed"

**Solução**: Verifique se a URL do Supabase está correta e se o projeto está ativo.

## 📱 Modo de Desenvolvimento

Atualmente, o sistema está configurado para funcionar em modo de desenvolvimento sem Supabase:

- ✅ Login simulado funcionando
- ✅ Acesso às páginas protegidas
- ✅ Funcionalidades básicas operacionais

Para usar o Supabase real, siga os passos acima.

## 🎯 Próximos Passos

1. Configure o Supabase seguindo este guia
2. Teste o login real
3. Configure as tabelas e políticas de segurança
4. Teste todas as funcionalidades

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console
2. Verifique a configuração do Supabase
3. Consulte a documentação oficial do Supabase
4. Abra uma issue no repositório
