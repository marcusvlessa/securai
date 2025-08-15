import { describe, it, expect, vi, beforeEach } from 'vitest'
import { selectOptimalModel, getOptimalGroqModel } from '../services/aiSelectorService'
import { makeGroqAIRequest } from '../services/groqService'
import { executeVirtualAgent, getVirtualAgents } from '../services/virtualAgentsService'
import { uploadRIFData, runRedFlagAnalysis } from '../services/financialService'

// Mock localStorage globalmente
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

// Mock fetch global
global.fetch = vi.fn()

// Mock File
global.File = class MockFile {
  name: string
  type: string
  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename
    this.type = options.type || ''
  }
  
  async text() {
    return 'data,descricao,contraparte,valor,tipo\n2024-01-15,PIX Investigação,Suspeito A,5000.00,credit'
  }
} as any

describe('Integração entre Serviços', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    
    // Setup mock GROQ settings
    localStorageMock.setItem('securai-api-settings', JSON.stringify({
      groqApiKey: 'gsk_test_key',
      groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
      groqModel: 'llama3-8b-8192',
      model: 'llama-3.2-90b-vision-preview',
      whisperModel: 'whisper-large-v3',
      whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      language: 'pt'
    }))
  })

  describe('Seletor de IA + GROQ Service', () => {
    it('deve selecionar modelo automaticamente para investigação criminal', async () => {
      const selection = selectOptimalModel({
        content: 'Análise de evidência criminal em investigação policial',
        type: 'text',
        context: 'criminal investigation'
      })

      expect(selection.model).toBe('llama3-70b-8192')
      expect(selection.reason).toContain('criminal')
    })

    it('deve usar seleção automática no GROQ Service', () => {
      const model = getOptimalGroqModel(
        'Investigação de fraude financeira com evidências forenses',
        'criminal'
      )

      expect(model).toBe('llama3-70b-8192')
    })

    it('deve integrar seleção automática com makeGroqAIRequest', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Análise criminal concluída' } }]
        })
      })

      const messages = [
        { role: 'user', content: 'Analisar evidência forense criminal' }
      ]

      const result = await makeGroqAIRequest(messages, 1024, 'criminal')
      
      expect(result).toBe('Análise criminal concluída')
      
      // Verificar se o fetch foi chamado com o modelo correto
      const fetchCall = (fetch as any).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.model).toBe('llama3-70b-8192')
    })
  })

  describe('Agentes Virtuais + Seletor de IA', () => {
    it('deve executar agente com seleção automática de modelo', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Relatório de investigação gerado automaticamente' } }]
        })
      })

      const agents = getVirtualAgents()
      const investigationAgent = agents[0]

      const caseData = {
        title: 'Investigação Criminal Complexa',
        description: 'Caso envolvendo fraude e lavagem de dinheiro',
        type: 'criminal investigation'
      }

      const execution = await executeVirtualAgent(investigationAgent.id, caseData)

      expect(execution.status).toBe('completed')
      expect(execution.outputs.length).toBeGreaterThan(0)
      
      const aiOutput = execution.outputs.find(o => o.name === 'AI Analysis')
      expect(aiOutput?.content).toContain('automaticamente')
    })
  })

  describe('Análise Financeira + Seletor de IA', () => {
    it('deve usar modelo otimizado para análise de dados financeiros', async () => {
      const csvFile = new File(
        ['mock csv data'],
        'transacoes_investigacao.csv',
        { type: 'text/csv' }
      )

      await uploadRIFData({
        caseId: 'investigation-case-123',
        file: csvFile
      })

      // Verificar se o seletor escolheria modelo adequado para dados estruturados
      const selection = selectOptimalModel({
        content: 'transacoes_investigacao.csv',
        type: 'file',
        fileExtension: 'csv',
        context: 'financial analysis'
      })

      expect(selection.model).toBe('llama3-70b-8192')
      expect(selection.reason).toContain('estruturados')
    })

    it('deve integrar análise de red flags com IA para investigação', async () => {
      // Setup de transações suspeitas
      const suspiciousTransactions = [
        {
          id: 'tx1',
          caseId: 'investigation-case-123',
          date: '2024-01-15T10:00:00Z',
          amount: '9500.00',
          type: 'credit' as const,
          method: 'PIX' as const,
          description: 'Transação suspeita 1',
          holderDocument: '12345678901',
          counterpartyDocument: '98765432100'
        },
        {
          id: 'tx2',
          caseId: 'investigation-case-123',
          date: '2024-01-15T10:30:00Z',
          amount: '9800.00',
          type: 'credit' as const,
          method: 'PIX' as const,
          description: 'Transação suspeita 2',
          holderDocument: '12345678901',
          counterpartyDocument: '98765432100'
        }
      ]

      localStorageMock.setItem(
        'securai-rif-transactions-investigation-case-123',
        JSON.stringify(suspiciousTransactions)
      )

      await runRedFlagAnalysis({
        caseId: 'investigation-case-123',
        thresholds: { fracionamento: 10000 },
        window: 24
      })

      const alertsData = localStorageMock.getItem('securai-redflag-alerts-investigation-case-123')
      expect(alertsData).toBeDefined()

      const alerts = JSON.parse(alertsData!)
      expect(alerts.length).toBeGreaterThan(0)
      
      const fractioningAlert = alerts.find((a: any) => a.type === 'fracionamento')
      expect(fractioningAlert).toBeDefined()
      expect(fractioningAlert.severity).toBe('high')
    })
  })

  describe('Fluxo completo de investigação', () => {
    it('deve executar pipeline completo: upload -> análise -> relatório', async () => {
      // Mock da resposta da IA
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Análise forense completa realizada' } }]
        })
      })

      const caseId = 'complete-investigation-123'

      // 1. Upload de dados financeiros
      const rifFile = new File(
        ['mock financial data'],
        'evidencia_financeira.csv',
        { type: 'text/csv' }
      )

      await uploadRIFData({ caseId, file: rifFile })

      // 2. Executar análise de red flags
      await runRedFlagAnalysis({
        caseId,
        thresholds: { fracionamento: 10000 },
        window: 24
      })

      // 3. Executar agente virtual para relatório
      const agents = getVirtualAgents()
      const reportAgent = agents[0]

      const caseData = {
        title: 'Investigação Financeira Completa',
        description: 'Análise de padrões suspeitos em transações',
        evidence: 'evidencia_financeira.csv'
      }

      const execution = await executeVirtualAgent(reportAgent.id, caseData)

      // Verificações do pipeline completo
      expect(execution.status).toBe('completed')
      expect(execution.outputs.length).toBeGreaterThan(0)

      // Verificar se os dados foram salvos corretamente
      const transactionsData = localStorageMock.getItem(`securai-rif-transactions-${caseId}`)
      const alertsData = localStorageMock.getItem(`securai-redflag-alerts-${caseId}`)

      expect(transactionsData).toBeDefined()
      expect(alertsData).toBeDefined()

      const alerts = JSON.parse(alertsData!)
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('deve manter consistência entre diferentes módulos', async () => {
      const caseId = 'consistency-test-123'

      // Configurar dados em diferentes módulos
      const transactionData = [
        {
          id: 'tx1',
          caseId,
          amount: '15000.00',
          type: 'credit' as const,
          method: 'PIX' as const,
          date: '2024-01-15T10:00:00Z'
        }
      ]

      localStorageMock.setItem(
        `securai-rif-transactions-${caseId}`,
        JSON.stringify(transactionData)
      )

      // Executar análise de red flags
      await runRedFlagAnalysis({
        caseId,
        thresholds: { fracionamento: 10000 },
        window: 24
      })

      // Verificar se os IDs de transação são consistentes
      const alertsData = localStorageMock.getItem(`securai-redflag-alerts-${caseId}`)
      const alerts = JSON.parse(alertsData!)

      alerts.forEach((alert: any) => {
        expect(alert.caseId).toBe(caseId)
        if (alert.transactionIds.length > 0) {
          expect(alert.transactionIds[0]).toBe('tx1')
        }
      })
    })
  })

  describe('Performance e otimização', () => {
    it('deve selecionar modelo rápido para operações simples', () => {
      const selection = selectOptimalModel({
        content: 'Texto simples',
        type: 'text',
        priority: 'speed'
      })

      expect(selection.model).toBe('llama3-8b-8192')
      expect(selection.reason).toContain('velocidade')
    })

    it('deve usar modelo preciso para análises complexas', () => {
      const selection = selectOptimalModel({
        content: 'Análise forense detalhada de evidências criminais com múltiplas variáveis e correlações complexas',
        type: 'text',
        priority: 'accuracy',
        context: 'forensic analysis'
      })

      expect(selection.model).toBe('llama3-70b-8192')
      expect(selection.reason).toContain('precisão')
    })

    it('deve balancear performance e qualidade', () => {
      const selection = selectOptimalModel({
        content: 'Investigação padrão com evidências normais',
        type: 'text',
        priority: 'balanced'
      })

      expect(['llama3-8b-8192', 'llama3-70b-8192']).toContain(selection.model)
      expect(selection.reason).toContain('balanceado')
    })
  })

  describe('Tratamento de erros integrado', () => {
    it('deve tratar erro na seleção de modelo graciosamente', () => {
      const selection = selectOptimalModel({
        content: '',
        type: 'text'
      })

      expect(selection.model).toBeDefined()
      expect(selection.reason).toBeDefined()
    })

    it('deve usar fallback quando API falha', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      const agents = getVirtualAgents()
      const agent = agents[0]

      await expect(executeVirtualAgent(agent.id, {}))
        .rejects.toThrow('Network error')

      // Verificar se o agente foi marcado como erro
      const updatedAgents = getVirtualAgents()
      const updatedAgent = updatedAgents.find(a => a.id === agent.id)
      expect(updatedAgent?.status).toBe('error')
    })
  })
})