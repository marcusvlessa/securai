// Avoid importing groqService here to prevent circular dependencies

export interface AIRequestParams {
  content: string;
  type: 'text' | 'image' | 'audio' | 'file';
  priority?: 'speed' | 'accuracy' | 'balanced';
  context?: string;
  fileExtension?: string;
}

export interface AIModelSelection {
  model: string;
  reason: string;
  fallbackModel?: string;
}

/**
 * Serviço inteligente para seleção automática de modelos de IA
 * Baseado no tipo de conteúdo, complexidade e disponibilidade
 */
export class AIModelSelector {
  private static instance: AIModelSelector;
  private getDefaultGroqModel = () => { 
    try { 
      const raw = localStorage.getItem('securai-api-settings'); 
      if (raw) { 
        const parsed = JSON.parse(raw); 
        if (parsed.groqModel) return parsed.groqModel; 
      } 
    } catch (e) { /* noop */ } 
    return 'meta-llama/llama-4-scout-17b-16e-instruct'; // Modelo correto
  };
  private performanceMetrics: Map<string, any> = new Map();

  static getInstance(): AIModelSelector {
    if (!AIModelSelector.instance) {
      AIModelSelector.instance = new AIModelSelector();
    }
    return AIModelSelector.instance;
  }

  /**
   * Registra métricas de performance para otimização futura
   */
  recordPerformanceMetrics(model: string, metrics: {
    responseTime: number;
    accuracy: number;
    tokenCount: number;
  }): void {
    const existing = this.performanceMetrics.get(model) || {
      totalRequests: 0,
      avgResponseTime: 0,
      avgAccuracy: 0,
      totalTokens: 0
    };

    existing.totalRequests += 1;
    existing.avgResponseTime = (existing.avgResponseTime * (existing.totalRequests - 1) + metrics.responseTime) / existing.totalRequests;
    existing.avgAccuracy = (existing.avgAccuracy * (existing.totalRequests - 1) + metrics.accuracy) / existing.totalRequests;
    existing.totalTokens += metrics.tokenCount;

    this.performanceMetrics.set(model, existing);
  }

  /**
   * Obtém histórico de performance de um modelo
   */
  getModelPerformance(model: string): any {
    return this.performanceMetrics.get(model) || null;
  }

  /**
   * Seleciona o melhor modelo baseado nos parâmetros da requisição
   */
  selectModel(params: AIRequestParams): AIModelSelection {
    const { content, type, priority = 'balanced', context, fileExtension } = params;
    
    // Detecção de complexidade
    const complexity = this.analyzeComplexity(content, type, context);
    
    // Seleção baseada no tipo de conteúdo
    switch (type) {
      case 'text':
        return this.selectTextModel(complexity, priority, context);
      
      case 'image':
        return this.selectImageModel(complexity, priority, fileExtension);
      
      case 'audio':
        return this.selectAudioModel(complexity, priority, fileExtension);
      
      case 'file':
        return this.selectFileModel(complexity, priority, fileExtension);
      
      default:
        return {
          model: this.getDefaultGroqModel(),
          reason: 'Tipo de conteúdo não identificado, usando modelo padrão'
        };
    }
  }

  /**
   * Analisa a complexidade do conteúdo
   */
  private analyzeComplexity(content: string, type: string, context?: string): 'low' | 'medium' | 'high' {
    const contentLength = content.length;
    
    // Análise baseada no tamanho do conteúdo
    if (contentLength < 500) return 'low';
    if (contentLength < 2000) return 'medium';
    
    // Análise contextual
    if (context?.includes('investigacao') || context?.includes('criminal')) {
      return 'high'; // Casos criminais exigem alta precisão
    }
    
    // Detecção de complexidade por padrões no texto
    const complexPatterns = [
      /\b(analysis|investigation|evidence|forensic|criminal)\b/i,
      /\b(relatorio|investigacao|evidencia|criminal|policial)\b/i,
      /[0-9]{4,}/, // Números longos (documentos, CPF, etc.)
      /[A-Z]{2,3}-[0-9]{4}/, // Placas de veículo
      /\b[A-Z]+\s+[A-Z]+\b/ // Nomes próprios
    ];
    
    const complexityScore = complexPatterns.reduce((score, pattern) => {
      return score + (pattern.test(content) ? 1 : 0);
    }, 0);
    
    if (complexityScore >= 3) return 'high';
    if (complexityScore >= 1) return 'medium';
    
    return 'low';
  }

  /**
   * Seleciona modelo para análise de texto
   */
  private selectTextModel(complexity: string, priority: string, context?: string): AIModelSelection {
    // Para investigações criminais, sempre usar o modelo mais preciso
    if (context?.includes('investigation') || context?.includes('criminal') || context?.includes('investigacao')) {
      return {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        reason: 'Investigação criminal requer máxima precisão',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
      };
    }

    // Seleção baseada na prioridade e complexidade
    if (priority === 'speed' && complexity === 'low') {
      return {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        reason: 'Prioridade em velocidade para conteúdo simples',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
      };
    }

    if (priority === 'accuracy' || complexity === 'high') {
      return {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        reason: 'Máxima precisão necessária',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
      };
    }

    // Modelo balanceado padrão
    return {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      reason: 'Modelo balanceado para uso geral',
      fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
    };
  }

  /**
   * Seleciona modelo para análise de imagem
   */
  private selectImageModel(complexity: string, priority: string, fileExtension?: string): AIModelSelection {
    // GROQ usa Llama Vision para análise de imagens
    return {
      model: 'llava-v1.5-7b-4096-preview',
      reason: 'Modelo especializado em análise visual',
      fallbackModel: 'llama3-8b-8192'
    };
  }

  /**
   * Seleciona modelo para transcrição de áudio
   */
  private selectAudioModel(complexity: string, priority: string, fileExtension?: string): AIModelSelection {
    // GROQ usa Whisper para transcrição
    return {
      model: 'whisper-large-v3',
      reason: 'Modelo Whisper para transcrição de áudio',
      fallbackModel: 'whisper-large-v3'
    };
  }

  /**
   * Seleciona modelo baseado no tipo de arquivo
   */
  private selectFileModel(complexity: string, priority: string, fileExtension?: string): AIModelSelection {
    if (!fileExtension) {
      return {
        model: this.getDefaultGroqModel(),
        reason: 'Extensão de arquivo não identificada'
      };
    }

    const extension = fileExtension.toLowerCase();

    // Documentos de texto
    if (['txt', 'doc', 'docx', 'pdf'].includes(extension)) {
      return this.selectTextModel(complexity, priority);
    }

    // Imagens
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      return this.selectImageModel(complexity, priority, extension);
    }

    // Áudio
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) {
      return this.selectAudioModel(complexity, priority, extension);
    }

    // Planilhas e dados estruturados
    if (['xlsx', 'xls', 'csv', 'json'].includes(extension)) {
      return {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        reason: 'Dados estruturados requerem precisão na análise',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
      };
    }

    return {
      model: this.getDefaultGroqModel(),
      reason: 'Tipo de arquivo não reconhecido, usando modelo padrão'
    };
  }

  /**
   * Detecta automaticamente o tipo de conteúdo
   */
  detectContentType(content: string, fileExtension?: string): AIRequestParams['type'] {
    if (fileExtension) {
      const extension = fileExtension.toLowerCase();
      
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        return 'image';
      }
      
      if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) {
        return 'audio';
      }
      
      if (extension !== 'txt') {
        return 'file';
      }
    }

    // Detecta se é uma URL de imagem
    if (/\.(jpg|jpeg|png|gif|bmp|webp)(\?|$)/i.test(content)) {
      return 'image';
    }

    // Por padrão, considera como texto
    return 'text';
  }

  /**
   * Calcula métricas de performance do modelo
   */
  async getModelMetrics(model: string): Promise<{
    avgResponseTime: number;
    accuracy: number;
    costPerToken: number;
  }> {
    // Métricas estimadas baseadas no modelo
    const metrics: Record<string, any> = {
      'meta-llama/llama-4-scout-17b-16e-instruct': { avgResponseTime: 2500, accuracy: 0.96, costPerToken: 0.0006 },
      'llama3-70b-8192': { avgResponseTime: 3000, accuracy: 0.95, costPerToken: 0.0008 },
      'llama3-8b-8192': { avgResponseTime: 1500, accuracy: 0.88, costPerToken: 0.0002 },
      'gemma-7b-it': { avgResponseTime: 1200, accuracy: 0.85, costPerToken: 0.0001 },
      'whisper-large-v3': { avgResponseTime: 5000, accuracy: 0.92, costPerToken: 0.0003 },
      'llava-v1.5-7b-4096-preview': { avgResponseTime: 4000, accuracy: 0.87, costPerToken: 0.0005 }
    };

    return metrics[model] || { avgResponseTime: 2000, accuracy: 0.80, costPerToken: 0.0003 };
  }
}

// Exporta instância singleton
export const aiSelector = AIModelSelector.getInstance();

// Função de conveniência para seleção rápida
export function selectOptimalModel(params: AIRequestParams): AIModelSelection {
  return aiSelector.selectModel(params);
}

// Função para integração com GROQ Service
export function getOptimalGroqModel(content: string, context?: string): string {
  const type = aiSelector.detectContentType(content);
  const selection = aiSelector.selectModel({
    content,
    type,
    context,
    priority: 'balanced'
  });
  
  console.log(`🤖 Seleção automática de IA: ${selection.model} - ${selection.reason}`);
  return selection.model;
}