# 🚀 Secur:AI - Sistema de Inteligência Artificial para Investigação Criminal

## 📋 Descrição

O **Secur:AI** é um sistema avançado de investigação criminal baseado em inteligência artificial, desenvolvido especificamente para **Polícias** e **Órgãos de Segurança Pública** brasileiros. O sistema oferece análise forense automatizada, gestão de casos inteligente e ferramentas de investigação baseadas em IA.

## ✨ Características Principais

- 🔍 **Análise Forense com IA**: Processamento automático de evidências visuais, sonoras e documentais
- 📊 **Dashboard Inteligente**: Visão consolidada de casos, estatísticas e insights
- 🎯 **Gestão de Casos**: Sistema completo de rastreamento e organização de investigações
- 🤖 **Agentes Virtuais**: Assistente de IA especializado para diferentes tipos de análise
- 🔐 **Segurança de Nível Militar**: Autenticação robusta e criptografia de dados
- 📱 **Interface Responsiva**: Funciona perfeitamente em desktop e dispositivos móveis
- 🌐 **Multi-organização**: Suporte para diferentes órgãos de segurança

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **IA**: GROQ API (Llama 3.2, Whisper)
- **Deploy**: Vercel/Netlify ready
- **Testes**: Vitest + Testing Library

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/securai.git
cd securai
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
VITE_GROQ_API_KEY=sua_chave_api_groq
```

### 4. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrações SQL em `supabase/migrations/`
3. Configure as políticas de segurança (RLS)
4. Configure o bucket de storage para evidências

### 5. Execute o projeto

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 📁 Estrutura do Projeto

```
securai/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   ├── pages/              # Páginas da aplicação
│   ├── contexts/           # Contextos React (Auth, Cases)
│   ├── services/           # Serviços de API e IA
│   ├── hooks/              # Hooks customizados
│   ├── lib/                # Utilitários e configurações
│   └── integrations/       # Integrações externas
├── supabase/               # Configurações e migrações
├── public/                 # Assets estáticos
└── dist/                   # Build de produção
```

## 🔧 Funcionalidades Implementadas

### ✅ Sistema de Autenticação
- Login/Registro com Supabase
- Controle de acesso baseado em roles
- Recuperação de senha
- Perfis de usuário personalizados

### ✅ Gestão de Casos
- Criação e edição de casos
- Categorização e priorização
- Sistema de tags e metadados
- Histórico de alterações

### ✅ Upload e Análise de Evidências
- Suporte a múltiplos formatos de arquivo
- Armazenamento seguro no Supabase Storage
- Análise automática com IA
- Metadados e categorização

### ✅ Dashboard Inteligente
- Estatísticas em tempo real
- Gráficos e visualizações
- Métricas de performance
- Alertas e notificações

### ✅ Agentes Virtuais
- Configuração de agentes especializados
- Execução automática de tarefas
- Integração com serviços externos
- Monitoramento de performance

## 🚀 Deploy para Produção

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Netlify

1. Conecte seu repositório ao Netlify
2. Configure o build command: `npm run build`
3. Configure o publish directory: `dist`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔒 Segurança e Compliance

### LGPD
- ✅ Política de privacidade implementada
- ✅ Consentimento de dados
- ✅ Direito ao esquecimento
- ✅ Criptografia de dados sensíveis

### Segurança
- ✅ Autenticação JWT
- ✅ Row Level Security (RLS)
- ✅ Validação de inputs
- ✅ Sanitização de dados
- ✅ HTTPS obrigatório

## 📊 Métricas de Performance

- **Tempo de carregamento**: < 3 segundos
- **Taxa de erro**: < 1%
- **Disponibilidade**: > 99.9%
- **Cobertura de testes**: > 80%

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage

# Testes E2E
npm run test:e2e
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Documentação**: [docs.securai.com](https://docs.securai.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/securai/issues)
- **Email**: suporte@securai.com
- **Discord**: [Comunidade Secur:AI](https://discord.gg/securai)

## 🙏 Agradecimentos

- **Polícia Civil de São Paulo** - Parceiro de desenvolvimento
- **Supabase** - Infraestrutura de backend
- **GROQ** - Serviços de IA
- **Comunidade open source** - Contribuições e feedback

---

**Desenvolvido com ❤️ para a segurança pública brasileira**

© 2024 Secur:AI. Todos os direitos reservados.
