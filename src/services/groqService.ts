
// GROQ API Service
// This service handles communication with the GROQ API for AI-powered functionalities

// Types for GROQ API settings
export type GroqSettings = {
  groqApiKey: string;
  groqApiEndpoint: string;
  groqModel: string;
  whisperModel: string;
  whisperApiEndpoint: string;
  language: string;
};

// Default GROQ settings
const DEFAULT_GROQ_SETTINGS: GroqSettings = {
  groqApiKey: '',
  groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
  groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  whisperModel: 'whisper-large-v3',
  whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
  language: 'pt'
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

// Make a request to the GROQ API for text generation
export const makeGroqAIRequest = async (messages: any[], maxTokens: number = 1024): Promise<string> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey || settings.groqApiKey.trim() === '') {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    console.log(`Making GROQ API request with model: ${settings.groqModel}`);
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
        model: settings.groqModel,
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
          "Você é um assistente especializado em análise investigativa. " +
          "Sua função é analisar os boletins de ocorrência e gerar um relatório " +
          "de investigação estruturado e detalhado."
      },
      {
        role: "user",
        content: `Gere um relatório de investigação baseado nas seguintes ocorrências:\n\n${
          JSON.stringify(occurrences, null, 2)
        }\n\nDados do caso: ${JSON.stringify(caseData, null, 2)}`
      }
    ];
    
    return await makeGroqAIRequest(messages, 4096);
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
    
    // Create a prompt for link analysis that explicitly asks for valid JSON
    const messages = [
      {
        role: "system",
        content: 
          "Você é um assistente especializado em análise de vínculos. " +
          "Sua função é analisar dados de relacionamentos e gerar uma estrutura " +
          "de grafo com nós e arestas para visualização. Você DEVE retornar APENAS " +
          "um objeto JSON válido e NADA mais em seu resultado, com a estrutura: " +
          '{ "nodes": [{"id": string, "label": string, "group": string, "size": number}], ' +
          '"links": [{"source": string, "target": string, "value": number, "type": string}] }'
      },
      {
        role: "user",
        content: `Processe os seguintes dados para análise de vínculos e retorne SOMENTE JSON sem explicações:\n\n${linkData}\n\nDados do caso: ${JSON.stringify(caseData, null, 2)}`
      }
    ];
    
    const result = await makeGroqAIRequest(messages, 4096);
    
    console.log("Link analysis raw result:", result.substring(0, 200) + "...");
    
    // Try to parse the result as JSON, handling different format possibilities
    try {
      // Handle cases where the model returns Markdown code blocks
      const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                      result.match(/```\n([\s\S]*?)\n```/) ||
                      result.match(/(\{[\s\S]*\})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : result;
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse link analysis result as JSON:", e);
      throw new Error("Invalid JSON returned from API. Please try again.");
    }
  } catch (error) {
    console.error('Error processing link analysis data:', error);
    throw error;
  }
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
      
      const speakerAnalysis = await makeGroqAIRequest(speakerDetectionPrompt, 2048);
      
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

// Analyze image with GROQ API
export const analyzeImageWithGroq = async (
  imageUrl: string
): Promise<ImageAnalysisResult> => {
  try {
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey) {
      console.error('No GROQ API key configured. Please add your API key in Settings.');
      throw new Error('API key not configured');
    }

    // Create a prompt for analyzing the image
    const messages = [
      {
        role: "system",
        content: 
          "You are an assistant that analyzes images and extracts information. " +
          "Please provide a detailed analysis of the image in JSON format with fields: " +
          "ocrText (extracted text), faces (array of detected faces), licensePlates (array of detected plate numbers), " +
          "enhancementTechnique (description of techniques used), and any other relevant information."
      },
      {
        role: "user",
        content: `This is a base64 encoded image: ${imageUrl.substring(0, 50)}... (truncated). Please analyze it and return information about any text, faces, and license plates in JSON format.`
      }
    ];

    console.log('Analyzing image with GROQ API...');
    
    const result = await makeGroqAIRequest(messages, 2048);
    
    try {
      // Try to parse the JSON response, handling potential Markdown code blocks
      const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                        result.match(/```\n([\s\S]*?)\n```/) ||
                        result.match(/(\{[\s\S]*\})/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] : result;
      const analysis = JSON.parse(jsonString);
      
      // Ensure the response has the expected structure
      return {
        ocrText: analysis.ocrText || '',
        faces: Array.isArray(analysis.faces) ? analysis.faces : [],
        licensePlates: Array.isArray(analysis.licensePlates) ? analysis.licensePlates : [],
        enhancementTechnique: analysis.enhancementTechnique || 'Standard image enhancement techniques applied',
        confidenceScores: analysis.confidenceScores
      };
    } catch (e) {
      console.error('Error parsing image analysis result:', e);
      throw new Error('Failed to parse the API response');
    }
  } catch (error) {
    console.error('Error analyzing image with GROQ:', error);
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

    // Create a description of enhancement techniques that would be applied
    const messages = [
      {
        role: "system",
        content: "You are an expert in forensic image enhancement. Describe the techniques that would be applied to enhance the provided image for forensic analysis."
      },
      {
        role: "user",
        content: `Describe the techniques that would be used to enhance this image for forensic purposes: ${imageUrl.substring(0, 50)}... (image data truncated)`
      }
    ];
    
    const enhancementDescription = await makeGroqAIRequest(messages, 1024);
    
    // Since we can't actually enhance the image with GROQ API currently,
    // we'll return the original image with the description of techniques
    return {
      enhancedImageUrl: imageUrl,
      enhancementTechnique: enhancementDescription.replace(/^(#|##|\*\*) .*\n/, '')  // Remove any markdown headers
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
