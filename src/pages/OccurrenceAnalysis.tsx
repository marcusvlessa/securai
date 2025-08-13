
import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, Database, Search, FileEdit, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';
import { makeGroqAIRequest, hasValidApiKey } from '../services/groqService';
import ManualOccurrenceInput from '../components/ManualOccurrenceInput';
import { 
  parsePdfToText, 
  convertTextToCSV,
  saveOccurrenceData,
  getOccurrencesByCaseId,
  updateCaseCrimeTypes 
} from '../services/databaseService';

const OccurrenceAnalysis = () => {
  const { currentCase, saveToCurrentCase } = useCase();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);
  const documentRef = useRef<HTMLDivElement>(null);

  // Check for existing analysis in the database when case changes
  useEffect(() => {
    if (currentCase) {
      checkForExistingAnalyses();
    }
  }, [currentCase]);
  
  const checkForExistingAnalyses = async () => {
    if (!currentCase) return;
    
    try {
      setIsCheckingDb(true);
      const existingOccurrences = await getOccurrencesByCaseId(currentCase.id);
      setIsCheckingDb(false);
      
      if (existingOccurrences.length > 0) {
        toast.info(`${existingOccurrences.length} análises encontradas no banco de dados para este caso`);
      }
    } catch (error) {
      console.error('Error checking for existing analyses:', error);
      setIsCheckingDb(false);
    }
  };

  // Handle file upload and analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      // Log more information about the file
      console.log('File selected:', selectedFile.name);
      console.log('File type:', selectedFile.type);
      console.log('File size:', selectedFile.size);
      
      if (!['application/pdf', 'text/html', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
        toast.error('Por favor, selecione um arquivo PDF, HTML, TXT ou DOCX');
        return;
      }
      
      setFile(selectedFile);
      setFileContent(''); // Clear previous content
      setAnalysis(''); // Clear previous analysis
      
      try {
        console.log('Starting PDF extraction for:', selectedFile.name);
        // Extract text from PDF
        const extractedText = await parsePdfToText(selectedFile);
        console.log('Extracted text length:', extractedText.length);
        console.log('First 100 chars:', extractedText.substring(0, 100));
        
        if (!extractedText || extractedText.trim().length === 0) {
          toast.error('Não foi possível extrair texto do arquivo. Tente outro arquivo.');
          return;
        }
        
        setFileContent(extractedText);
        toast.success(`Conteúdo extraído de: ${selectedFile.name}`);
        
        // Scroll to content
        setTimeout(() => {
          documentRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Erro ao processar o arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

  const handleAnalyzeClick = async () => {
    if (!file || !fileContent) {
      toast.error('Por favor, selecione um arquivo primeiro');
      return;
    }

    if (!currentCase) {
      toast.error('Por favor, selecione um caso antes de prosseguir');
      return;
    }
    
    if (!hasValidApiKey()) {
      toast.error('Chave da API GROQ não configurada. Por favor, configure sua chave na aba de Configurações.');
      return;
    }

    setIsLoading(true);
    console.log('Starting analysis for file:', file.name);
    
    try {
      // First, check if we already have an analysis for this file in this case
      const existingOccurrences = await getOccurrencesByCaseId(currentCase.id);
      const existingOccurrence = existingOccurrences.find(o => o.filename === file.name);
      
      if (existingOccurrence) {
        // Use existing analysis from DB
        console.log('Using existing analysis from DB');
        setAnalysis(existingOccurrence.analysis);
        toast.success('Análise recuperada do banco de dados');
        setIsLoading(false);
        return;
      }
      
      // Convert content to CSV for storage
      const csvContent = convertTextToCSV(fileContent);
      console.log('CSV content prepared, length:', csvContent.length);
      
      console.log('Starting AI analysis with content length:', fileContent.length);
      
      // Define GROQ API messages for analysis with improved prompt
      const messages = [
        {
          role: "system",
          content: 
            "Você é um assistente especializado em análise de boletins de ocorrência policiais. " +
            "Sua função é analisar o conteúdo extraído de documentos de ocorrência e gerar um relatório " +
            "estruturado com: 1) Resumo do Incidente; 2) Dados da Vítima; 3) Dados do Suspeito; " +
            "4) Descrição Detalhada dos Fatos; 5) Sugestões para Investigação; 6) Despacho Sugerido. " +
            "7) Pontos de Atenção; 8) Detecção de possíveis contradições/inconsistências. " +
            "9) Classificação penal sugerida. Use formato Markdown para estruturar sua resposta. " +
            "É fundamental criar um relatório detalhado, extraindo todas as informações úteis do documento " +
            "e evitando respostas genéricas. Foque em aspectos específicos do caso analisado."
        },
        {
          role: "user",
          content: `Analise o seguinte conteúdo extraído de um boletim de ocorrência:\n\n${fileContent}\n\nGere um relatório de análise completo, detalhado e específico para este caso.`
        }
      ];
      
      console.log('Sending content for AI analysis');
      
      // Use the API to analyze the content
      const aiAnalysis = await makeGroqAIRequest(messages, 4096);
      
      console.log('Analysis completed successfully, length:', aiAnalysis.length);
      console.log('First 100 chars of analysis:', aiAnalysis.substring(0, 100));
      
      setAnalysis(aiAnalysis);
      
      // Extract crime types from analysis for statistics
      const crimeTypes = extractCrimeTypes(aiAnalysis);
      if (crimeTypes.length > 0) {
        await updateCaseCrimeTypes(currentCase.id, crimeTypes);
      }
      
      // Save to database
      const occurrenceData = {
        caseId: currentCase.id,
        filename: file.name,
        content: csvContent, // Save as CSV
        analysis: aiAnalysis,
        dateProcessed: new Date().toISOString()
      };
      
      // Save to localStorage
      await saveOccurrenceData(occurrenceData);
      
      // Also save to case context
      saveToCurrentCase({
        timestamp: new Date().toISOString(),
        filename: file.name,
        analysis: aiAnalysis
      }, 'occurrenceAnalysis');
      
      toast.success('Análise concluída e salva no banco de dados');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erro ao realizar análise: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  // Extract crime types from analysis for statistics
  const extractCrimeTypes = (analysisText: string): string[] => {
    try {
      // Look for crime types in the classification section
      const classificationMatch = analysisText.match(/Classificação penal sugerida[:\n]+([\s\S]*?)(\n\n|\n##|$)/i);
      if (!classificationMatch) return [];
      
      const classificationText = classificationMatch[1];
      
      // Common Brazilian crime types to look for
      const commonCrimes = [
        'Roubo', 'Furto', 'Homicídio', 'Lesão Corporal', 'Ameaça',
        'Estelionato', 'Violência Doméstica', 'Tráfico', 'Receptação',
        'Maria da Penha', 'Estupro', 'Abuso', 'Injúria', 'Difamação',
        'Calúnia', 'Dano', 'Fraude'
      ];
      
      return commonCrimes.filter(crime => 
        classificationText.toLowerCase().includes(crime.toLowerCase())
      );
    } catch (error) {
      console.error('Error extracting crime types:', error);
      return [];
    }
  };

  const handleManualAnalysisComplete = (analysisResult: string) => {
    if (!currentCase) {
      toast.error('Por favor, selecione um caso antes de prosseguir');
      return;
    }
    
    setAnalysis(analysisResult);
    
    // Extract crime types and update statistics
    const crimeTypes = extractCrimeTypes(analysisResult);
    if (crimeTypes.length > 0) {
      updateCaseCrimeTypes(currentCase.id, crimeTypes);
    }
    
    // Save to case context
    saveToCurrentCase({
      timestamp: new Date().toISOString(),
      filename: 'Análise manual',
      analysis: analysisResult
    }, 'occurrenceAnalysis');
  };

  const saveAnalysis = async () => {
    if (!analysis || !currentCase) {
      toast.error('Não há análise para salvar ou nenhum caso selecionado');
      return;
    }

    try {
      console.log('Saving analysis to case');
      
      // Create occurrence data object
      const occurrenceData = {
        caseId: currentCase.id,
        filename: file ? file.name : 'Análise manual',
        content: file ? convertTextToCSV(fileContent) : convertTextToCSV(analysis),
        analysis: analysis,
        dateProcessed: new Date().toISOString()
      };
      
      // Save to database
      await saveOccurrenceData(occurrenceData);
      
      // Save to case context
      saveToCurrentCase({
        timestamp: new Date().toISOString(),
        filename: file ? file.name : 'Análise manual',
        analysis: analysis
      }, 'occurrenceAnalysis');
      
      toast.success('Análise salva com sucesso no caso atual e no banco de dados');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar análise: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          <FileEdit className="mr-2 h-6 w-6" /> Análise de Ocorrência
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Faça upload de documentos ou digite ocorrências para análise com IA e sugestões
        </p>
      </div>

      {!currentCase ? (
        <Card className="mb-6 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-200">
                Selecione um caso antes de prosseguir com a análise de ocorrência.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ManualOccurrenceInput 
              onAnalysisComplete={handleManualAnalysisComplete}
              isProcessing={isLoading}
              setIsProcessing={setIsLoading}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload de Documento
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Database className="h-4 w-4" /> 
                  Os documentos são processados e salvos no banco de dados local
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                      <FileText className="h-10 w-10 text-gray-400 mb-2" />
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

                  <Button
                    onClick={handleAnalyzeClick}
                    disabled={!file || isLoading || isCheckingDb || !hasValidApiKey()}
                    className="w-full"
                  >
                    {isLoading ? 'Analisando com IA...' : isCheckingDb ? 'Verificando BD...' : 'Analisar Documento'}
                  </Button>
                  
                  {!hasValidApiKey() && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <p className="text-yellow-800 dark:text-yellow-200">
                          Chave da API GROQ não configurada. Por favor, configure sua chave na aba de Configurações.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {fileContent && (
              <Card ref={documentRef}>
                <CardHeader>
                  <CardTitle>Conteúdo do Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{fileContent}</pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Análise e Sugestões</span>
                  {analysis && (
                    <Button variant="outline" size="sm" onClick={saveAnalysis}>
                      Salvar no Caso
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Processando documentos e gerando análise com IA...
                    </p>
                  </div>
                ) : analysis ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <Textarea
                      className="min-h-[500px] font-mono text-sm"
                      value={analysis}
                      onChange={(e) => setAnalysis(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                    <FileText className="h-16 w-16 opacity-20 mb-4" />
                    <p>Faça upload de um documento ou digite texto para gerar análise e sugestões</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default OccurrenceAnalysis;
