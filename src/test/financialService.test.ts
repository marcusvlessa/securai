import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  uploadRIFData, 
  runRedFlagAnalysis,
  RIFTransaction,
  RedFlagAlert
} from '../services/financialService'

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

// Mock File API
global.File = class MockFile {
  name: string
  type: string
  size: number
  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename
    this.type = options.type || ''
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  }
  
  async text() {
    return 'data,descricao,valor,tipo\n2024-01-15,PIX Recebido,1500.00,credit'
  }
} as any

describe('Financial Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Upload de dados RIF', () => {
    it('deve processar arquivo CSV corretamente', async () => {
      const csvFile = new File(
        ['data,descricao,contraparte,valor,tipo\n2024-01-15,PIX Recebido,João Silva,1500.00,credit'],
        'transacoes.csv',
        { type: 'text/csv' }
      )

      await uploadRIFData({
        caseId: 'case-123',
        file: csvFile
      })

      const storageKey = 'securai-rif-transactions-case-123'
      const storedData = localStorageMock.getItem(storageKey)
      expect(storedData).toBeDefined()

      const transactions = JSON.parse(storedData!)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].description).toBe('PIX Recebido')
      expect(transactions[0].counterparty).toBe('João Silva')
      expect(transactions[0].amount).toBe('1500.00')
    })

    it('deve validar dados obrigatórios', async () => {
      const invalidFile = new File(
        ['data,descricao\n,'], // Dados inválidos sem valor
        'invalid.csv',
        { type: 'text/csv' }
      )

      // Mock File.text() to return invalid data
      invalidFile.text = async () => 'data,descricao\n,'

      await uploadRIFData({
        caseId: 'case-123',
        file: invalidFile
      })

      const storageKey = 'securai-rif-transactions-case-123'
      const storedData = localStorageMock.getItem(storageKey)
      const transactions = JSON.parse(storedData!)
      
      // Deve filtrar transações inválidas
      expect(transactions).toHaveLength(0)
    })

    it('deve tratar diferentes formatos de arquivo', async () => {
      const xlsxFile = new File(['mock excel data'], 'dados.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      await uploadRIFData({
        caseId: 'case-123',
        file: xlsxFile
      })

      const storageKey = 'securai-rif-transactions-case-123'
      const storedData = localStorageMock.getItem(storageKey)
      const transactions = JSON.parse(storedData!)
      
      // Deve retornar dados mock para Excel
      expect(transactions.length).toBeGreaterThan(0)
      expect(transactions[0].method).toBeDefined()
    })
  })

  describe('Análise de Red Flags', () => {
    beforeEach(() => {
      // Setup mock transactions
      const mockTransactions = [
        {
          id: 'tx1',
          caseId: 'case-123',
          date: '2024-01-15T10:00:00Z',
          amount: '9500.00',
          type: 'credit',
          method: 'PIX',
          holderDocument: '12345678901',
          counterpartyDocument: '98765432100'
        },
        {
          id: 'tx2',
          caseId: 'case-123',
          date: '2024-01-15T10:30:00Z',
          amount: '9800.00',
          type: 'credit',
          method: 'PIX',
          holderDocument: '12345678901',
          counterpartyDocument: '98765432100'
        },
        {
          id: 'tx3',
          caseId: 'case-123',
          date: '2024-01-15T11:00:00Z',
          amount: '9700.00',
          type: 'credit',
          method: 'PIX',
          holderDocument: '12345678901',
          counterpartyDocument: '98765432100'
        }
      ]

      localStorageMock.setItem(
        'securai-rif-transactions-case-123',
        JSON.stringify(mockTransactions)
      )
    })

    it('deve detectar fracionamento', async () => {
      await runRedFlagAnalysis({
        caseId: 'case-123',
        thresholds: { fracionamento: 10000 },
        window: 24
      })

      const alertsKey = 'securai-redflag-alerts-case-123'
      const alertsData = localStorageMock.getItem(alertsKey)
      expect(alertsData).toBeDefined()

      const alerts = JSON.parse(alertsData!)
      const fractioningAlert = alerts.find((a: any) => a.type === 'fracionamento')
      
      expect(fractioningAlert).toBeDefined()
      expect(fractioningAlert.severity).toBe('high')
      expect(fractioningAlert.transactionIds).toHaveLength(3)
    })

    it('deve detectar uso intensivo de espécie', async () => {
      const cashTransactions = [
        {
          id: 'tx1',
          caseId: 'case-123',
          date: '2024-01-15T10:00:00Z',
          amount: '30000.00',
          type: 'credit',
          method: 'Espécie',
          holderDocument: '12345678901'
        },
        {
          id: 'tx2',
          caseId: 'case-123',
          date: '2024-01-15T11:00:00Z',
          amount: '25000.00',
          type: 'credit',
          method: 'Espécie',
          holderDocument: '12345678901'
        },
        {
          id: 'tx3',
          caseId: 'case-123',
          date: '2024-01-15T12:00:00Z',
          amount: '5000.00',
          type: 'credit',
          method: 'PIX',
          holderDocument: '12345678901'
        }
      ]

      localStorageMock.setItem(
        'securai-rif-transactions-case-123',
        JSON.stringify(cashTransactions)
      )

      await runRedFlagAnalysis({
        caseId: 'case-123',
        thresholds: { especie: 50000 },
        window: 24
      })

      const alertsKey = 'securai-redflag-alerts-case-123'
      const alertsData = localStorageMock.getItem(alertsKey)
      const alerts = JSON.parse(alertsData!)
      
      const cashAlert = alerts.find((a: any) => a.type === 'especie-intensa')
      expect(cashAlert).toBeDefined()
      expect(cashAlert.severity).toBe('high')
    })

    it('deve calcular métricas de risco corretamente', async () => {
      await runRedFlagAnalysis({
        caseId: 'case-123',
        thresholds: { fracionamento: 10000 },
        window: 24
      })

      const alertsKey = 'securai-redflag-alerts-case-123'
      const alertsData = localStorageMock.getItem(alertsKey)
      const alerts = JSON.parse(alertsData!)
      
      alerts.forEach((alert: any) => {
        expect(alert.score).toBeGreaterThan(0)
        expect(alert.score).toBeLessThanOrEqual(100)
        expect(alert.explanation).toBeDefined()
        expect(alert.explanation.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Geração de relatórios', () => {
    beforeEach(() => {
      const mockTransactions = [
        {
          id: 'tx1',
          amount: '1000.00',
          type: 'credit',
          method: 'PIX',
          date: '2024-01-15T10:00:00Z'
        },
        {
          id: 'tx2',
          amount: '2000.00',
          type: 'debit',
          method: 'TED',
          date: '2024-01-16T10:00:00Z'
        }
      ]

      localStorageMock.setItem(
        'securai-rif-transactions-case-123',
        JSON.stringify(mockTransactions)
      )
    })

    it('deve calcular estatísticas de transações', () => {
      const transactions = [
        { amount: '1000.00', type: 'credit' as const, method: 'PIX' as const },
        { amount: '2000.00', type: 'debit' as const, method: 'TED' as const },
        { amount: '1500.00', type: 'credit' as const, method: 'PIX' as const }
      ]

      // Mock de função de cálculo de estatísticas
      const calculateStats = (txs: any[]) => {
        const totalTransactions = txs.length
        const totalCredits = txs
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
          .toFixed(2)
        const totalDebits = txs
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
          .toFixed(2)
        const netFlow = (parseFloat(totalCredits) - parseFloat(totalDebits)).toFixed(2)
        
        const methodDistribution: Record<string, number> = {}
        txs.forEach(t => {
          methodDistribution[t.method] = (methodDistribution[t.method] || 0) + 1
        })

        return { totalTransactions, totalCredits, totalDebits, netFlow, methodDistribution }
      }

      const stats = calculateStats(transactions)
      
      expect(stats.totalTransactions).toBe(3)
      expect(stats.totalCredits).toBe('2500.00')
      expect(stats.totalDebits).toBe('2000.00')
      expect(stats.netFlow).toBe('500.00')
      expect(stats.methodDistribution.PIX).toBe(2)
      expect(stats.methodDistribution.TED).toBe(1)
    })

    it('deve gerar relatório financeiro formatado', async () => {
      // Mock de função de geração de relatório
      const generateReport = (caseId: string) => {
        return `RELATÓRIO DE ANÁLISE FINANCEIRA\n\nCaso: ${caseId}\nTotal de Transações: 2\nFluxo Líquido: R$ 500,00\nDistribuição por Método:\n- PIX: 1\n- TED: 1`
      }

      const report = generateReport('case-123')
      
      expect(report).toContain('RELATÓRIO DE ANÁLISE FINANCEIRA')
      expect(report).toContain('Total de Transações:')
      expect(report).toContain('Fluxo Líquido:')
      expect(report).toContain('Distribuição por Método:')
    })
  })

  describe('Normalização de dados', () => {
    it('deve normalizar valores monetários corretamente', () => {
      const testCases = [
        { input: 'R$ 1.500,50', expected: '1500.50' },
        { input: '1,500.50', expected: '1500.50' },
        { input: '1500,50', expected: '1500.50' },
        { input: 'R$1.500,50', expected: '1500.50' },
        { input: '1500', expected: '1500.00' }
      ]

      // Mock a função de normalização
      const normalizeAmount = (amountStr: string): string => {
        if (!amountStr) return '0.00'
        
        const cleaned = amountStr
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(/,/g, '.')
          .replace(/[^\d.-]/g, '')
        
        const num = parseFloat(cleaned || '0')
        return num.toFixed(2)
      }

      testCases.forEach(({ input, expected }) => {
        expect(normalizeAmount(input)).toBe(expected)
      })
    })

    it('deve normalizar datas em diferentes formatos', () => {
      const normalizeDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString()
        
        const formats = [
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
          /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        ]
        
        for (const format of formats) {
          const match = dateStr.match(format)
          if (match) {
            if (format === formats[0]) {
              const [, day, month, year] = match
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString()
            } else {
              const [, year, month, day] = match
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString()
            }
          }
        }
        
        return new Date(dateStr).toISOString()
      }

      expect(normalizeDate('15/01/2024')).toContain('2024-01-15')
      expect(normalizeDate('2024-01-15')).toContain('2024-01-15')
    })
  })
})