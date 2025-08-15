import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  makeGroqAIRequest, 
  getGroqSettings, 
  saveGroqSettings, 
  hasValidApiKey,
  generateInvestigationReportWithGroq,
  processLinkAnalysisDataWithGroq,
  transcribeAudioWithGroq,
  analyzeImageWithGroq
} from '../services/groqService'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock fetch
global.fetch = vi.fn()

describe('GROQ Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Configuração de API', () => {
    it('deve retornar configurações padrão quando não há dados salvos', () => {
      const settings = getGroqSettings()
      
      expect(settings.groqApiKey).toBe('')
      expect(settings.groqModel).toBe('meta-llama/llama-4-scout-17b-16e-instruct')
      expect(settings.language).toBe('pt')
    })

    it('deve salvar configurações corretamente', () => {
      const settings = {
        groqApiKey: 'gsk_test123',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-70b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      }

      saveGroqSettings(settings)
      const retrievedSettings = getGroqSettings()

      expect(retrievedSettings.groqApiKey).toBe('gsk_test123')
      expect(retrievedSettings.groqModel).toBe('llama3-70b-8192')
    })

    it('deve validar chave de API corretamente', () => {
      expect(hasValidApiKey()).toBe(false)

      saveGroqSettings({
        groqApiKey: 'gsk_valid_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-8b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })

      expect(hasValidApiKey()).toBe(true)
    })
  })

  describe('Requisições de IA', () => {
    beforeEach(() => {
      saveGroqSettings({
        groqApiKey: 'gsk_test_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-8b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })
    })

    it('deve fazer requisição de texto com sucesso', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Resposta da IA para análise'
          }
        }]
      }

      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const messages = [
        { role: 'user', content: 'Analise este caso criminal' }
      ]

      const result = await makeGroqAIRequest(messages, 1024, 'criminal')
      
      expect(result).toBe('Resposta da IA para análise')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer gsk_test_key'
          })
        })
      )
    })

    it('deve lançar erro quando API key não está configurada', async () => {
      localStorageMock.clear()

      const messages = [{ role: 'user', content: 'test' }]

      await expect(makeGroqAIRequest(messages)).rejects.toThrow('API key not configured')
    })

    it('deve tratar erros da API corretamente', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error": {"message": "Invalid API key"}}'
      })

      const messages = [{ role: 'user', content: 'test' }]

      await expect(makeGroqAIRequest(messages)).rejects.toThrow('GROQ API error: Invalid API key')
    })
  })

  describe('Geração de relatórios de investigação', () => {
    beforeEach(() => {
      saveGroqSettings({
        groqApiKey: 'gsk_test_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-70b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })
    })

    it('deve gerar relatório de investigação completo', async () => {
      const mockReport = `
      RELATÓRIO DE INVESTIGAÇÃO COMPLETO
      
      1. RESUMO EXECUTIVO
      Investigação sobre atividades suspeitas...
      
      2. METODOLOGIA DE ANÁLISE
      Análise baseada em evidências...
      `

      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: mockReport } }]
        })
      })

      const caseData = {
        title: 'Investigação Criminal 001',
        description: 'Fraude financeira'
      }

      const occurrences = [
        { id: '1', type: 'evidence', content: 'Documento suspeito' }
      ]

      const result = await generateInvestigationReportWithGroq(caseData, occurrences)
      
      expect(result).toContain('RELATÓRIO DE INVESTIGAÇÃO COMPLETO')
      expect(result).toContain('RESUMO EXECUTIVO')
    })
  })

  describe('Análise de vínculos', () => {
    beforeEach(() => {
      saveGroqSettings({
        groqApiKey: 'gsk_test_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-8b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })
    })

    it('deve processar dados de análise de vínculos', async () => {
      const mockLinkData = {
        nodes: [
          { id: 'person1', label: 'João Silva', group: 'person', size: 10 },
          { id: 'company1', label: 'Empresa XYZ', group: 'company', size: 15 }
        ],
        links: [
          { source: 'person1', target: 'company1', value: 5, type: 'employment' }
        ]
      }

      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockLinkData) } }]
        })
      })

      const caseData = { title: 'Caso de Vínculos' }
      const linkData = 'Dados de relacionamentos...'

      const result = await processLinkAnalysisDataWithGroq(caseData, linkData)
      
      expect(result.nodes).toHaveLength(2)
      expect(result.links).toHaveLength(1)
      expect(result.nodes[0].label).toBe('João Silva')
    })

    it('deve tratar JSON inválido na resposta de vínculos', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'resposta inválida sem JSON' } }]
        })
      })

      const caseData = { title: 'Caso de Vínculos' }
      const linkData = 'Dados...'

      await expect(processLinkAnalysisDataWithGroq(caseData, linkData))
        .rejects.toThrow('Invalid JSON returned from API')
    })
  })

  describe('Transcrição de áudio', () => {
    beforeEach(() => {
      saveGroqSettings({
        groqApiKey: 'gsk_test_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-8b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })
    })

    it('deve transcrever áudio com sucesso', async () => {
      const mockTranscription = {
        text: 'Esta é uma conversa transcrita',
        segments: [
          { start: 0, end: 5, text: 'Esta é uma conversa' },
          { start: 5, end: 10, text: 'transcrita' }
        ]
      }

      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTranscription
      })

      const audioFile = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' })
      const result = await transcribeAudioWithGroq(audioFile)
      
      expect(result.text).toBe('Esta é uma conversa transcrita')
      expect(result.speakerSegments).toHaveLength(2)
    })
  })

  describe('Análise de imagens', () => {
    beforeEach(() => {
      saveGroqSettings({
        groqApiKey: 'gsk_test_key',
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'llama3-8b-8192',
        model: 'llama-3.2-90b-vision-preview',
        whisperModel: 'whisper-large-v3',
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'
      })
    })

    it('deve analisar imagem e extrair informações', async () => {
      const mockAnalysis = {
        ocrText: 'ABC-1234 João Silva',
        faces: [{ id: 1, confidence: 0.9, region: { x: 100, y: 100, width: 50, height: 60 } }],
        licensePlates: ['ABC-1234'],
        enhancementTechnique: 'Análise por IA'
      }

      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
        })
      })

      const imageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...'
      const result = await analyzeImageWithGroq(imageUrl)
      
      expect(result.ocrText).toBe('ABC-1234 João Silva')
      expect(result.licensePlates).toContain('ABC-1234')
      expect(result.faces).toHaveLength(1)
    })

    it('deve tratar fallback quando JSON é inválido', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Texto extraído da imagem\nPlaca: ABC-1234' } }]
        })
      })

      const imageUrl = 'data:image/jpeg;base64,test'
      const result = await analyzeImageWithGroq(imageUrl)
      
      expect(result.ocrText).toContain('Texto extraído da imagem')
      expect(result.faces).toHaveLength(0)
      expect(result.licensePlates).toHaveLength(0)
    })
  })
})