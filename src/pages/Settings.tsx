import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { Key, Bot, Database, HardDrive, Globe, Languages, Lock, AlertTriangle, Info, EyeOff, Eye, CheckCircle } from 'lucide-react';
import { getGroqSettings, saveGroqSettings, GroqSettings, hasValidApiKey } from '../services/groqService';

const Settings = () => {
  const [settings, setSettings] = useState<GroqSettings>({
    groqApiKey: '',
    groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    whisperModel: 'whisper-large-v3',
    whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
    language: 'pt'
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
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      
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
                    <SelectLabel>Modelos de Produção</SelectLabel>
                    <SelectItem value="gemma2-9b-it">Gemma 2 9B</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                    <SelectItem value="llama-guard-3-8b">Llama Guard 3 8B</SelectItem>
                    <SelectItem value="llama3-70b-8192">Llama 3 70B</SelectItem>
                    <SelectItem value="llama3-8b-8192">Llama 3 8B</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Modelos de Preview</SelectLabel>
                    <SelectItem value="allam-2-7b">Allam 2 7B</SelectItem>
                    <SelectItem value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill Llama 70B</SelectItem>
                    <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick 17B</SelectItem>
                    <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B (Recomendado)</SelectItem>
                    <SelectItem value="meta-llama/Llama-Guard-4-12B">Llama Guard 4 12B</SelectItem>
                    <SelectItem value="mistral-saba-24b">Mistral Saba 24B</SelectItem>
                    <SelectItem value="qwen-qwq-32b">Qwen QWQ 32B</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Sistemas de Preview</SelectLabel>
                    <SelectItem value="compound-beta">Compound Beta</SelectItem>
                    <SelectItem value="compound-beta-mini">Compound Beta Mini</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whisperModel">Modelo de Transcrição</Label>
              <Select 
                value={settings.whisperModel} 
                onValueChange={(value) => handleSettingsChange('whisperModel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modelos de Transcrição</SelectLabel>
                    <SelectItem value="whisper-large-v3">Whisper Large V3</SelectItem>
                    <SelectItem value="whisper-large-v3-turbo">Whisper Large V3 Turbo</SelectItem>
                    <SelectItem value="distil-whisper-large-v3-en">Distil Whisper Large V3 EN</SelectItem>
                    <SelectItem value="distil-whisper-large-v3">Distil Whisper Large V3</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whisperEndpoint">Endpoint de Transcrição</Label>
              <Input
                id="whisperEndpoint" 
                value={settings.whisperApiEndpoint}
                onChange={(e) => handleSettingsChange('whisperApiEndpoint', e.target.value)}
                placeholder="https://api.groq.com/openai/v1/audio/transcriptions"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Idioma do Sistema</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingsChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} className="w-full">Salvar Configurações</Button>
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
            
            <div className="space-y-2">
              <Label htmlFor="language">Idioma do Sistema</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingsChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
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
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={handleExportData}>Exportar Dados</Button>
              <Button variant="destructive" onClick={handleClearLocalStorage}>Limpar Dados</Button>
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
                <li>• Armazenamento local para privacidade</li>
              </ul>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium">Modelos Disponíveis</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Acesso a diversos modelos para processamento de texto e áudio através da API GROQ
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
