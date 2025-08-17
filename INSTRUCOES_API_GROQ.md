# 🔑 INSTRUÇÕES PARA CONFIGURAR A API GROQ - SECURAI

## ⚠️ PROBLEMA IDENTIFICADO

O sistema SecurAI está configurado para usar o modelo **Gemma 2 9B IT** para análise de imagem, mas a **chave da API GROQ não está configurada corretamente**.

## 🚀 SOLUÇÃO PASSO A PASSO

### 1. Obter Chave da API GROQ

1. **Acesse:** [https://console.groq.com/](https://console.groq.com/)
2. **Faça login** ou crie uma conta gratuita
3. **Vá para:** "API Keys" no menu lateral
4. **Clique em:** "Create API Key"
5. **Nome:** "SecurAI - Análise de Imagem"
6. **Copie a chave** (formato: `gsk_...`)

### 2. Configurar no SecurAI

1. **Abra o SecurAI** no navegador
2. **Vá para:** Configurações (ícone de chave)
3. **Na seção "Configurações da API":**
   - Cole sua chave da API GROQ no campo "Chave da API GROQ"
   - Clique em "Salvar Configurações"
4. **Verifique se aparece:** ✅ "Chave da API configurada corretamente"

### 3. Testar a Configuração

1. **Abra o arquivo:** `test-groq-config.html` no navegador
2. **Cole sua chave da API** no campo
3. **Clique em:** "Salvar Chave"
4. **Clique em:** "Testar Chave"
5. **Clique em:** "Listar Modelos Disponíveis"
6. **Clique em:** "Testar Análise de Imagem"

## 🔧 VERIFICAÇÃO TÉCNICA

### Modelo Configurado
- **Modelo Atual:** `gemma-2-9b-it`
- **Capacidades:** Análise de imagem, OCR, detecção facial, detecção de placas
- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`

### Arquivos de Configuração
- **Configuração:** `src/services/groqService.ts`
- **Interface:** `src/pages/Settings.tsx`
- **Análise:** `src/pages/ImageAnalysis.tsx`

## 🧪 TESTE DE FUNCIONAMENTO

### 1. Teste Básico
- Upload de imagem simples
- Análise automática com IA
- Verificação de OCR e detecções

### 2. Teste Avançado
- Múltiplas imagens
- Análise em lote
- Relatório consolidado

### 3. Verificação de Logs
- Console do navegador
- Mensagens de sucesso/erro
- Status da API

## ❌ PROBLEMAS COMUNS

### 1. "Chave da API GROQ não configurada"
- **Solução:** Configure a chave em Configurações > API GROQ

### 2. "Invalid API Key"
- **Solução:** Verifique se a chave está correta e ativa

### 3. "Model not found"
- **Solução:** O modelo `gemma-2-9b-it` deve estar disponível na sua conta

### 4. "Request too large"
- **Solução:** Reduza o tamanho da imagem ou use compressão

## 📊 STATUS ATUAL DO SISTEMA

### ✅ Funcionando
- Interface de upload de imagem
- Sistema de análise em lote
- Geração de relatórios
- Integração com casos

### ❌ Não Funcionando
- Análise de IA (falta chave da API)
- OCR automático
- Detecção facial
- Detecção de placas

### 🔄 Pendente
- Configuração da API GROQ
- Teste de conectividade
- Validação do modelo

## 🎯 PRÓXIMOS PASSOS

1. **Configure a chave da API GROQ** seguindo as instruções acima
2. **Teste a conectividade** usando o arquivo `test-groq-config.html`
3. **Verifique se a análise de imagem funciona** no SecurAI
4. **Reporte qualquer problema** encontrado

## 📞 SUPORTE

Se continuar com problemas após seguir estas instruções:

1. **Verifique o console do navegador** para erros
2. **Confirme se a chave da API está ativa** no console GROQ
3. **Teste com uma imagem simples** primeiro
4. **Verifique se há créditos disponíveis** na sua conta GROQ

---

**⚠️ IMPORTANTE:** A chave da API GROQ é necessária para que a análise de imagem funcione. Sem ela, o sistema só pode fazer upload e visualização básica das imagens.
