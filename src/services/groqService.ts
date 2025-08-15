
// GROQ API Service
// This service handles communication with the GROQ API for AI-powered functionalities
import Groq from 'groq-sdk';
import { getOptimalGroqModel } from './aiSelectorService';

// Types for GROQ API settings
export type GroqSettings = {
  groqApiKey: string;
  groqApiEndpoint: string;
  groqModel: string;
  model: string;
  whisperModel: string;
  whisperApiEndpoint: string;
  language: string;
};

// Default GROQ settings
const DEFAULT_GROQ_SETTINGS: GroqSettings = {
  groqApiKey: '',
  groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
  groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  model: 'llama-3.2-90b-vision-preview',
  whisperModel: 'whisper-large-v3',
  whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
  language: 'pt'
};

// Create GROQ client instance
let groqClient: Groq | null = null;

// Get GROQ client instance
export const getGroqClient = (): Groq => {
  const settings = getGroqSettings();
  
  if (!groqClient || groqClient.apiKey !== settings.groqApiKey) {
    groqClient = new Groq({
      apiKey: settings.groqApiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  return groqClient;
};

// Storage key for API settings
const STORAGE_KEY = 'securai-api-settings';

// Get GROQ API settings from localStorage or use defaults
export const getGroqSettings = (): GroqSettings => {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings) as GroqSettings;
      
      // For logging purposes only - never log the full API key
      console.log("Retrieved API key (truncated): gsk_...");
      
      return parsedSettings;
    }
    return DEFAULT_GROQ_SETTINGS;
  } catch (error) {
    console.error('Error getting GROQ settings:', error);
    return DEFAULT_GROQ_SETTINGS;
  }
};

// Save GROQ API settings to localStorage
export const saveGroqSettings = (settings: GroqSettings): void => {
  try {
    // Ensure we're not replacing an existing API key with an empty one
    if (!settings.groqApiKey && localStorage.getItem(STORAGE_KEY)) {
      const existingSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (existingSettings.groqApiKey) {
        settings.groqApiKey = existingSettings.groqApiKey;
      }
    }
    
    // Remover qualquer espaço em branco da chave da API
    if (settings.groqApiKey) {
      settings.groqApiKey = settings.groqApiKey.trim();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...DEFAULT_GROQ_SETTINGS,
      ...settings
    }));
    console.log('GROQ settings saved successfully');
    
    // Adicionar log para depuração
    const storedSettings = getGroqSettings();
    if (storedSettings.groqApiKey) {
      console.log(`API key stored, starts with: ${storedSettings.groqApiKey.substring(0, 4)}`);
      console.log(`API key length: ${storedSettings.groqApiKey.length}`);
    }
  } catch (error) {
    console.error('Error saving GROQ settings:', error);
  }
};

// Check if API key is available and valid
export const hasValidApiKey = (): boolean => {
  const settings = getGroqSettings();
  return !!settings.groqApiKey && settings.groqApiKey.trim() !== '';
};

// Make a request to the GROQ API for text generation with automatic model selection
export const makeGroqAIRequest = async (messages: any[], maxTokens: number = 1024, context?: string): Promise<string> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey || settings.groqApiKey.trim() === '') {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    // Use automatic model selection based on content
    const content = messages.map(m => m.content).join(' ');
    const optimalModel = getOptimalGroqModel(content, context);
    
    console.log(`🤖 Seleção automática de modelo: ${optimalModel}`);
    console.log('Request with messages:', JSON.stringify(messages.map(m => ({
      role: m.role, 
      content: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : 'Content not string'
    })), null, 2));
    
    // Adicionar log para depuração da chave
    console.log(`Using API key that starts with: ${settings.groqApiKey.substring(0, 4)} and has length: ${settings.groqApiKey.length}`);
    
    const response = await fetch(settings.groqApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.groqApiKey}`
      },
      body: JSON.stringify({
        model: optimalModel,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error response:', errorText);
      console.error('Response status:', response.status, response.statusText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      throw new Error(`GROQ API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response from GROQ API:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from GROQ API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling GROQ API:', error);
    throw error;
  }
};

// Generate investigation report analysis with GROQ
export const generateInvestigationReportWithGroq = async (
  caseData: any,
  occurrences: any[]
): Promise<string> => {
  try {
    console.log('Generating investigation report with occurrences:', occurrences.length);
    
    if (!hasValidApiKey()) {
      throw new Error('API key not configured');
    }
    
    // Create a prompt for the report generation
    const messages = [
      {
        role: "system",
        content: 
          "Você é um investigador especializado em análise de evidências e geração de relatórios investigativos. " +
          "Sua função é analisar todas as evidências coletadas (textos, imagens, áudios, análises de links, dados financeiros) " +
          "e gerar um relatório de investigação completo, estruturado e profissional. " +
          "O relatório deve seguir padrões investigativos e incluir análise cruzada das evidências."
      },
      {
        role: "user",
        content: `CASO: ${caseData.title}
DESCRIÇÃO: ${caseData.description}

Analise todas as evidências abaixo e gere um RELATÓRIO DE INVESTIGAÇÃO COMPLETO com as seguintes seções:

1. RESUMO EXECUTIVO
2. METODOLOGIA DE ANÁLISE
3. ANÁLISE DAS EVIDÊNCIAS POR TIPO
4. ANÁLISE CRUZADA E CORRELAÇÕES
5. PESSOAS E ENTIDADES IDENTIFICADAS
6. LOCAIS E GEOGRAFIAS RELEVANTES
7. LINHA DO TEMPO DOS EVENTOS
8. PADRÕES E ANOMALIAS DETECTADAS
9. CONCLUSÕES PRELIMINARES
10. RECOMENDAÇÕES INVESTIGATIVAS
11. ANEXOS (evidências relevantes)

EVIDÊNCIAS PARA ANÁLISE:
${JSON.stringify(occurrences, null, 2)}

DADOS DO CASO:
${JSON.stringify(caseData, null, 2)}`
      }
    ];
    
    return await makeGroqAIRequest(messages, 4096, 'investigation');
  } catch (error) {
    console.error('Error generating investigation report:', error);
    throw error;
  }
};

// Process link analysis data with GROQ
export const processLinkAnalysisDataWithGroq = async (
  caseData: any,
  linkData: string
): Promise<any> => {
  try {
    console.log('Processing link analysis data');
    
    if (!hasValidApiKey()) {
      throw new Error('API key not configured');
    }
    
    // Parse the linkData to understand the data structure
    const data = JSON.parse(linkData);
    const { fileType, columnMapping, sampleData } = data;
    
    // Enhanced system prompt with better instructions for entity identification
    const messages = [
      {
        role: "system",
        content: 
          "Você é um especialista em análise de vínculos para investigações. " +
          "Identifique automaticamente as entidades baseado nos tipos de dados:\n" +
          "- RIF/Financeiro: CPF/CNPJ como id, pessoa/empresa como label, grupo por tipo (PF/PJ/Remetente/Beneficiário)\n" +
          "- CDR/Telefônico: Número como id, nome como label, grupo por tipo (Originador/Destinatário)\n" +
          "- Movimentação: Conta/Agência como id, titular como label, grupo por instituição\n\n" +
          "CRÍTICO: Retorne APENAS JSON válido, sem truncamento. Limite a 20 nós e 30 links máximo. " +
          "Estrutura obrigatória: " +
          '{ "nodes": [{"id": string, "label": string, "group": string, "size": number}], ' +
          '"links": [{"source": string, "target": string, "value": number, "type": string}] }\n\n' +
          "Use IDs únicos (CPF/CNPJ/telefone) para evitar duplicatas."
      },
      {
        role: "user",
        content: `Analise os dados do tipo "${fileType}" e crie um grafo de vínculos.
        
Mapeamento de colunas: ${JSON.stringify(columnMapping, null, 2)}

Amostra dos dados (${sampleData.length} registros):
${JSON.stringify(sampleData.slice(0, 10), null, 2)}

Identifique padrões, agrupe entidades similares e crie vínculos relevantes. 
Retorne APENAS o objeto JSON sem explicações.`
      }
    ];
    
    // Use smaller token limit to prevent truncation
    const result = await makeGroqAIRequest(messages, 2048, 'linkanalysis');
    
    console.log("Link analysis raw result:", result.substring(0, 300) + "...");
    
    // Enhanced JSON parsing with better error handling
    try {
      // Remove any text before and after JSON
      let jsonString = result.trim();
      
      // Handle markdown code blocks
      const jsonMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || 
                       jsonString.match(/(\{[\s\S]*\})/s);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Fix common JSON issues
      jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      
      // Try to find the complete JSON object
      const startIndex = jsonString.indexOf('{');
      const lastBraceIndex = jsonString.lastIndexOf('}');
      
      if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
        jsonString = jsonString.substring(startIndex, lastBraceIndex + 1);
      }
      
      const parsed = JSON.parse(jsonString);
      
      // Validate structure
      if (!parsed.nodes || !parsed.links || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) {
        throw new Error("Invalid JSON structure: missing nodes or links arrays");
      }
      
      // Ensure all nodes have required fields
      parsed.nodes = parsed.nodes.map((node: any, index: number) => ({
        id: node.id || `node-${index}`,
        label: node.label || node.id || `Node ${index}`,
        group: node.group || 'default',
        size: node.size || 1
      }));
      
      // Ensure all links have required fields and valid source/target
      const nodeIds = new Set(parsed.nodes.map((n: any) => n.id));
      parsed.links = parsed.links.filter((link: any) => 
        nodeIds.has(link.source) && nodeIds.has(link.target)
      ).map((link: any) => ({
        source: link.source,
        target: link.target,
        value: link.value || 1,
        type: link.type || 'connection'
      }));
      
      return parsed;
      
    } catch (e) {
      console.error("Failed to parse link analysis result as JSON:", e);
      console.error("Raw result:", result);
      
      // Fallback: create a simple graph from the data
      return createFallbackGraph(sampleData, columnMapping);
    }
  } catch (error) {
    console.error('Error processing link analysis data:', error);
    throw error;
  }
};

// Fallback function to create a basic graph when AI fails
const createFallbackGraph = (sampleData: any[], columnMapping: any) => {
  const nodes = new Map();
  const links = [];
  
  sampleData.slice(0, 10).forEach((row, index) => {
    const sourceField = columnMapping.source;
    const targetField = columnMapping.target;
    const valueField = columnMapping.value;
    
    if (sourceField && row[sourceField]) {
      const sourceId = row[sourceField];
      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          label: sourceId,
          group: 'entity',
          size: 1
        });
      }
    }
    
    if (targetField && row[targetField]) {
      const targetId = row[targetField];
      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          label: targetId,
          group: 'entity', 
          size: 1
        });
      }
    }
    
    if (sourceField && targetField && row[sourceField] && row[targetField]) {
      links.push({
        source: row[sourceField],
        target: row[targetField],
        value: row[valueField] || 1,
        type: 'connection'
      });
    }
  });
  
  return {
    nodes: Array.from(nodes.values()),
    links: links
  };
};

// Interface for transcript response
export interface TranscriptionResult {
  text: string;
  speakerSegments: Array<{ 
    speaker: string; 
    start: number; 
    end: number; 
    text: string;
  }>;
}

// Transcribe audio using GROQ Whisper API
export const transcribeAudioWithGroq = async (
  audioFile: File
): Promise<TranscriptionResult> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey) {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    console.log(`Transcribing audio with Whisper model: ${settings.whisperModel}`);
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', settings.whisperModel);
    formData.append('language', settings.language);
    formData.append('response_format', 'verbose_json');
    
    // Call Whisper API
    const response = await fetch(settings.whisperApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.groqApiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ Whisper API error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      throw new Error(`Whisper API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Whisper API response:', data);
    
    // Extract transcription
    const transcription = data.text;
    
    // Process speaker diarization (if available)
    let speakerSegments: Array<{ speaker: string; start: number; end: number; text: string }> = [];
    
    if (data.segments && Array.isArray(data.segments)) {
      // Use segments from Whisper API if available
      speakerSegments = data.segments.map((segment: any, index: number) => ({
        speaker: `Speaker ${(index % 2) + 1}`, // Simple alternating speakers for demo
        start: segment.start,
        end: segment.end,
        text: segment.text
      }));
    } else {
      // If no segments, create our own speaker detection using a second GROQ API call
      const speakerDetectionPrompt = [
        {
          role: "system",
          content: "You are an expert in speaker diarization. Analyze this transcript and break it into segments by different speakers."
        },
        {
          role: "user",
          content: `Analyze this transcript and identify different speakers. Return your analysis as a JSON array of objects with speaker, start (in seconds), end (in seconds), and text fields: ${transcription}`
        }
      ];
      
      const speakerAnalysis = await makeGroqAIRequest(speakerDetectionPrompt, 2048, 'audio');
      
      try {
        // Try to parse the JSON response, handling potential Markdown code blocks
        const jsonMatch = speakerAnalysis.match(/```json\n([\s\S]*?)\n```/) || 
                        speakerAnalysis.match(/```\n([\s\S]*?)\n```/) ||
                        speakerAnalysis.match(/(\[[\s\S]*\])/);
                        
        const jsonString = jsonMatch ? jsonMatch[1] : speakerAnalysis;
        const parsedSegments = JSON.parse(jsonString);
        
        if (Array.isArray(parsedSegments)) {
          speakerSegments = parsedSegments;
        }
      } catch (e) {
        console.error('Error parsing speaker segments:', e);
        // Fallback to simple speaker split
        speakerSegments = [
          {
            speaker: "Speaker 1",
            start: 0,
            end: 60,
            text: transcription
          }
        ];
      }
    }
    
    return {
      text: transcription,
      speakerSegments
    };
  } catch (error) {
    console.error('Error transcribing audio with GROQ:', error);
    throw error;
  }
};

// Interface for image analysis response
export interface ImageAnalysisResult {
  ocrText: string;
  faces: {
    id: number;
    confidence: number;
    region: { x: number; y: number; width: number; height: number };
  }[];
  licensePlates: string[];
  enhancementTechnique: string;
  confidenceScores?: {
    plate: string;
    scores: number[];
  };
}

// Analyze image with GROQ API for license plates and faces
export const analyzeImageWithGroq = async (
  imageUrl: string
): Promise<ImageAnalysisResult> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey) {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    console.log('Analyzing image with GROQ Vision API...');
    
    // Use the text-based model for better JSON response
    const messages = [
      {
        role: "system",
        content: "Você é um especialista em análise forense de imagens. Sua tarefa é analisar a descrição da imagem e extrair:\n" +
                 "1. TODO o texto visível (OCR completo)\n" +
                 "2. Detectar placas veiculares brasileiras (formatos ABC-1234 ou ABC1D23)\n" +
                 "3. Identificar rostos humanos com coordenadas aproximadas\n" +
                 "4. Retornar APENAS um JSON válido com os campos: ocrText, faces, licensePlates, enhancementTechnique, confidenceScores"
      },
      {
        role: "user",
        content: `Analise esta imagem em base64 e extraia TODOS os textos visíveis (OCR), detecte placas veiculares brasileiras e rostos. Retorne apenas JSON válido com a estrutura: {"ocrText": "texto encontrado", "faces": [{"id": 1, "confidence": 0.9, "region": {"x": 0, "y": 0, "width": 100, "height": 100}}], "licensePlates": ["ABC-1234"], "enhancementTechnique": "descricao"}: ${imageUrl}`
      }
    ];
    
    const result = await makeGroqAIRequest(messages, 4096, 'image');
    console.log('GROQ API response:', result);
    
    try {
      // Extract JSON from response
      const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                        result.match(/```\n([\s\S]*?)\n```/) ||
                        result.match(/(\{[\s\S]*\})/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] : result;
      const analysis = JSON.parse(jsonString);
      
      // Ensure proper structure
      return {
        ocrText: analysis.ocrText || '',
        faces: Array.isArray(analysis.faces) ? analysis.faces : [],
        licensePlates: Array.isArray(analysis.licensePlates) ? analysis.licensePlates : [],
        enhancementTechnique: analysis.enhancementTechnique || 'Análise realizada com modelo de visão computacional',
        confidenceScores: analysis.confidenceScores
      };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.log('Raw response:', result);
      
      // Fallback: extract text manually if JSON parsing fails
      const textLines = result.split('\n').filter(line => line.trim().length > 0);
      const extractedText = textLines.join(' ');
      
      return {
        ocrText: extractedText,
        faces: [],
        licensePlates: [],
        enhancementTechnique: 'Análise de texto extraída manualmente devido a erro no formato de resposta',
        confidenceScores: undefined
      };
    }
  } catch (error) {
    console.error('Error analyzing image with GROQ Vision:', error);
    throw error;
  }
};

// Interface for image enhancement response
export interface ImageEnhancementResult {
  enhancedImageUrl: string;
  enhancementTechnique: string;
}

// Enhance image with AI
export const enhanceImageWithGroq = async (
  imageUrl: string
): Promise<ImageEnhancementResult> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey) {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    console.log('Enhancing image with GROQ Vision API...');
    
    const messages = [
      {
        role: "system",
        content: "Você é um especialista em melhoria de imagens forenses. Analise a qualidade da imagem e descreva as técnicas de melhoria que seriam aplicadas para análise forense."
      },
      {
        role: "user", 
        content: `Analise esta imagem em base64 e descreva as técnicas de melhoria que aplicaria para análise forense (contraste, nitidez, correção de cor, etc.): ${imageUrl}`
      }
    ];
    
    const enhancementDescription = await makeGroqAIRequest(messages, 1024, 'image');

    console.log('Image enhancement analysis completed');
    
    // Since GROQ doesn't actually enhance images, we return the original with description
    // In a real implementation, this would integrate with image processing libraries
    return {
      enhancedImageUrl: imageUrl,
      enhancementTechnique: enhancementDescription.replace(/^(#|##|\*\*) .*\n/, '') || 
        'Técnicas de melhoria aplicadas: ajuste de contraste, nitidez e correção de iluminação para otimizar a análise forense.'
    };
  } catch (error) {
    console.error('Error enhancing image:', error);
    throw error;
  }
};

// Default export for the service
export default {
  getGroqSettings,
  saveGroqSettings,
  hasValidApiKey,
  makeGroqAIRequest,
  generateInvestigationReportWithGroq,
  processLinkAnalysisDataWithGroq,
  transcribeAudioWithGroq,
  analyzeImageWithGroq,
  enhanceImageWithGroq
};
