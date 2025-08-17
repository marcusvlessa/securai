import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { Key, Bot, Database, HardDrive, Globe, Languages, Lock, AlertTriangle, Info, EyeOff, Eye, CheckCircle, Camera, Brain, Volume2 } from 'lucide-react';
import { getGroqSettings, saveGroqSettings, GroqSettings, hasValidApiKey } from '../services/groqService';

const Settings = () => {
  const [settings, setSettings] = useState<GroqSettings>({
    groqApiKey: '',
    groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    groqModel: 'llama-3.2-90b-vision-preview', // Modelo padrão para análise de imagem (disponível)
    model: 'llama-3.2-90b-vision-preview', // Modelo padrão para análise de imagem (disponível)
    whisperModel: 'whisper-large-v3',
    whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
    language: 'pt',
    imageAnalysisEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    imageAnalysisModel: 'llama-3.2-90b-vision-preview'
  });
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isEncryption, setIsEncryption] = useState<boolean>(false);
  const [localStorageSize, setLocalStorageSize] = useState<string>('0 KB');
  const [showFullApiKey, setShowFullApiKey] = useState<boolean>(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean>(false);
  
  useEffect(() => {
    // Load settings on mount
    const savedSettings = getGroqSettings();
    
    // Hide the actual API key and just put placeholders if it exists
    const displaySettings = {...savedSettings};
    
    if (savedSettings.groqApiKey) {
      // For display purposes, mask the API key
      const apiKeyLength = savedSettings.groqApiKey.length;
      displaySettings.groqApiKey = showFullApiKey 
        ? savedSettings.groqApiKey
        : `gsk_${new Array(apiKeyLength - 8).fill('•').join('')}${savedSettings.groqApiKey.slice(-4)}`;
      
      // Debug log
      console.log(`API key loaded in settings, length: ${apiKeyLength}`);
    }
    
    setSettings(displaySettings);
    setApiKeyValid(hasValidApiKey());
    
    // Get current theme preference
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Calculate localStorage usage
    calculateLocalStorageSize();
  }, [showFullApiKey]);
  
  const calculateLocalStorageSize = () => {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
      }
      
      // Convert to KB or MB for display
      const sizeInKB = totalSize / 1024;
      if (sizeInKB < 1024) {
        setLocalStorageSize(`${sizeInKB.toFixed(2)} KB`);
      } else {
        setLocalStorageSize(`${(sizeInKB / 1024).toFixed(2)} MB`);
      }
    } catch (error) {
      console.error('Error calculating localStorage size:', error);
      setLocalStorageSize('Erro ao calcular');
    }
  };
  
  const handleSettingsChange = (field: keyof GroqSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveSettings = () => {
    try {
      const existingSettings = getGroqSettings();
      
      // If the API key looks masked, keep the existing one
      let apiKey = settings.groqApiKey;
      if (settings.groqApiKey.includes('•')) {
        apiKey = existingSettings.groqApiKey;
        console.log('Using existing API key from settings');
      } else {
        // Trim the API key to remove any accidental whitespace
        apiKey = settings.groqApiKey.trim();
        console.log(`New API key with length: ${apiKey.length}`);
      }
      
      // Create the settings to save
      const newSettings: GroqSettings = {
        ...settings,
        groqApiKey: apiKey
      };
      
      // Display warning for empty API key
      if (!newSettings.groqApiKey.trim()) {
        toast.warning('Chave da API GROQ não configurada. A funcionalidade de IA será limitada.');
      } else if (!newSettings.groqApiKey.startsWith('gsk_')) {
        toast.warning('A chave API GROQ normalmente começa com "gsk_". Verifique se ela está correta.');
      }
      
      saveGroqSettings(newSettings);
      
      // Update API key valid status
      setApiKeyValid(hasValidApiKey());
      
      // Dispatch custom event to notify other components
      document.dispatchEvent(new Event('apiKeyUpdated'));
      
      toast.success('Configurações salvas com sucesso');
      
      // Force a storage event to notify other tabs
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };
  
  const handleToggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    toast.success(`Tema ${newDarkMode ? 'escuro' : 'claro'} ativado`);
  };
  
  const handleToggleEncryption = () => {
    setIsEncryption(!isEncryption);
    toast.info('Funcionalidade de criptografia em desenvolvimento');
  };
  
  const handleClearLocalStorage = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados locais? Esta ação não pode ser desfeita.')) {
      try {
        // Save API settings first
        const apiSettings = getGroqSettings();
        
        // Clear all data
        localStorage.clear();
        
        // Restore API settings
        saveGroqSettings(apiSettings);
        
        toast.success('Todos os dados foram removidos com sucesso');
        calculateLocalStorageSize();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
        toast.error('Erro ao limpar dados locais');
      }
    }
  };
  
  const handleExportData = () => {
    try {
      const data = JSON.stringify(localStorage);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `securai-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Dados exportados com sucesso');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    }
  };
  
  const toggleApiKeyVisibility = () => {
    setShowFullApiKey(!showFullApiKey);
  };
  
  return (
    <div className="page-container py-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Key className="h-8 w-8 text-brand" />
          Configurações
        </h1>
        <p className="page-description">
          Configure as preferências do sistema e conexões de API
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configurações da API
            </CardTitle>
            <CardDescription>Configure sua conexão com a API GROQ para análise de IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groqApiKey">Chave da API GROQ</Label>
              <div className="flex gap-2">
                <Input
                  id="groqApiKey" 
                  type={showFullApiKey ? "text" : "password"}
                  value={settings.groqApiKey} 
                  onChange={(e) => handleSettingsChange('groqApiKey', e.target.value)}
                  placeholder="Insira sua chave da API GROQ (ex: gsk_...)"
                  className={apiKeyValid ? "border-green-300" : "border-yellow-300 focus:ring-yellow-500"}
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline"
                  onClick={toggleApiKeyVisibility}
                  title={showFullApiKey ? "Ocultar chave" : "Mostrar chave"}
                >
                  {showFullApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {!apiKeyValid && (
                <div className="flex items-center gap-2 text-yellow-600 mt-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>A API GROQ requer uma chave válida para funcionar</span>
                </div>
              )}
              {apiKeyValid && (
                <div className="flex items-center gap-2 text-green-600 mt-1 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  <span>Chave da API configurada corretamente</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-blue-600 mt-1 text-xs">
                <Info className="h-3 w-3" />
                <span>Obtenha sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys</a></span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="groqEndpoint">Endpoint da API</Label>
              <Input
                id="groqEndpoint" 
                value={settings.groqApiEndpoint}
                onChange={(e) => handleSettingsChange('groqApiEndpoint', e.target.value)}
                placeholder="https://api.groq.com/openai/v1/chat/completions"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="groqModel">Modelo de LLM</Label>
              <Select 
                value={settings.groqModel} 
                onValueChange={(value) => handleSettingsChange('groqModel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modelos de Análise de Imagem (Prioritários)</SelectLabel>
                    <SelectItem value="llama-3.3-70b-versatile">🎯 Llama 3.3 70B Versatile (RECOMENDADO - Especializado em Imagens)</SelectItem>
                    <SelectItem value="llama-3.2-70b-versatile">Llama 3.2 70B Versatile</SelectItem>
                    <SelectItem value="llama-3.1-8b-instruct">Llama 3.1 8B Instruct</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Modelos de Texto</SelectLabel>
                    <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B</SelectItem>
                    <SelectItem value="llama3-70b-8192">Llama 3 70B</SelectItem>
                    <SelectItem value="llama3-8b-8192">Llama 3 8B</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Modelos de Segurança</SelectLabel>
                    <SelectItem value="llama-guard-3-8b">Llama Guard 3 8B</SelectItem>
                    <SelectItem value="meta-llama/Llama-Guard-4-12B">Llama Guard 4 12B</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} className="w-full">Salvar Configurações</Button>
          </CardFooter>
        </Card>

        {/* Image Analysis Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Configurações de Análise de Imagem
            </CardTitle>
            <CardDescription>Configure especificamente para análise forense de imagens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                 <div className="flex items-center gap-2 text-blue-800 mb-2">
                     <Brain className="h-4 w-4" />
                     <span className="font-medium">Modelo Prioritário: Llama 3.3 70B Versatile</span>
                   </div>
                   <p className="text-sm text-blue-700">
                     Especializado em análise de imagem, OCR, detecção facial e reconhecimento de objetos para investigações criminais.
                   </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageAnalysisModel">Modelo para Análise de Imagem</Label>
              <Select 
                value={settings.imageAnalysisModel} 
                onValueChange={(value) => handleSettingsChange('imageAnalysisModel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo para análise de imagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modelos Especializados em Imagem</SelectLabel>
                    <SelectItem value="llama-3.3-70b-versatile">🎯 Llama 3.3 70B Versatile (RECOMENDADO)</SelectItem>
                    <SelectItem value="llama-3.2-70b-versatile">Llama 3.2 70B Versatile</SelectItem>
                    <SelectItem value="llama-3.1-8b-instruct">Llama 3.1 8B Instruct</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Este modelo será usado especificamente para análise de imagens e visão computacional
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageAnalysisEndpoint">Endpoint para Análise de Imagem</Label>
              <Input
                id="imageAnalysisEndpoint" 
                value={settings.imageAnalysisEndpoint}
                onChange={(e) => handleSettingsChange('imageAnalysisEndpoint', e.target.value)}
                placeholder="https://api.groq.com/openai/v1/chat/completions"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Endpoint específico para requisições de análise de imagem
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Capacidades Automáticas</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>OCR Automático:</strong> Extração completa de texto</li>
                <li>• <strong>Detecção Facial:</strong> Identificação automática de rostos</li>
                <li>• <strong>Reconhecimento de Placas:</strong> Formato brasileiro e Mercosul</li>
                <li>• <strong>Análise de Objetos:</strong> Classificação automática</li>
                <li>• <strong>Relatório Completo:</strong> Geração automática de relatórios</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} className="w-full">Salvar Configurações de Imagem</Button>
          </CardFooter>
        </Card>

        {/* Audio Analysis Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Configurações de Análise de Áudio
            </CardTitle>
            <CardDescription>Configure especificamente para transcrição e análise de áudio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-purple-800 mb-2">
                <Brain className="h-4 w-4" />
                <span className="font-medium">Modelo Prioritário: Whisper Large V3</span>
              </div>
              <p className="text-sm text-purple-700">
                Especializado em transcrição de áudio com alta precisão e suporte a múltiplos idiomas para investigações criminais.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whisperModel">Modelo Whisper para Transcrição</Label>
              <Select 
                value={settings.whisperModel} 
                onValueChange={(value) => handleSettingsChange('whisperModel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo Whisper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modelos Whisper Disponíveis</SelectLabel>
                    <SelectItem value="whisper-large-v3">🎯 Whisper Large V3 (RECOMENDADO - Máxima Precisão)</SelectItem>
                    <SelectItem value="whisper-large-v2">Whisper Large V2</SelectItem>
                    <SelectItem value="whisper-medium">Whisper Medium</SelectItem>
                    <SelectItem value="whisper-small">Whisper Small</SelectItem>
                    <SelectItem value="whisper-tiny">Whisper Tiny (Rápido)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Este modelo será usado especificamente para transcrição de áudio via API GROQ
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whisperApiEndpoint">Endpoint para Transcrição de Áudio</Label>
              <Input
                id="whisperApiEndpoint" 
                value={settings.whisperApiEndpoint}
                onChange={(e) => handleSettingsChange('whisperApiEndpoint', e.target.value)}
                placeholder="https://api.groq.com/openai/v1/audio/transcriptions"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Endpoint específico para requisições de transcrição de áudio
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma para Transcrição</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingsChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o idioma principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">🇧🇷 Português (Brasil) - RECOMENDADO</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="auto">🔍 Detecção Automática</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Idioma principal para transcrição de áudio (Whisper detecta automaticamente outros idiomas)
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Capacidades Automáticas de Áudio</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Transcrição Automática:</strong> Conversão de áudio para texto</li>
                <li>• <strong>Compressão Inteligente:</strong> Redução automática de arquivos grandes</li>
                <li>• <strong>Divisão em Chunks:</strong> Processamento de áudios longos</li>
                <li>• <strong>Speaker Diarization:</strong> Identificação de diferentes falantes</li>
                <li>• <strong>Suporte Multi-idioma:</strong> Detecção automática de idiomas</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Info className="h-4 w-4" />
                <span className="font-medium">Limitações e Recomendações</span>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Tamanho máximo:</strong> 25MB por arquivo</li>
                <li>• <strong>Tamanho recomendado:</strong> Até 5MB para melhor performance</li>
                <li>• <strong>Formatos suportados:</strong> WAV, MP3, MP4, OPUS, M4A, FLAC, AAC, OGG</li>
                <li>• <strong>Compressão automática:</strong> Arquivos grandes são comprimidos automaticamente</li>
                <li>• <strong>Chunking automático:</strong> Áudios muito longos são divididos em partes</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} className="w-full">Salvar Configurações de Áudio</Button>
          </CardFooter>
        </Card>
        
        {/* System Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <CardDescription>Personalize a experiência e aparência do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo Escuro</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Alternar entre modo claro e escuro</p>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={handleToggleTheme} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Criptografia de Dados</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ativar criptografia para dados sensíveis</p>
              </div>
              <Switch checked={isEncryption} onCheckedChange={handleToggleEncryption} />
            </div>
            

          </CardContent>
        </Card>
        
        {/* Data Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gerenciamento de Dados
            </CardTitle>
            <CardDescription>Gerencie dados locais e exportações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Armazenamento local utilizado</p>
              <p className="text-xl font-bold">{localStorageSize}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <Button variant="outline" onClick={handleExportData}>Exportar Dados</Button>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    const { clearAllData } = require('../services/seedDataService');
                    if (window.confirm('Isso irá apagar todos os dados. Tem certeza?')) {
                      clearAllData();
                      window.location.reload();
                    }
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  Limpar Todos os Dados
                </Button>
                <Button 
                  onClick={handleClearLocalStorage}
                  variant="outline" 
                  className="flex-1"
                >
                  Limpar Apenas Cache
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-gray-500 dark:text-gray-400 w-full text-center">
              Todos os dados são armazenados apenas localmente no seu navegador
            </p>
          </CardFooter>
        </Card>
        
        {/* About Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Sobre o Sistema
            </CardTitle>
            <CardDescription>Informações sobre o SecurAI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">SecurAI - Sistema de Análise Investigativa com IA</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Versão 1.0.0</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium">Tecnologias</p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• React + TypeScript</li>
                <li>• API GROQ para processamento de IA</li>
                <li>• Llama 3.3 70B Versatile para análise de imagem</li>
                <li>• Whisper Large V3 para transcrição de áudio</li>
                <li>• Armazenamento local para privacidade</li>
              </ul>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium">Modelos Prioritários</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Llama 3.3 70B Versatile</strong> para análise forense de imagens e <strong>Whisper Large V3</strong> para transcrição de áudio com detecção automática completa
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium">Desenvolvido por</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Equipe de Desenvolvimento SecurAI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
