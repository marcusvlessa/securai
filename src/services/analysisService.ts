import { supabase } from "@/integrations/supabase/client";
import { fileUploadService } from "./fileUploadService";
import { selectOptimalModel, aiSelector } from "./aiSelectorService";
import { 
  makeGroqAIRequest, 
  transcribeAudioWithGroq, 
  analyzeImageWithGroq,
  processLinkAnalysisDataWithGroq 
} from "./groqService";

export interface AnalysisRequest {
  fileId?: string;
  caseId: string;
  analysisType: 'text' | 'image' | 'audio' | 'financial' | 'link_analysis' | 'investigation_report';
  content?: string;
  options?: {
    priority?: 'speed' | 'accuracy' | 'balanced';
    context?: string;
    customPrompt?: string;
  };
}

export interface AnalysisResult {
  id: string;
  analysisType: string;
  modelUsed: string;
  resultData: any;
  confidenceScore?: number;
  processingTime: number;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export class AnalysisService {
  private static instance: AnalysisService;

  static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  /**
   * Auto-analyze uploaded file based on its type
   */
  async autoAnalyzeFile(fileId: string, caseId: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Get file info
      const { data: fileInfo, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        throw new Error(`Failed to get file info: ${error.message}`);
      }

      // Update status to processing
      await fileUploadService.updateAnalysisStatus(fileId, 'processing');

      // Determine analysis type based on file
      const analysisType = this.determineAnalysisType(fileInfo);
      
      // Select optimal model
      const modelSelection = selectOptimalModel({
        content: fileInfo.filename,
        type: analysisType === 'financial' ? 'text' : analysisType,
        priority: 'balanced',
        context: 'investigation',
        fileExtension: (fileInfo.metadata as any)?.fileExtension
      });

      let resultData: any;
      let confidenceScore: number = 0.8; // Default confidence

      // Perform analysis based on type
      switch (analysisType) {
        case 'text':
          resultData = await this.analyzeTextFile(fileInfo);
          break;
        case 'image':
          resultData = await this.analyzeImageFile(fileInfo);
          break;
        case 'audio':
          resultData = await this.analyzeAudioFile(fileInfo);
          break;
        case 'financial':
          resultData = await this.analyzeFinancialFile(fileInfo);
          break;
        default:
          resultData = await this.analyzeGenericFile(fileInfo);
      }

      const processingTime = Date.now() - startTime;

      // Save analysis result
      const analysisResult = await this.saveAnalysisResult({
        caseId,
        fileId,
        analysisType,
        modelUsed: modelSelection.model,
        resultData,
        confidenceScore,
        processingTime,
        status: 'completed'
      });

      // Update file status
      await fileUploadService.updateAnalysisStatus(fileId, 'completed', {
        ...(fileInfo.metadata as any || {}),
        analysisCompleted: true,
        analysisResultId: analysisResult.id
      });

      return analysisResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Auto-analysis error:', error);
      
      // Update file status to failed
      await fileUploadService.updateAnalysisStatus(fileId, 'failed');

      // Save failed analysis result
      return await this.saveAnalysisResult({
        caseId,
        fileId,
        analysisType: 'text',
        modelUsed: 'error',
        resultData: null,
        processingTime,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze text content
   */
  async analyzeText(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      const { content = '', options = {} } = request;
      
      // Select optimal model
      const modelSelection = selectOptimalModel({
        content,
        type: 'text',
        priority: options.priority || 'balanced',
        context: options.context || 'investigation'
      });

      // Create analysis prompt
      const systemPrompt = options.customPrompt || this.getDefaultTextAnalysisPrompt();
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise o seguinte conteúdo:\n\n${content}` }
      ];

      // Perform analysis
      const result = await makeGroqAIRequest(messages, 2048, options.context);
      
      const processingTime = Date.now() - startTime;

      // Save and return result
      return await this.saveAnalysisResult({
        caseId: request.caseId,
        fileId: request.fileId,
        analysisType: 'text',
        modelUsed: modelSelection.model,
        resultData: { analysis: result, content },
        confidenceScore: 0.85,
        processingTime,
        status: 'completed'
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return await this.saveAnalysisResult({
        caseId: request.caseId,
        fileId: request.fileId,
        analysisType: 'text',
        modelUsed: 'error',
        resultData: null,
        processingTime,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process link analysis data
   */
  async processLinkAnalysis(
    caseId: string,
    data: any[],
    mapping: any,
    fileType: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Prepare data for analysis
      const analysisData = {
        fileType,
        columnMapping: mapping,
        sampleData: data.slice(0, 100) // Limit sample size
      };

      // Use GROQ to process link analysis
      const graphData = await processLinkAnalysisDataWithGroq(
        { title: 'Link Analysis', description: 'Automated link analysis' },
        JSON.stringify(analysisData)
      );

      const processingTime = Date.now() - startTime;

      // Save link analysis session
      const { data: sessionData, error: sessionError } = await supabase
        .from('link_analysis_sessions')
        .insert({
          case_id: caseId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          session_name: `Análise de Vínculos - ${new Date().toLocaleDateString()}`,
          file_type: fileType,
          column_mapping: mapping,
          graph_data: graphData,
          nodes_count: graphData.nodes?.length || 0,
          links_count: graphData.links?.length || 0,
          status: 'completed'
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to save link analysis session: ${sessionError.message}`);
      }

      // Save analysis result
      return await this.saveAnalysisResult({
        caseId,
        analysisType: 'link_analysis',
        modelUsed: 'llama3-70b-8192',
        resultData: {
          graphData,
          sessionId: sessionData.id,
          fileType,
          mapping,
          summary: `Análise de vínculos processada com ${graphData.nodes?.length || 0} nós e ${graphData.links?.length || 0} conexões`
        },
        confidenceScore: 0.9,
        processingTime,
        status: 'completed'
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return await this.saveAnalysisResult({
        caseId,
        analysisType: 'link_analysis',
        modelUsed: 'error',
        resultData: null,
        processingTime,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all analysis results for a case
   */
  async getCaseAnalyses(caseId: string): Promise<AnalysisResult[]> {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch analyses: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      analysisType: item.analysis_type,
      modelUsed: item.model_used,
      resultData: item.result_data,
      confidenceScore: item.confidence_score,
      processingTime: item.processing_time,
      status: item.status as 'processing' | 'completed' | 'failed',
      errorMessage: item.error_message,
      createdAt: item.created_at
    }));
  }

  // Private helper methods

  private determineAnalysisType(fileInfo: any): 'text' | 'image' | 'audio' | 'financial' {
    const extension = fileInfo.metadata?.fileExtension?.toLowerCase();
    const mimeType = fileInfo.mime_type?.toLowerCase();

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) || 
        mimeType?.startsWith('image/')) {
      return 'image';
    }

    // Audio files
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension) || 
        mimeType?.startsWith('audio/')) {
      return 'audio';
    }

    // Financial data files
    if (['xlsx', 'xls', 'csv'].includes(extension) ||
        fileInfo.filename.toLowerCase().includes('financ') ||
        fileInfo.filename.toLowerCase().includes('extrato') ||
        fileInfo.filename.toLowerCase().includes('rif')) {
      return 'financial';
    }

    // Default to text
    return 'text';
  }

  private async analyzeTextFile(fileInfo: any): Promise<any> {
    const content = await fileUploadService.getFileContent(fileInfo.file_path);
    
    const messages = [
      {
        role: "system",
        content: this.getDefaultTextAnalysisPrompt()
      },
      {
        role: "user", 
        content: `Arquivo: ${fileInfo.filename}\n\nConteúdo:\n${content}`
      }
    ];

    const analysis = await makeGroqAIRequest(messages, 2048, 'investigation');
    
    return {
      type: 'text_analysis',
      filename: fileInfo.filename,
      content: content.substring(0, 1000), // Truncate for storage
      analysis,
      keyFindings: this.extractKeyFindings(analysis),
      entities: this.extractEntities(content)
    };
  }

  private async analyzeImageFile(fileInfo: any): Promise<any> {
    const blob = await fileUploadService.getFileBlob(fileInfo.file_path);
    
    // Convert blob to File for GROQ
    const file = new File([blob], fileInfo.filename, { type: fileInfo.mime_type });
    
    const analysis = await analyzeImageWithGroq(fileInfo.filename);
    
    return {
      type: 'image_analysis',
      filename: fileInfo.filename,
      analysis,
      detectedText: analysis.ocrText || '',
      faces: analysis.faces || [],
      licensePlates: analysis.licensePlates || []
    };
  }

  private async analyzeAudioFile(fileInfo: any): Promise<any> {
    const blob = await fileUploadService.getFileBlob(fileInfo.file_path);
    
    // Convert blob to File for GROQ
    const file = new File([blob], fileInfo.filename, { type: fileInfo.mime_type });
    
    const transcription = await transcribeAudioWithGroq(file);
    
    // Analyze transcription content
    const contentAnalysis = await makeGroqAIRequest([
      {
        role: "system",
        content: "Analise a transcrição de áudio para extrair informações relevantes para investigação."
      },
      {
        role: "user",
        content: `Transcrição: ${transcription.text}`
      }
    ], 1024, 'investigation');

    return {
      type: 'audio_analysis',
      filename: fileInfo.filename,
      transcription: transcription.text,
      speakerSegments: transcription.speakerSegments,
      analysis: contentAnalysis,
      duration: fileInfo.metadata?.duration,
      keyMoments: this.extractKeyMoments(transcription.speakerSegments)
    };
  }

  private async analyzeFinancialFile(fileInfo: any): Promise<any> {
    const content = await fileUploadService.getFileContent(fileInfo.file_path);
    
    const messages = [
      {
        role: "system",
        content: `Você é um especialista em análise financeira forense. Analise os dados financeiros e identifique:
        1. Padrões suspeitos de movimentação
        2. Valores fracionados ou estruturação
        3. Transações fora do padrão
        4. Possíveis indícios de lavagem de dinheiro
        5. Entidades e contas relevantes`
      },
      {
        role: "user",
        content: `Arquivo financeiro: ${fileInfo.filename}\n\nDados:\n${content.substring(0, 5000)}`
      }
    ];

    const analysis = await makeGroqAIRequest(messages, 3072, 'financial');
    
    return {
      type: 'financial_analysis',
      filename: fileInfo.filename,
      analysis,
      suspiciousPatterns: this.extractSuspiciousPatterns(analysis),
      entities: this.extractFinancialEntities(content),
      riskScore: this.calculateRiskScore(analysis)
    };
  }

  private async analyzeGenericFile(fileInfo: any): Promise<any> {
    try {
      const content = await fileUploadService.getFileContent(fileInfo.file_path);
      
      const messages = [
        {
          role: "system",
          content: this.getDefaultTextAnalysisPrompt()
        },
        {
          role: "user",
          content: `Arquivo: ${fileInfo.filename}\n\nConteúdo:\n${content.substring(0, 3000)}`
        }
      ];

      const analysis = await makeGroqAIRequest(messages, 1024, 'investigation');
      
      return {
        type: 'generic_analysis',
        filename: fileInfo.filename,
        analysis,
        fileType: fileInfo.file_type,
        summary: `Análise geral do arquivo ${fileInfo.filename}`
      };
    } catch (error) {
      return {
        type: 'generic_analysis',
        filename: fileInfo.filename,
        error: error instanceof Error ? error.message : 'Erro na análise',
        summary: `Falha na análise do arquivo ${fileInfo.filename}`
      };
    }
  }

  private async saveAnalysisResult(data: {
    caseId: string;
    fileId?: string;
    analysisType: string;
    modelUsed: string;
    resultData: any;
    confidenceScore?: number;
    processingTime: number;
    status: 'processing' | 'completed' | 'failed';
    errorMessage?: string;
  }): Promise<AnalysisResult> {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: result, error } = await supabase
      .from('analysis_results')
      .insert({
        case_id: data.caseId,
        file_id: data.fileId,
        user_id: user.user?.id,
        analysis_type: data.analysisType,
        model_used: data.modelUsed,
        result_data: data.resultData,
        confidence_score: data.confidenceScore,
        processing_time: data.processingTime,
        status: data.status,
        error_message: data.errorMessage
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save analysis result: ${error.message}`);
    }

    return {
      id: result.id,
      analysisType: result.analysis_type,
      modelUsed: result.model_used,
      resultData: result.result_data,
      confidenceScore: result.confidence_score,
      processingTime: result.processing_time,
      status: result.status as 'processing' | 'completed' | 'failed',
      errorMessage: result.error_message,
      createdAt: result.created_at
    };
  }

  private getDefaultTextAnalysisPrompt(): string {
    return `Você é um investigador especializado em análise de documentos. Analise o conteúdo fornecido e extraia:
    1. Informações relevantes para investigação
    2. Nomes, datas, locais e valores mencionados
    3. Possíveis evidências ou indícios
    4. Conexões e relacionamentos identificados
    5. Resumo executivo da análise
    
    Formate a resposta de forma estruturada e objetiva.`;
  }

  private extractKeyFindings(analysis: string): string[] {
    // Simple extraction - could be improved with NLP
    const findings = analysis.split('\n').filter(line => 
      line.includes('importante') || 
      line.includes('relevante') || 
      line.includes('evidência') ||
      line.includes('suspeito')
    );
    return findings.slice(0, 5);
  }

  private extractEntities(content: string): any[] {
    // Simple entity extraction - could be improved with NLP
    const entities = [];
    
    // CPF/CNPJ patterns
    const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
    const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
    
    const cpfs = content.match(cpfPattern) || [];
    const cnpjs = content.match(cnpjPattern) || [];
    
    cpfs.forEach(cpf => entities.push({ type: 'CPF', value: cpf }));
    cnpjs.forEach(cnpj => entities.push({ type: 'CNPJ', value: cnpj }));
    
    return entities;
  }

  private extractSuspiciousPatterns(analysis: string): string[] {
    const patterns = analysis.split('\n').filter(line =>
      line.includes('suspeito') ||
      line.includes('padrão') ||
      line.includes('anomalia') ||
      line.includes('irregular')
    );
    return patterns.slice(0, 3);
  }

  private extractFinancialEntities(content: string): any[] {
    const entities = [];
    
    // Bank account patterns
    const accountPattern = /\d{4,6}-\d{1,2}/g;
    const accounts = content.match(accountPattern) || [];
    
    accounts.forEach(account => entities.push({ type: 'CONTA', value: account }));
    
    return entities;
  }

  private calculateRiskScore(analysis: string): number {
    // Simple risk scoring based on keywords
    const riskKeywords = ['suspeito', 'irregular', 'anomalia', 'fracionamento', 'lavagem'];
    const keywordCount = riskKeywords.reduce((count, keyword) => 
      count + (analysis.toLowerCase().includes(keyword) ? 1 : 0), 0
    );
    
    return Math.min(keywordCount * 0.2, 1.0);
  }

  private extractKeyMoments(segments: any[]): any[] {
    // Extract important moments from speaker segments
    return segments.slice(0, 5).map(segment => ({
      time: segment.start,
      speaker: segment.speaker,
      text: segment.text.substring(0, 100)
    }));
  }
}

// Export singleton instance
export const analysisService = AnalysisService.getInstance();