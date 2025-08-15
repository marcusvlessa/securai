import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getVirtualAgents,
  createVirtualAgent,
  updateVirtualAgent,
  deleteVirtualAgent,
  executeVirtualAgent,
  saveVirtualAgents
} from '../services/virtualAgentsService'

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

// Mock GROQ service
vi.mock('../services/groqService', () => ({
  makeGroqAIRequest: vi.fn().mockResolvedValue('Análise realizada pela IA'),
  hasValidApiKey: vi.fn().mockReturnValue(true)
}))

describe('Virtual Agents Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Gerenciamento de agentes', () => {
    it('deve retornar agentes padrão quando não há dados salvos', () => {
      const agents = getVirtualAgents()
      
      expect(agents).toHaveLength(2)
      expect(agents[0].name).toBe('Resumo de Caso Semanal')
      expect(agents[1].name).toBe('Relatório Visual de Vínculos')
    })

    it('deve criar novo agente virtual', () => {
      const agentData = {
        name: 'Agente de Monitoramento',
        objective: 'Monitorar evidências em tempo real',
        status: 'active' as const,
        connectors: [],
        functions: [],
        scope: {
          caseIds: ['case-123'],
          reportTypes: ['monitoring'],
          dataTypes: ['real-time']
        },
        securityRules: []
      }

      const newAgent = createVirtualAgent(agentData)
      
      expect(newAgent.id).toBeDefined()
      expect(newAgent.name).toBe('Agente de Monitoramento')
      expect(newAgent.executionCount).toBe(0)
      expect(newAgent.lastExecution).toBeDefined()
    })

    it('deve atualizar agente existente', () => {
      const agents = getVirtualAgents()
      const firstAgent = agents[0]

      const updatedAgent = updateVirtualAgent(firstAgent.id, {
        status: 'inactive',
        objective: 'Objetivo atualizado'
      })

      expect(updatedAgent).toBeDefined()
      expect(updatedAgent!.status).toBe('inactive')
      expect(updatedAgent!.objective).toBe('Objetivo atualizado')
    })

    it('deve deletar agente', () => {
      const agents = getVirtualAgents()
      const agentId = agents[0].id

      const deleted = deleteVirtualAgent(agentId)
      expect(deleted).toBe(true)

      const remainingAgents = getVirtualAgents()
      expect(remainingAgents.find(a => a.id === agentId)).toBeUndefined()
    })

    it('deve retornar false ao tentar deletar agente inexistente', () => {
      const deleted = deleteVirtualAgent('agent-inexistente')
      expect(deleted).toBe(false)
    })
  })

  describe('Execução de agentes', () => {
    it('deve executar agente com sucesso', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0]

      const caseData = {
        title: 'Caso de Teste',
        description: 'Descrição do caso para teste'
      }

      const execution = await executeVirtualAgent(agent.id, caseData)

      expect(execution.status).toBe('completed')
      expect(execution.agentId).toBe(agent.id)
      expect(execution.logs.length).toBeGreaterThan(0)
      expect(execution.outputs.length).toBeGreaterThan(0)
      expect(execution.endTime).toBeDefined()
    })

    it('deve registrar logs durante execução', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0]

      const execution = await executeVirtualAgent(agent.id, {})

      const infoLogs = execution.logs.filter(log => log.level === 'info')
      expect(infoLogs.length).toBeGreaterThan(0)
      
      const startLog = execution.logs.find(log => 
        log.message.includes('Starting execution')
      )
      expect(startLog).toBeDefined()
    })

    it('deve criar outputs da execução', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0]

      const execution = await executeVirtualAgent(agent.id, { data: 'test' })

      expect(execution.outputs.length).toBeGreaterThan(0)
      
      const aiOutput = execution.outputs.find(output => 
        output.name === 'AI Analysis'
      )
      expect(aiOutput).toBeDefined()
      expect(aiOutput!.type).toBe('text')
      expect(aiOutput!.content).toBe('Análise realizada pela IA')
    })

    it('deve simular integração com Canva', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0] // Agent with Canva connector

      const execution = await executeVirtualAgent(agent.id, {})

      const canvaOutput = execution.outputs.find(output => 
        output.name === 'Canva Design'
      )
      expect(canvaOutput).toBeDefined()
      expect(canvaOutput!.type).toBe('url')
      expect(canvaOutput!.content).toContain('canva.com/design/')
    })

    it('deve calcular métricas de execução', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0]

      const execution = await executeVirtualAgent(agent.id, { test: 'data' })

      expect(execution.metrics.executionTime).toBeGreaterThan(0)
      expect(execution.metrics.apiCallsCount).toBeGreaterThan(0)
      expect(execution.metrics.dataProcessed).toBeGreaterThan(0)
      expect(execution.metrics.tokensUsed).toBeDefined()
    })

    it('deve atualizar contador de execuções do agente', async () => {
      const agents = getVirtualAgents()
      const agent = agents[0]
      const initialCount = agent.executionCount

      await executeVirtualAgent(agent.id, {})

      const updatedAgents = getVirtualAgents()
      const updatedAgent = updatedAgents.find(a => a.id === agent.id)
      
      expect(updatedAgent!.executionCount).toBe(initialCount + 1)
      expect(updatedAgent!.status).toBe('active')
    })

    it('deve tratar erro na execução', async () => {
      const { makeGroqAIRequest } = await import('../services/groqService')
      ;(makeGroqAIRequest as any).mockRejectedValueOnce(new Error('API Error'))

      const agents = getVirtualAgents()
      const agent = agents[0]

      await expect(executeVirtualAgent(agent.id, {}))
        .rejects.toThrow('API Error')
    })

    it('deve tratar agente não encontrado', async () => {
      await expect(executeVirtualAgent('agent-inexistente', {}))
        .rejects.toThrow('Agent agent-inexistente not found')
    })
  })

  describe('Funções de agentes', () => {
    it('deve validar tipos de função suportados', () => {
      const agents = getVirtualAgents()
      const functions = agents[0].functions

      const supportedTypes = [
        'analyze_case',
        'generate_summary', 
        'generate_visual_report',
        'send_notification',
        'monitor_evidence',
        'analyze_links'
      ]

      functions.forEach(func => {
        expect(supportedTypes).toContain(func.type)
      })
    })

    it('deve validar conectores suportados', () => {
      const agents = getVirtualAgents()
      const connectors = agents.flatMap(agent => agent.connectors)

      const supportedTypes = ['canva', 'webhook', 'email', 'database']

      connectors.forEach(connector => {
        expect(supportedTypes).toContain(connector.type)
      })
    })
  })

  describe('Segurança e regras', () => {
    it('deve validar regras de segurança dos agentes', () => {
      const agents = getVirtualAgents()
      
      agents.forEach(agent => {
        if (agent.securityRules.length > 0) {
          agent.securityRules.forEach(rule => {
            expect(['data_access', 'export_permission', 'user_role', 'time_restriction'])
              .toContain(rule.type)
            expect(rule.rule).toBeDefined()
            expect(rule.value).toBeDefined()
          })
        }
      })
    })

    it('deve validar escopo dos agentes', () => {
      const agents = getVirtualAgents()
      
      agents.forEach(agent => {
        expect(agent.scope.caseIds).toBeDefined()
        expect(Array.isArray(agent.scope.caseIds)).toBe(true)
        expect(agent.scope.reportTypes).toBeDefined()
        expect(Array.isArray(agent.scope.reportTypes)).toBe(true)
        expect(agent.scope.dataTypes).toBeDefined()
        expect(Array.isArray(agent.scope.dataTypes)).toBe(true)
      })
    })
  })

  describe('Persistência de dados', () => {
    it('deve salvar agentes no localStorage', () => {
      const agents = getVirtualAgents()
      const modifiedAgents = agents.map(agent => ({
        ...agent,
        name: agent.name + ' - Modificado'
      }))

      saveVirtualAgents(modifiedAgents)

      const retrievedAgents = getVirtualAgents()
      expect(retrievedAgents[0].name).toContain('Modificado')
    })

    it('deve tratar erro ao salvar dados', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock localStorage.setItem to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      saveVirtualAgents([])

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving virtual agents:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})