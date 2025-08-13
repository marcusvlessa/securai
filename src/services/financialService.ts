import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { analyzeTextWithGroq } from './groqService';

// Configure Decimal.js for precise financial calculations
Decimal.config({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export interface RIFTransaction {
  id: string;
  caseId: string;
  date: string;
  description: string;
  counterparty: string;
  agency: string;
  account: string;
  bank: string;
  amount: string; // Using string to maintain precision
  currency: string;
  type: 'credit' | 'debit';
  method: 'PIX' | 'TED' | 'TEF' | 'Espécie' | 'Cartão' | 'Boleto' | 'Outros';
  channel: string;
  country: string;
  holderDocument: string;
  counterpartyDocument: string;
  evidenceId: string;
  createdAt: string;
}

export interface RedFlagRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  parameters: Record<string, any>;
}

export interface RedFlagAlert {
  id: string;
  caseId: string;
  ruleId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidenceCount: number;
  transactionIds: string[];
  parameters: Record<string, any>;
  score: number;
  explanation: string;
  createdAt: string;
}

// Default red flag rules
const DEFAULT_RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'fractionamento',
    name: 'Fracionamento',
    description: 'Múltiplos depósitos/PIX abaixo de limiar em janela curta',
    enabled: true,
    severity: 'high',
    parameters: {
      threshold: 10000,
      window: 24, // hours
      minTransactions: 3
    }
  },
  {
    id: 'circularidade',
    name: 'Circularidade Financeira',
    description: 'Fluxos circulares A→B→C→A com valores similares',
    enabled: true,
    severity: 'high',
    parameters: {
      window: 168, // hours (7 days)
      similarityThreshold: 0.9
    }
  },
  {
    id: 'fan-in-out',
    name: 'Fan-in/Fan-out Anormal',
    description: 'Conta com muitas contrapartes exclusivas em pouco tempo',
    enabled: true,
    severity: 'medium',
    parameters: {
      threshold: 10,
      window: 168 // hours (7 days)
    }
  },
  {
    id: 'perfil-incompativel',
    name: 'Transações Incompatíveis',
    description: 'Valores/volumes acima do perfil histórico',
    enabled: true,
    severity: 'medium',
    parameters: {
      multiplier: 5,
      window: 720 // hours (30 days)
    }
  },
  {
    id: 'especie-intensa',
    name: 'Uso Intensivo de Espécie',
    description: 'Alto volume em espécie sem lastro aparente',
    enabled: true,
    severity: 'high',
    parameters: {
      threshold: 50000,
      percentage: 70 // % of total volume
    }
  }
];

// Parse different file formats
const parseRIFFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'csv') {
      return parseCSVFile(file);
    } else if (fileExtension === 'xlsx') {
      return parseExcelFile(file);
    } else if (fileExtension === 'json') {
      return parseJSONFile(file);
    } else if (fileExtension === 'pdf') {
      return parsePDFFile(file);
    } else {
      throw new Error('Formato de arquivo não suportado');
    }
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    throw error;
  }
};

const parseCSVFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Arquivo CSV deve conter pelo menos cabeçalho e uma linha de dados');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const transactions: Partial<RIFTransaction>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length === headers.length) {
      const transaction: Partial<RIFTransaction> = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        
        // Map common RIF fields
        switch (header.toLowerCase()) {
          case 'data':
          case 'date':
            transaction.date = normalizeDate(value);
            break;
          case 'descricao':
          case 'description':
            transaction.description = value;
            break;
          case 'contraparte':
          case 'counterparty':
            transaction.counterparty = value;
            break;
          case 'agencia':
          case 'agency':
            transaction.agency = value;
            break;
          case 'conta':
          case 'account':
            transaction.account = value;
            break;
          case 'banco':
          case 'bank':
            transaction.bank = value;
            break;
          case 'valor':
          case 'amount':
            transaction.amount = normalizeAmount(value);
            break;
          case 'tipo':
          case 'type':
            transaction.type = normalizeTransactionType(value);
            break;
          case 'metodo':
          case 'method':
            transaction.method = normalizeMethod(value);
            break;
          case 'cpf_cnpj_titular':
          case 'holder_document':
            transaction.holderDocument = normalizeDocument(value);
            break;
          case 'cpf_cnpj_contraparte':
          case 'counterparty_document':
            transaction.counterpartyDocument = normalizeDocument(value);
            break;
        }
      });
      
      transactions.push(transaction);
    }
  }
  
  return transactions;
};

const parseExcelFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  // For now, return mock data since XLSX parsing requires additional library
  console.log('Parsing Excel file:', file.name);
  
  return [
    {
      date: '2024-01-15T10:00:00Z',
      description: 'TED Recebida - João Silva',
      counterparty: 'João Silva',
      agency: '1234',
      account: '567890-1',
      bank: '001',
      amount: '15000.00',
      type: 'credit' as const,
      method: 'TED' as const,
      holderDocument: '123.456.789-01',
      counterpartyDocument: '987.654.321-00'
    },
    {
      date: '2024-01-15T14:30:00Z',
      description: 'PIX Enviado - Maria Santos',
      counterparty: 'Maria Santos',
      agency: '1234',
      account: '567890-1',
      bank: '001',
      amount: '8500.00',
      type: 'debit' as const,
      method: 'PIX' as const,
      holderDocument: '123.456.789-01',
      counterpartyDocument: '111.222.333-44'
    }
  ];
};

const parseJSONFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  const text = await file.text();
  const data = JSON.parse(text);
  
  if (!Array.isArray(data)) {
    throw new Error('Arquivo JSON deve conter um array de transações');
  }
  
  return data.map(item => ({
    date: normalizeDate(item.date || item.data),
    description: item.description || item.descricao,
    counterparty: item.counterparty || item.contraparte,
    agency: item.agency || item.agencia,
    account: item.account || item.conta,
    bank: item.bank || item.banco,
    amount: normalizeAmount(item.amount || item.valor),
    type: normalizeTransactionType(item.type || item.tipo),
    method: normalizeMethod(item.method || item.metodo),
    holderDocument: normalizeDocument(item.holderDocument || item.cpf_cnpj_titular),
    counterpartyDocument: normalizeDocument(item.counterpartyDocument || item.cpf_cnpj_contraparte)
  }));
};

const parsePDFFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  // Mock OCR extraction for PDF files
  console.log('Parsing PDF file with OCR:', file.name);
  
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return [
    {
      date: '2024-01-10T09:15:00Z',
      description: 'Extrato Bancário - Depósito Espécie',
      counterparty: 'Depósito Balcão',
      agency: '5678',
      account: '123456-7',
      bank: '237',
      amount: '25000.00',
      type: 'credit' as const,
      method: 'Espécie' as const,
      holderDocument: '123.456.789-01',
      counterpartyDocument: ''
    }
  ];
};

// Normalization functions
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString();
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY or DD-MM-YYYY
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      } else {
        // YYYY-MM-DD
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      }
    }
  }
  
  // Fallback to Date constructor
  return new Date(dateStr).toISOString();
};

const normalizeAmount = (amountStr: string): string => {
  if (!amountStr) return '0.00';
  
  // Remove currency symbols and normalize decimal separators
  const cleaned = amountStr
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  
  const decimal = new Decimal(cleaned || '0');
  return decimal.toFixed(2);
};

const normalizeTransactionType = (typeStr: string): 'credit' | 'debit' => {
  if (!typeStr) return 'debit';
  
  const type = typeStr.toLowerCase();
  if (type.includes('credit') || type.includes('entrada') || type.includes('receb')) {
    return 'credit';
  }
  return 'debit';
};

const normalizeMethod = (methodStr: string): RIFTransaction['method'] => {
  if (!methodStr) return 'Outros';
  
  const method = methodStr.toUpperCase();
  if (method.includes('PIX')) return 'PIX';
  if (method.includes('TED')) return 'TED';
  if (method.includes('TEF') || method.includes('TRANSF')) return 'TEF';
  if (method.includes('ESPECIE') || method.includes('DINHEIRO')) return 'Espécie';
  if (method.includes('CARTAO')) return 'Cartão';
  if (method.includes('BOLETO')) return 'Boleto';
  
  return 'Outros';
};

const normalizeDocument = (docStr: string): string => {
  if (!docStr) return '';
  
  // Remove all non-numeric characters
  return docStr.replace(/\D/g, '');
};

// Upload and process RIF data
export const uploadRIFData = async (params: {
  caseId: string;
  file: File;
  mappingPreset?: string;
}): Promise<void> => {
  const { caseId, file, mappingPreset = 'RIF-COAF' } = params;
  
  try {
    console.log(`Processing RIF file: ${file.name} for case: ${caseId}`);
    
    // Parse file
    const parsedTransactions = await parseRIFFile(file);
    
    // Validate and enrich transactions
    const enrichedTransactions: RIFTransaction[] = parsedTransactions
      .filter(t => t.date && t.amount)
      .map((t, index) => ({
        id: `${caseId}-${file.name}-${index}`,
        caseId,
        date: t.date || new Date().toISOString(),
        description: t.description || 'Transação sem descrição',
        counterparty: t.counterparty || 'Não informado',
        agency: t.agency || '',
        account: t.account || '',
        bank: t.bank || '',
        amount: t.amount || '0.00',
        currency: 'BRL',
        type: t.type || 'debit',
        method: t.method || 'Outros',
        channel: 'Internet Banking',
        country: 'BR',
        holderDocument: t.holderDocument || '',
        counterpartyDocument: t.counterpartyDocument || '',
        evidenceId: file.name,
        createdAt: new Date().toISOString()
      }));
    
    // Save to localStorage
    const storageKey = `securai-rif-transactions-${caseId}`;
    const existingData = localStorage.getItem(storageKey);
    const existingTransactions = existingData ? JSON.parse(existingData) : [];
    
    // Merge with existing data (avoid duplicates by ID)
    const allTransactions = [...existingTransactions];
    enrichedTransactions.forEach(newTx => {
      const existingIndex = allTransactions.findIndex(tx => tx.id === newTx.id);
      if (existingIndex >= 0) {
        allTransactions[existingIndex] = newTx;
      } else {
        allTransactions.push(newTx);
      }
    });
    
    localStorage.setItem(storageKey, JSON.stringify(allTransactions));
    
    console.log(`Saved ${enrichedTransactions.length} transactions for case ${caseId}`);
    
    // Initialize red flag rules if not exists
    const rulesKey = `securai-redflag-rules-${caseId}`;
    if (!localStorage.getItem(rulesKey)) {
      localStorage.setItem(rulesKey, JSON.stringify(DEFAULT_RED_FLAG_RULES));
    }
    
  } catch (error) {
    console.error('Error uploading RIF data:', error);
    throw new Error('Erro ao processar arquivo RIF: ' + (error as Error).message);
  }
};

// Run red flag analysis
export const runRedFlagAnalysis = async (params: {
  caseId: string;
  thresholds: Record<string, number>;
  window: number;
}): Promise<void> => {
  const { caseId, thresholds, window } = params;
  
  try {
    console.log(`Running red flag analysis for case: ${caseId}`);
    
    // Get transactions
    const storageKey = `securai-rif-transactions-${caseId}`;
    const transactionsData = localStorage.getItem(storageKey);
    if (!transactionsData) {
      throw new Error('Nenhuma transação encontrada para análise');
    }
    
    const transactions: RIFTransaction[] = JSON.parse(transactionsData);
    const alerts: RedFlagAlert[] = [];
    
    // Get rules
    const rulesKey = `securai-redflag-rules-${caseId}`;
    const rulesData = localStorage.getItem(rulesKey);
    const rules: RedFlagRule[] = rulesData ? JSON.parse(rulesData) : DEFAULT_RED_FLAG_RULES;
    
    // Run fractionamento analysis
    const fractioningRule = rules.find(r => r.id === 'fracionamento' && r.enabled);
    if (fractioningRule) {
      const fractioningAlerts = detectFractionamento(transactions, fractioningRule.parameters, caseId);
      alerts.push(...fractioningAlerts);
    }
    
    // Run circularidade analysis
    const circularityRule = rules.find(r => r.id === 'circularidade' && r.enabled);
    if (circularityRule) {
      const circularityAlerts = detectCircularidade(transactions, circularityRule.parameters, caseId);
      alerts.push(...circularityAlerts);
    }
    
    // Run fan-in/fan-out analysis
    const fanInOutRule = rules.find(r => r.id === 'fan-in-out' && r.enabled);
    if (fanInOutRule) {
      const fanInOutAlerts = detectFanInOut(transactions, fanInOutRule.parameters, caseId);
      alerts.push(...fanInOutAlerts);
    }
    
    // Run incompatible profile analysis
    const profileRule = rules.find(r => r.id === 'perfil-incompativel' && r.enabled);
    if (profileRule) {
      const profileAlerts = detectIncompatibleProfile(transactions, profileRule.parameters, caseId);
      alerts.push(...profileAlerts);
    }
    
    // Run intensive cash usage analysis
    const cashRule = rules.find(r => r.id === 'especie-intensa' && r.enabled);
    if (cashRule) {
      const cashAlerts = detectIntensiveCash(transactions, cashRule.parameters, caseId);
      alerts.push(...cashAlerts);
    }
    
    // Save alerts
    const alertsKey = `securai-redflag-alerts-${caseId}`;
    localStorage.setItem(alertsKey, JSON.stringify(alerts));
    
    console.log(`Generated ${alerts.length} red flag alerts for case ${caseId}`);
    
  } catch (error) {
    console.error('Error running red flag analysis:', error);
    throw error;
  }
};

// Red flag detection functions
const detectFractionamento = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const threshold = params.threshold || 10000;
  const windowHours = params.window || 24;
  const minTransactions = params.minTransactions || 3;
  
  // Group transactions by holder and method
  const groups = new Map<string, RIFTransaction[]>();
  
  transactions.forEach(tx => {
    if (tx.type === 'credit' && (tx.method === 'PIX' || tx.method === 'Espécie')) {
      const key = `${tx.holderDocument}-${tx.method}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }
  });
  
  groups.forEach((txs, key) => {
    // Sort by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Check for fractionamento in sliding window
    for (let i = 0; i < txs.length - minTransactions + 1; i++) {
      const windowTxs = [];
      const startTime = new Date(txs[i].date).getTime();
      
      for (let j = i; j < txs.length; j++) {
        const txTime = new Date(txs[j].date).getTime();
        if (txTime - startTime <= windowHours * 60 * 60 * 1000) {
          if (new Decimal(txs[j].amount).lessThan(threshold)) {
            windowTxs.push(txs[j]);
          }
        } else {
          break;
        }
      }
      
      if (windowTxs.length >= minTransactions) {
        const totalAmount = windowTxs.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
        
        alerts.push({
          id: `fractionamento-${key}-${i}`,
          caseId,
          ruleId: 'fracionamento',
          type: 'Fracionamento',
          description: `Detectado fracionamento: ${windowTxs.length} transações ${windowTxs[0].method} totalizando ${totalAmount.toFixed(2)} em ${windowHours}h`,
          severity: 'high',
          evidenceCount: windowTxs.length,
          transactionIds: windowTxs.map(tx => tx.id),
          parameters: { threshold, windowHours, totalAmount: totalAmount.toFixed(2) },
          score: Math.min(100, (windowTxs.length / minTransactions) * 50),
          explanation: `Múltiplas transações abaixo do limiar de ${threshold} concentradas em período curto podem indicar tentativa de evitar controles regulatórios`,
          createdAt: new Date().toISOString()
        });
      }
    }
  });
  
  return alerts;
};

const detectCircularidade = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const windowHours = params.window || 168; // 7 days
  const similarityThreshold = params.similarityThreshold || 0.9;
  
  // Find potential circular patterns A→B→C→A
  const transfers = transactions.filter(tx => 
    tx.type === 'debit' && (tx.method === 'PIX' || tx.method === 'TED' || tx.method === 'TEF')
  );
  
  for (let i = 0; i < transfers.length; i++) {
    const txA = transfers[i];
    const startTime = new Date(txA.date).getTime();
    
    // Look for B→C in window
    for (let j = i + 1; j < transfers.length; j++) {
      const txB = transfers[j];
      const timeDiffB = new Date(txB.date).getTime() - startTime;
      
      if (timeDiffB > windowHours * 60 * 60 * 1000) break;
      
      if (txB.holderDocument === txA.counterpartyDocument) {
        // Look for C→A completing the circle
        for (let k = j + 1; k < transfers.length; k++) {
          const txC = transfers[k];
          const timeDiffC = new Date(txC.date).getTime() - startTime;
          
          if (timeDiffC > windowHours * 60 * 60 * 1000) break;
          
          if (txC.holderDocument === txB.counterpartyDocument && 
              txC.counterpartyDocument === txA.holderDocument) {
            
            // Check amount similarity
            const amountA = new Decimal(txA.amount);
            const amountB = new Decimal(txB.amount);
            const amountC = new Decimal(txC.amount);
            
            const avgAmount = amountA.plus(amountB).plus(amountC).dividedBy(3);
            const similarity = Math.min(
              amountA.dividedBy(avgAmount).toNumber(),
              amountB.dividedBy(avgAmount).toNumber(),
              amountC.dividedBy(avgAmount).toNumber()
            );
            
            if (similarity >= similarityThreshold) {
              alerts.push({
                id: `circularidade-${txA.id}-${txB.id}-${txC.id}`,
                caseId,
                ruleId: 'circularidade',
                type: 'Circularidade Financeira',
                description: `Detectada circularidade: ${amountA.toFixed(2)} → ${amountB.toFixed(2)} → ${amountC.toFixed(2)} em ${Math.round(timeDiffC / (60 * 60 * 1000))}h`,
                severity: 'high',
                evidenceCount: 3,
                transactionIds: [txA.id, txB.id, txC.id],
                parameters: { similarity, windowHours, avgAmount: avgAmount.toFixed(2) },
                score: similarity * 100,
                explanation: 'Movimentação circular pode indicar lavagem de dinheiro ou estruturação artificial de recursos',
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }
    }
  }
  
  return alerts;
};

const detectFanInOut = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const threshold = params.threshold || 10;
  const windowHours = params.window || 168; // 7 days
  
  // Group by holder
  const holderMap = new Map<string, RIFTransaction[]>();
  
  transactions.forEach(tx => {
    if (!holderMap.has(tx.holderDocument)) {
      holderMap.set(tx.holderDocument, []);
    }
    holderMap.get(tx.holderDocument)!.push(tx);
  });
  
  holderMap.forEach((txs, holder) => {
    // Sort by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Sliding window analysis
    for (let i = 0; i < txs.length; i++) {
      const startTime = new Date(txs[i].date).getTime();
      const windowTxs = [];
      
      for (let j = i; j < txs.length; j++) {
        const txTime = new Date(txs[j].date).getTime();
        if (txTime - startTime <= windowHours * 60 * 60 * 1000) {
          windowTxs.push(txs[j]);
        } else {
          break;
        }
      }
      
      if (windowTxs.length >= threshold) {
        const uniqueCounterparties = new Set(windowTxs.map(tx => tx.counterpartyDocument));
        
        if (uniqueCounterparties.size >= threshold) {
          alerts.push({
            id: `fan-in-out-${holder}-${i}`,
            caseId,
            ruleId: 'fan-in-out',
            type: 'Fan-in/Fan-out Anormal',
            description: `Conta com ${uniqueCounterparties.size} contrapartes diferentes em ${Math.round((new Date(windowTxs[windowTxs.length - 1].date).getTime() - startTime) / (60 * 60 * 1000))}h`,
            severity: 'medium',
            evidenceCount: windowTxs.length,
            transactionIds: windowTxs.map(tx => tx.id),
            parameters: { uniqueCounterparties: uniqueCounterparties.size, windowHours },
            score: Math.min(100, (uniqueCounterparties.size / threshold) * 60),
            explanation: 'Alto número de contrapartes diferentes pode indicar atividade de distribuição ou concentração suspeita',
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  });
  
  return alerts;
};

const detectIncompatibleProfile = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const multiplier = params.multiplier || 5;
  const windowHours = params.window || 720; // 30 days
  
  // Group by holder
  const holderMap = new Map<string, RIFTransaction[]>();
  
  transactions.forEach(tx => {
    if (!holderMap.has(tx.holderDocument)) {
      holderMap.set(tx.holderDocument, []);
    }
    holderMap.get(tx.holderDocument)!.push(tx);
  });
  
  holderMap.forEach((txs, holder) => {
    if (txs.length < 10) return; // Need sufficient history
    
    // Sort by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate historical average
    const historicalTxs = txs.slice(0, Math.floor(txs.length * 0.7));
    const recentTxs = txs.slice(Math.floor(txs.length * 0.7));
    
    const historicalAvg = historicalTxs
      .reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0))
      .dividedBy(historicalTxs.length);
    
    // Check recent transactions
    recentTxs.forEach(tx => {
      const amount = new Decimal(tx.amount);
      if (amount.greaterThan(historicalAvg.times(multiplier))) {
        alerts.push({
          id: `perfil-incompativel-${tx.id}`,
          caseId,
          ruleId: 'perfil-incompativel',
          type: 'Transação Incompatível com Perfil',
          description: `Transação de ${amount.toFixed(2)} é ${amount.dividedBy(historicalAvg).toFixed(1)}x maior que média histórica`,
          severity: 'medium',
          evidenceCount: 1,
          transactionIds: [tx.id],
          parameters: { amount: amount.toFixed(2), historicalAvg: historicalAvg.toFixed(2), multiplier },
          score: Math.min(100, amount.dividedBy(historicalAvg).toNumber() * 20),
          explanation: 'Transação significativamente acima do perfil histórico pode indicar atividade suspeita',
          createdAt: new Date().toISOString()
        });
      }
    });
  });
  
  return alerts;
};

const detectIntensiveCash = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const threshold = params.threshold || 50000;
  const percentage = params.percentage || 70;
  
  // Group by holder
  const holderMap = new Map<string, RIFTransaction[]>();
  
  transactions.forEach(tx => {
    if (!holderMap.has(tx.holderDocument)) {
      holderMap.set(tx.holderDocument, []);
    }
    holderMap.get(tx.holderDocument)!.push(tx);
  });
  
  holderMap.forEach((txs, holder) => {
    const cashTxs = txs.filter(tx => tx.method === 'Espécie');
    const totalCash = cashTxs.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    const totalVolume = txs.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    
    const cashPercentage = totalVolume.greaterThan(0) ? totalCash.dividedBy(totalVolume).times(100) : new Decimal(0);
    
    if (totalCash.greaterThan(threshold) && cashPercentage.greaterThan(percentage)) {
      alerts.push({
        id: `especie-intensa-${holder}`,
        caseId,
        ruleId: 'especie-intensa',
        type: 'Uso Intensivo de Espécie',
        description: `Movimentação em espécie de ${totalCash.toFixed(2)} (${cashPercentage.toFixed(1)}% do total)`,
        severity: 'high',
        evidenceCount: cashTxs.length,
        transactionIds: cashTxs.map(tx => tx.id),
        parameters: { totalCash: totalCash.toFixed(2), cashPercentage: cashPercentage.toFixed(1), threshold },
        score: Math.min(100, cashPercentage.toNumber()),
        explanation: 'Alto uso de espécie pode indicar tentativa de dificultar rastreamento de recursos',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return alerts;
};

// Get financial metrics
export const getFinancialMetrics = async (caseId: string, filters: any = {}) => {
  try {
    const storageKey = `securai-rif-transactions-${caseId}`;
    const transactionsData = localStorage.getItem(storageKey);
    
    if (!transactionsData) {
      return {
        totalCredits: '0.00',
        totalDebits: '0.00',
        balance: '0.00',
        avgTicket: '0.00',
        transactionCount: 0,
        topCounterparties: [],
        periodData: [],
        methodDistribution: [],
        timeHeatmap: []
      };
    }
    
    const transactions: RIFTransaction[] = JSON.parse(transactionsData);
    
    // Apply filters
    let filteredTxs = transactions;
    
    if (filters.timeRange) {
      const now = new Date();
      const days = parseInt(filters.timeRange.replace('d', '')) || 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filteredTxs = filteredTxs.filter(tx => new Date(tx.date) >= cutoffDate);
    }
    
    if (filters.minValue) {
      const minValue = new Decimal(filters.minValue);
      filteredTxs = filteredTxs.filter(tx => new Decimal(tx.amount).greaterThanOrEqualTo(minValue));
    }
    
    if (filters.method) {
      filteredTxs = filteredTxs.filter(tx => tx.method === filters.method);
    }
    
    // Calculate metrics
    const credits = filteredTxs.filter(tx => tx.type === 'credit');
    const debits = filteredTxs.filter(tx => tx.type === 'debit');
    
    const totalCredits = credits.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    const totalDebits = debits.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    const balance = totalCredits.minus(totalDebits);
    const avgTicket = filteredTxs.length > 0 ? 
      totalCredits.plus(totalDebits).dividedBy(filteredTxs.length) : 
      new Decimal(0);
    
    // Top counterparties
    const counterpartyMap = new Map<string, { amount: Decimal; count: number }>();
    filteredTxs.forEach(tx => {
      const key = tx.counterparty || 'Não informado';
      if (!counterpartyMap.has(key)) {
        counterpartyMap.set(key, { amount: new Decimal(0), count: 0 });
      }
      counterpartyMap.get(key)!.amount = counterpartyMap.get(key)!.amount.plus(tx.amount);
      counterpartyMap.get(key)!.count++;
    });
    
    const topCounterparties = Array.from(counterpartyMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount.toFixed(2),
        count: data.count
      }))
      .sort((a, b) => new Decimal(b.amount).minus(a.amount).toNumber())
      .slice(0, 10);
    
    // Period data for chart
    const periodMap = new Map<string, { credits: Decimal; debits: Decimal }>();
    filteredTxs.forEach(tx => {
      const date = new Date(tx.date).toISOString().split('T')[0];
      if (!periodMap.has(date)) {
        periodMap.set(date, { credits: new Decimal(0), debits: new Decimal(0) });
      }
      if (tx.type === 'credit') {
        periodMap.get(date)!.credits = periodMap.get(date)!.credits.plus(tx.amount);
      } else {
        periodMap.get(date)!.debits = periodMap.get(date)!.debits.plus(tx.amount);
      }
    });
    
    const periodData = Array.from(periodMap.entries())
      .map(([date, data]) => ({
        date,
        credits: data.credits.toNumber(),
        debits: data.debits.toNumber()
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Method distribution
    const methodMap = new Map<string, { amount: Decimal; count: number }>();
    filteredTxs.forEach(tx => {
      if (!methodMap.has(tx.method)) {
        methodMap.set(tx.method, { amount: new Decimal(0), count: 0 });
      }
      methodMap.get(tx.method)!.amount = methodMap.get(tx.method)!.amount.plus(tx.amount);
      methodMap.get(tx.method)!.count++;
    });
    
    const methodDistribution = Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        amount: data.amount.toNumber(),
        count: data.count
      }));
    
    return {
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      balance: balance.toFixed(2),
      avgTicket: avgTicket.toFixed(2),
      transactionCount: filteredTxs.length,
      topCounterparties,
      periodData,
      methodDistribution,
      timeHeatmap: [] // TODO: Implement time heatmap
    };
    
  } catch (error) {
    console.error('Error getting financial metrics:', error);
    throw error;
  }
};

// Get financial transactions
export const getFinancialTransactions = async (caseId: string, params: any = {}) => {
  try {
    const storageKey = `securai-rif-transactions-${caseId}`;
    const transactionsData = localStorage.getItem(storageKey);
    
    if (!transactionsData) {
      return { transactions: [], total: 0 };
    }
    
    let transactions: RIFTransaction[] = JSON.parse(transactionsData);
    
    // Apply filters
    if (params.minValue) {
      const minValue = new Decimal(params.minValue);
      transactions = transactions.filter(tx => new Decimal(tx.amount).greaterThanOrEqualTo(minValue));
    }
    
    if (params.method) {
      transactions = transactions.filter(tx => tx.method === params.method);
    }
    
    if (params.counterparty) {
      transactions = transactions.filter(tx => 
        tx.counterparty.toLowerCase().includes(params.counterparty.toLowerCase())
      );
    }
    
    // Sort
    if (params.sort) {
      const [field, direction] = params.sort.split(':');
      transactions.sort((a, b) => {
        let aVal, bVal;
        
        switch (field) {
          case 'date':
            aVal = new Date(a.date).getTime();
            bVal = new Date(b.date).getTime();
            break;
          case 'amount':
            aVal = new Decimal(a.amount).toNumber();
            bVal = new Decimal(b.amount).toNumber();
            break;
          default:
            aVal = (a as any)[field];
            bVal = (b as any)[field];
        }
        
        if (direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    // Pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paginatedTransactions = transactions.slice(start, start + pageSize);
    
    return {
      transactions: paginatedTransactions,
      total: transactions.length
    };
    
  } catch (error) {
    console.error('Error getting financial transactions:', error);
    throw error;
  }
};

// Get red flag alerts
export const getRedFlagAlerts = async (caseId: string): Promise<RedFlagAlert[]> => {
  try {
    const alertsKey = `securai-redflag-alerts-${caseId}`;
    const alertsData = localStorage.getItem(alertsKey);
    
    if (!alertsData) {
      return [];
    }
    
    return JSON.parse(alertsData);
    
  } catch (error) {
    console.error('Error getting red flag alerts:', error);
    return [];
  }
};

// Generate COAF report
export const generateCOAFReport = async (params: {
  caseId: string;
  filters: any;
  includeCharts: boolean;
}): Promise<string> => {
  const { caseId, filters, includeCharts } = params;
  
  try {
    // Get data
    const metrics = await getFinancialMetrics(caseId, filters);
    const alerts = await getRedFlagAlerts(caseId);
    const { transactions } = await getFinancialTransactions(caseId, { ...filters, pageSize: 1000 });
    
    // Generate insights using Groq
    const insights = await analyzeTextWithGroq(
      `Análise financeira RIF/COAF - Créditos: R$ ${metrics.totalCredits}, Débitos: R$ ${metrics.totalDebits}, Saldo: R$ ${metrics.balance}, Transações: ${metrics.transactionCount}, Alertas: ${alerts.length} (${alerts.filter(a => a.severity === 'high').length} críticos)`,
      'Gere um resumo executivo e recomendações para esta análise financeira COAF.'
    );
    
    // Create report content (simplified - in real app, use PDF library)
    const reportContent = `
RELATÓRIO DE ANÁLISE FINANCEIRA (RIF/COAF)
=========================================

IDENTIFICAÇÃO DO CASO
- Caso: ${caseId}
- Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
- Período Analisado: ${filters.timeRange || 'Todos os dados'}

RESUMO EXECUTIVO
- Total de Créditos: R$ ${metrics.totalCredits}
- Total de Débitos: R$ ${metrics.totalDebits}
- Saldo Líquido: R$ ${metrics.balance}
- Transações Analisadas: ${metrics.transactionCount}
- Alertas COAF Gerados: ${alerts.length}

METODOLOGIA
- Fonte dos Dados: Arquivos RIF fornecidos
- Regras Aplicadas: Fracionamento, Circularidade, Fan-in/Fan-out, Perfil Incompatível, Uso Intensivo de Espécie
- Conformidade: Lei 9.613/1998 e orientações COAF

RED FLAGS IDENTIFICADOS
${alerts.map(alert => `
- ${alert.type}: ${alert.description}
  Severidade: ${alert.severity}
  Evidências: ${alert.evidenceCount} transações
  Score: ${alert.score.toFixed(0)}/100
`).join('')}

INSIGHTS DA ANÁLISE
${insights.analysis || 'Análise não disponível'}

CONCLUSÕES E RECOMENDAÇÕES
${insights.recommendations || 'Recomendações não disponíveis'}

ANEXOS
- Lista detalhada de transações
- Gráficos de distribuição temporal e por método
- Detalhamento das evidências de red flags

---
Relatório gerado automaticamente pelo sistema Secur:AI
Conformidade: Lei 9.613/1998 e orientações COAF
`;
    
    return reportContent;
    
  } catch (error) {
    console.error('Error generating COAF report:', error);
    throw error;
  }
};

// Export financial data
export const exportFinancialData = async (params: {
  caseId: string;
  filters: any;
  format: 'csv' | 'xlsx';
}): Promise<string> => {
  const { caseId, filters, format } = params;
  
  try {
    const { transactions } = await getFinancialTransactions(caseId, { ...filters, pageSize: 10000 });
    
    if (format === 'csv') {
      const headers = [
        'Data', 'Descrição', 'Contraparte', 'Agência', 'Conta', 'Banco',
        'Valor', 'Tipo', 'Método', 'Documento Titular', 'Documento Contraparte'
      ];
      
      const csvContent = [
        headers.join(','),
        ...transactions.map(tx => [
          new Date(tx.date).toLocaleDateString('pt-BR'),
          `"${tx.description}"`,
          `"${tx.counterparty}"`,
          tx.agency,
          tx.account,
          tx.bank,
          tx.amount,
          tx.type === 'credit' ? 'Crédito' : 'Débito',
          tx.method,
          tx.holderDocument,
          tx.counterpartyDocument
        ].join(','))
      ].join('\n');
      
      return csvContent;
    }
    
    // For XLSX, return CSV for now (would need proper XLSX library)
    return 'XLSX export not implemented - use CSV format';
    
  } catch (error) {
    console.error('Error exporting financial data:', error);
    throw error;
  }
};