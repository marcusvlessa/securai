
import React, { useState, useEffect } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { Clipboard, Pencil, Send, AlertTriangle, Upload, Check } from 'lucide-react';
import { makeGroqAIRequest, getGroqSettings, hasValidApiKey } from '../services/groqService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { parsePdfToText } from '../services/databaseService';
import { Input } from './ui/input';

interface ManualOccurrenceInputProps {
  onAnalysisComplete: (analysis: string) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

const ManualOccurrenceInput = ({ 
  onAnalysisComplete, 
  isProcessing, 
  setIsProcessing 
}: ManualOccurrenceInputProps) => {
  const [manualText, setManualText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('manual');
  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Check if API key is configured on component mount and whenever settings might change
  useEffect(() => {
    checkApiKey();
    
    // Set up listener for storage events to detect settings changes
    const handleStorageChange = () => {
      checkApiKey();
    };
    
    // Also listen for custom event when API key is updated
    const handleApiKeyUpdate = () => {
      checkApiKey();
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('apiKeyUpdated', handleApiKeyUpdate);
    
    // Check periodically (every 5 seconds) in case settings were updated
    const interval = setInterval(checkApiKey, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
      clearInterval(interval);
    };
  }, []);

  const checkApiKey = () => {
    const keyAvailable = hasValidApiKey();
    console.log("API key check:", keyAvailable ? "Available" : "Not available");
    setApiKeyAvailable(keyAvailable);
  };

  const handleAnalyzeManualText = async () => {
    if (!manualText.trim()) {
      toast.error('Por favor, insira o texto da ocorrência primeiro');
      return;
    }

    if (!apiKeyAvailable) {
      toast.error('Chave da API GROQ não configurada. Configure nas configurações do sistema.');
      return;
    }

    setIsProcessing(true);
    console.log('Starting analysis for manual text input');
    
    try {
      // Define GROQ API messages for analysis
      const messages = [
        {
          role: "system",
          content: 
            "Você é um assistente especializado em análise de boletins de ocorrência policiais. " +
            "Sua função é analisar o conteúdo de documentos de ocorrência e gerar um relatório " +
            "estruturado com: 1) Resumo do Incidente; 2) Dados da Vítima; 3) Dados do Suspeito; " +
            "4) Descrição Detalhada dos Fatos; 5) Sugestões para Investigação; 6) Despacho Sugerido. " +
            "7) Pontos de Atenção; 8) Detecção de possíveis contradições/inconsistências. " +
            "9) Classificação penal sugerida. 10) Correções necessárias no documento. " +
            "Use formato Markdown para estruturar sua resposta. " +
            "É fundamental criar um relatório detalhado, extraindo todas as informações úteis do documento " +
            "e evitando respostas genéricas. Foque em aspectos específicos do caso analisado."
        },
        {
          role: "user",
          content: `Analise o seguinte conteúdo de um boletim de ocorrência:\n\n${manualText}\n\nGere um relatório de análise completo, detalhado e específico para este caso. Inclua correções necessárias no documento se houver erros, imprecisões ou omissões importantes.`
        }
      ];
      
      console.log('Sending manual text for AI analysis');
      
      // Call the AI service with a longer token limit for detailed analysis
      const aiAnalysis = await makeGroqAIRequest(messages, 4096);
      console.log('Analysis completed successfully, length:', aiAnalysis.length);
      
      // Pass analysis back to parent component
      onAnalysisComplete(aiAnalysis);
      
      toast.success('Análise concluída com sucesso');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erro ao realizar análise: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setManualText(clipboardText);
      toast.success('Texto colado da área de transferência');
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      toast.error('Não foi possível acessar a área de transferência');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      console.log('File selected:', selectedFile.name);
      console.log('File type:', selectedFile.type);
      console.log('File size:', selectedFile.size);
      
      if (!['application/pdf', 'text/html', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
        toast.error('Por favor, selecione um arquivo PDF, HTML, TXT ou DOCX');
        return;
      }
      
      setFile(selectedFile);
      setManualText(''); // Clear manual text when uploading
      
      try {
        console.log('Extracting text from file:', selectedFile.name);
        // Extract text from file
        const extractedText = await parsePdfToText(selectedFile);
        console.log('Extracted text length:', extractedText.length);
        console.log('First 100 chars:', extractedText.substring(0, 100));
        
        if (!extractedText || extractedText.trim().length === 0) {
          toast.error('Não foi possível extrair texto do arquivo. Tente outro arquivo.');
          return;
        }
        
        setFileContent(extractedText);
        setManualText(extractedText); // Also set in manual text for analysis
        setActiveTab('manual'); // Switch to manual tab
        toast.success(`Conteúdo extraído de: ${selectedFile.name}`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Erro ao processar o arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

  // Get current model information
  const getModelInfo = () => {
    const settings = getGroqSettings();
    return {
      llmModel: settings.groqModel,
      whisperModel: settings.whisperModel
    };
  };

  // Get model information
  const modelInfo = getModelInfo();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" /> Análise de Ocorrência
        </CardTitle>
        <CardDescription>
          Faça upload de um arquivo PDF ou digite/cole o texto da ocorrência para análise
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
            <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.html,.txt,.docx"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arraste um arquivo PDF, HTML, TXT ou DOCX aqui ou clique para fazer upload
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Tamanho máximo: 10MB
                </p>
              </label>
            </div>

            {file && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-300 text-sm">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePaste}
                className="flex items-center gap-1"
              >
                <Clipboard className="h-4 w-4" />
                <span>Colar da Área de Transferência</span>
              </Button>
            </div>
            <Textarea
              placeholder="Digite ou cole o texto da ocorrência aqui..."
              className="min-h-[200px] font-mono text-sm"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <Button
              onClick={handleAnalyzeManualText}
              disabled={!manualText.trim() || isProcessing || !apiKeyAvailable}
              className="w-full"
            >
              {isProcessing ? 'Analisando com IA...' : 
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span>Analisar Texto</span>
                </div>
              }
            </Button>
            
            {!apiKeyAvailable && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Chave da API GROQ não configurada. Por favor, configure sua chave na aba de Configurações.
                  </p>
                </div>
              </div>
            )}
            
            {apiKeyAvailable && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-green-800 dark:text-green-200 mb-1">
                  Chave da API GROQ configurada. A análise será processada usando a API GROQ.
                </p>
                <div className="text-xs text-green-700 dark:text-green-300">
                  <p>Modelo LLM: {modelInfo.llmModel}</p>
                  <p>Modelo Whisper: {modelInfo.whisperModel}</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ManualOccurrenceInput;
