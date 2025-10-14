import { supabase } from '@/integrations/supabase/client';
import { parse as parseCSV } from 'papaparse';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { toast } from 'sonner';

const DEFAULT_RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'fracionamento',
    label: 'Fracionamento',
    description: 'Múltiplas transações de pequeno valor para evitar detecção.',
    enabled: true,
    parameters: {
      threshold: 10000,
      minTransactions: 3,
      windowDays: 30,
    },
  },
  {
    id: 'circularidade',
    label: 'Circularidade',
    description: 'Transferências entre as mesmas contas em um curto período.',
    enabled: true,
    parameters: {
      minTransactions: 3,
      windowDays: 7,
    },
  },
  {
    id: 'fan-in-out',
    label: 'Fan-in/Fan-out',
    description: 'Muitas transações de entrada e saída para a mesma conta.',
    enabled: true,
    parameters: {
      minTransactionsIn: 5,
      minTransactionsOut: 5,
      windowDays: 30,
    },
  },
  {
    id: 'perfil-incompativel',
    label: 'Perfil Incompatível',
    description: 'Transações que não correspondem ao perfil do cliente.',
    enabled: true,
    parameters: {
      maxTransactionValue: 5000,
    },
  },
  {
    id: 'especie-intensa',
    label: 'Uso Intenso de Espécie',
    description: 'Saques ou depósitos em dinheiro acima do limite.',
    enabled: true,
    parameters: {
      threshold: 50000,
    },
  },
];

// Function to convert date from DD/MM/YYYY to YYYY-MM-DD
const formatDate = (dateString: string): string | null => {
  if (!dateString) return null;

  const [day, month, year] = dateString.split('/');
  if (!day || !month || !year) return null;

  return `${year}-${month}-${day}`;
};

// Function to standardize the amount format
const standardizeAmount = (amountString: string): string => {
  if (!amountString) return '0';

  // Remove dots used as thousands separators
  let cleanedAmount = amountString.replace(/\./g, '');

  // Replace comma with dot for decimal separation
  cleanedAmount = cleanedAmount.replace(/,/g, '.');

  // Remove any non-numeric characters except the decimal point
  cleanedAmount = cleanedAmount.replace(/[^0-9\.]/g, '');

  // Ensure there's only one decimal point
  const decimalParts = cleanedAmount.split('.');
  if (decimalParts.length > 2) {
    cleanedAmount = decimalParts[0] + '.' + decimalParts.slice(1).join('');
  }

  return cleanedAmount;
};

// Function to extract holder document from description
const extractHolderDocument = (description: string): string => {
  if (!description) {
    return '';
  }

  const regexCPF = /(\d{3}\.\d{3}\.\d{3}-\d{2})/;
  const matchCPF = description.match(regexCPF);

  if (matchCPF) {
    return matchCPF[0];
  }

  const regexCNPJ = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/;
  const matchCNPJ = description.match(regexCNPJ);

  if (matchCNPJ) {
    return matchCNPJ[0];
  }

  return '';
};

// Function to parse RIF text file
const parseRIFTextFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const transactions: Partial<RIFTransaction>[] = [];

        for (const line of lines) {
          if (line.trim() === '') continue;

          const columns = line.split(';');

          if (columns.length >= 8) {
            const transaction: Partial<RIFTransaction> = {
              date: formatDate(columns[0]),
              amount: standardizeAmount(columns[1]),
              type: columns[2],
              counterparty: columns[3],
              description: columns[4],
              method: columns[5],
              bank: columns[6],
              agency: columns[7],
              account: columns[8],
              channel: columns[9],
              country: columns[10],
              currency: columns[11],
              holderDocument: extractHolderDocument(columns[4] || ''),
            };

            transactions.push(transaction);
          }
        }

        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsText(file);
  });
};

// Function to parse CSV file
const parseCSVFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const csvText = event.target?.result as string;

      parseCSV(csvText, {
        header: false,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const transactions: Partial<RIFTransaction>[] = [];

          for (const row of results.data as string[][]) {
            if (row.length >= 8) {
              const transaction: Partial<RIFTransaction> = {
                date: formatDate(row[0]),
                amount: standardizeAmount(row[1]),
                type: row[2],
                counterparty: row[3],
                description: row[4],
                method: row[5],
                bank: row[6],
                agency: row[7],
                account: row[8],
                channel: row[9],
                country: row[10],
                currency: row[11],
                holderDocument: extractHolderDocument(row[4] || ''),
              };

              transactions.push(transaction);
            }
          }

          resolve(transactions);
        },
        error: (error) => {
          reject(error);
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo CSV'));
    };

    reader.readAsText(file);
  });
};

const parseExcelFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        const transactions: Partial<RIFTransaction>[] = [];

        for (const row of rows) {
          if (Array.isArray(row) && row.length >= 8) {
            const transaction: Partial<RIFTransaction> = {
              date: formatDate(row[0]),
              amount: standardizeAmount(row[1]),
              type: row[2],
              counterparty: row[3],
              description: row[4],
              method: row[5],
              bank: row[6],
              agency: row[7],
              account: row[8],
              channel: row[9],
              country: row[10],
              currency: row[11],
              holderDocument: extractHolderDocument(row[4] || ''),
            };

            transactions.push(transaction);
          }
        }

        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo Excel'));
    };

    reader.readAsArrayBuffer(file);
  });
};

const parseJSONFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const json = JSON.parse(jsonString);

        if (!Array.isArray(json)) {
          throw new Error('O arquivo JSON deve conter um array de transações');
        }

        const transactions: Partial<RIFTransaction>[] = json.map((item: any) => {
          return {
            date: item.date,
            amount: item.amount,
            type: item.type,
            counterparty: item.counterparty,
            description: item.description,
            method: item.method,
            bank: item.bank,
            agency: item.agency,
            account: item.account,
            channel: item.channel,
            country: item.country,
            currency: item.currency,
            holderDocument: item.holderDocument || extractHolderDocument(item.description || ''),
          };
        });

        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo JSON'));
    };

    reader.readAsText(file);
  });
};

const parsePDFFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  return new Promise((resolve, reject) => {
    reject(new Error('Leitura de arquivos PDF não implementada'));
  });
};

// Parse different file formats
const parseRIFFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  console.log(`🔍 parseRIFFile: Processando ${file.name} (${fileExtension})`);

  try {
    // ✅ CORREÇÃO 4: Usar UnifiedRIFParser quando possível
    if (['txt', 'csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      console.log('📦 Usando UnifiedRIFParser para parsing consistente');
      const { UnifiedRIFParser } = await import('./rifParserUnified');
      const standardRows = await UnifiedRIFParser.parse(file);

      console.log(`✅ UnifiedRIFParser processou ${standardRows.length} transações`);

      // Converter para formato RIFTransaction
      return standardRows.map(row => ({
        date: row.date.toISOString(),
        amount: row.amount.toString(),
        type: row.type,
        counterparty: row.counterparty || 'Desconhecido',
        counterpartyDocument: row.counterpartyDocument || '',
        holderDocument: row.holderDocument || '',
        description: row.description || '',
        method: (row.method as any) || 'TED',
        bank: row.bank || '',
        agency: row.agency || '',
        account: row.account || '',
        channel: row.channel || '',
        country: row.country || 'BR',
        currency: row.currency || 'BRL'
      }));
    }

    // Fallback para formatos não suportados pelo UnifiedRIFParser
    if (fileExtension === 'json') {
      return parseJSONFile(file);
    } else if (fileExtension === 'pdf') {
      return parsePDFFile(file);
    } else {
      throw new Error('Formato de arquivo não suportado');
    }
  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    throw error;
  }
};

// ✅ CORREÇÃO 2: Novos padrões de detecção COAF

/**
 * Detecta transações atípicas (valores muito altos)
 * Padrão COAF: Transações acima de R$ 1 milhão podem indicar atividades suspeitas
 */
const detectAtypicalTransactions = (transactions: RIFTransaction[], caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const threshold = 1000000; // R$ 1 milhão

  console.log(`🔍 Buscando transações atípicas (> R$ ${threshold.toLocaleString('pt-BR')})`);

  transactions.forEach(tx => {
    const amount = new Decimal(tx.amount);
    if (amount.greaterThan(threshold)) {
      alerts.push({
        id: `atipica-${tx.id}`,
        caseId,
        ruleId: 'transacao-atipica',
        type: 'Transação Atípica',
        description: `Transação de ${amount.toFixed(2)} significativamente acima do padrão`,
        severity: 'high',
        evidenceCount: 1,
        transactionIds: [tx.id],
        parameters: { amount: amount.toFixed(2), threshold },
        score: Math.min(100, (amount.toNumber() / threshold) * 50),
        explanation: 'Valores muito altos podem indicar movimentação suspeita de recursos ou lavagem de dinheiro',
        createdAt: new Date().toISOString()
      });
    }
  });

  console.log(`  Transações atípicas encontradas: ${alerts.length}`);
  return alerts;
};

/**
 * Detecta sequências de TEDs no mesmo dia
 * Padrão COAF: Múltiplas transferências no mesmo dia podem ser estruturação
 */
const detectTEDSequences = (transactions: RIFTransaction[], caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const minTEDs = 3;

  console.log(`🔍 Buscando sequências de TEDs (mín: ${minTEDs} no mesmo dia)`);

  // Agrupar por titular e dia
  const groupsByDay = new Map<string, RIFTransaction[]>();

  transactions.forEach(tx => {
    if (tx.method === 'TED') {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      const key = `${tx.holderDocument}-${dateKey}`;

      if (!groupsByDay.has(key)) {
        groupsByDay.set(key, []);
      }
      groupsByDay.get(key)!.push(tx);
    }
  });

  groupsByDay.forEach((txs, key) => {
    if (txs.length >= minTEDs) {
      const totalAmount = txs.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
      const [doc, date] = key.split('-');

      alerts.push({
        id: `ted-sequence-${key}`,
        caseId,
        ruleId: 'sequencia-ted',
        type: 'Sequência de TEDs',
        description: `${txs.length} TEDs no dia ${date} totalizando ${totalAmount.toFixed(2)}`,
        severity: 'medium',
        evidenceCount: txs.length,
        transactionIds: txs.map(tx => tx.id),
        parameters: { count: txs.length, date, totalAmount: totalAmount.toFixed(2) },
        score: Math.min(100, (txs.length / minTEDs) * 40),
        explanation: 'Múltiplas transferências no mesmo dia podem indicar estruturação para evitar controles',
        createdAt: new Date().toISOString()
      });
    }
  });

  console.log(`  Sequências TED encontradas: ${alerts.length}`);
  return alerts;
};

/**
 * Detecta valores "redondos" suspeitos
 * Padrão COAF: Valores exatos (100k, 500k) são incomuns em transações legítimas
 */
const detectRoundValues = (transactions: RIFTransaction[], caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const minAmount = 50000; // R$ 50k

  console.log(`🔍 Buscando valores redondos suspeitos (> R$ ${minAmount.toLocaleString('pt-BR')})`);

  // Valores redondos: 50k, 100k, 200k, 500k, 1M
  const roundValues = [50000, 100000, 200000, 500000, 1000000];

  transactions.forEach(tx => {
    const amount = new Decimal(tx.amount);

    if (amount.greaterThanOrEqualTo(minAmount)) {
      const amountNum = amount.toNumber();
      const isRound = roundValues.some(rv => Math.abs(amountNum - rv) < 0.01);

      if (isRound) {
        alerts.push({
          id: `valor-redondo-${tx.id}`,
          caseId,
          ruleId: 'valor-redondo',
          type: 'Valor Redondo Suspeito',
          description: `Transação de valor exato: ${amount.toFixed(2)}`,
          severity: 'low',
          evidenceCount: 1,
          transactionIds: [tx.id],
          parameters: { amount: amount.toFixed(2) },
          score: 30,
          explanation: 'Valores exatos e redondos são incomuns em transações comerciais legítimas',
          createdAt: new Date().toISOString()
        });
      }
    }
  });

  console.log(`  Valores redondos encontrados: ${alerts.length}`);
  return alerts;
};

// Run red flag analysis
export const runRedFlagAnalysis = async (params: {
  caseId: string;
  thresholds: Record<string, number>;
  window: number;
}): Promise<void> => {
  const { caseId, thresholds, window } = params;

  try {
    console.log(`🔍 Iniciando análise de red flags para caso: ${caseId}`);
    console.log(`⚙️ Parâmetros:`, { thresholds, window });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Get transactions from Supabase
    const { data: transactionsData, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('case_id', caseId)
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar transações:', error);
      throw error;
    }

    if (!transactionsData || transactionsData.length === 0) {
      console.warn('⚠️ Nenhuma transação encontrada');
      throw new Error('Nenhuma transação encontrada. Faça upload de dados RIF primeiro.');
    }

    console.log(`📊 ${transactionsData.length} transações carregadas para análise`);

    // ✅ CORREÇÃO 2: Ajustar limiares dinamicamente para datasets pequenos
    const datasetSize = transactionsData.length;
    const isSmallDataset = datasetSize < 50;

    if (isSmallDataset) {
      console.log(`📉 Dataset pequeno detectado (${datasetSize} transações) - ajustando limiares`);
    }
    const alerts: RedFlagAlert[] = [];

    // Get rules
    const rulesKey = `securai-redflag-rules-${caseId}`;
    const rulesData = localStorage.getItem(rulesKey);
    const rules: RedFlagRule[] = rulesData ? JSON.parse(rulesData) : DEFAULT_RED_FLAG_RULES;

    // ✅ CORREÇÃO 2: Ajustar parâmetros para datasets pequenos
    const adjustedRules = rules.map(rule => {
      if (!isSmallDataset) return rule;

      const adjusted = { ...rule };
      if (rule.id === 'fracionamento') {
        adjusted.parameters = {
          ...rule.parameters,
          threshold: Math.min(rule.parameters.threshold || 10000, 5000),
          minTransactions: Math.max(rule.parameters.minTransactions || 3, 2)
        };
        console.log(`🔧 Fracionamento ajustado:`, adjusted.parameters);
      }
      if (rule.id === 'especie-intensa') {
        adjusted.parameters = {
          ...rule.parameters,
          threshold: Math.min(rule.parameters.threshold || 50000, 25000)
        };
        console.log(`🔧 Espécie Intensa ajustado:`, adjusted.parameters);
      }
      return adjusted;
    });

    // Run fractionamento analysis
    const fractioningRule = adjustedRules.find(r => r.id === 'fracionamento' && r.enabled);
    if (fractioningRule) {
      console.log(`🔍 Executando detecção de Fracionamento...`);
      const fractioningAlerts = detectFractionamento(transactionsData, fractioningRule.parameters, caseId);
      console.log(`  ✅ ${fractioningAlerts.length} alertas de fracionamento`);
      alerts.push(...fractioningAlerts);
    }

    // Run circularidade analysis
    const circularityRule = adjustedRules.find(r => r.id === 'circularidade' && r.enabled);
    if (circularityRule) {
      console.log(`🔍 Executando detecção de Circularidade...`);
      const circularityAlerts = detectCircularidade(transactionsData, circularityRule.parameters, caseId);
      console.log(`  ✅ ${circularityAlerts.length} alertas de circularidade`);
      alerts.push(...circularityAlerts);
    }

    // Run fan-in/fan-out analysis
    const fanInOutRule = adjustedRules.find(r => r.id === 'fan-in-out' && r.enabled);
    if (fanInOutRule) {
      console.log(`🔍 Executando detecção de Fan-in/Fan-out...`);
      const fanInOutAlerts = detectFanInOut(transactionsData, fanInOutRule.parameters, caseId);
      console.log(`  ✅ ${fanInOutAlerts.length} alertas de fan-in/out`);
      alerts.push(...fanInOutAlerts);
    }

    // Run incompatible profile analysis
    const profileRule = adjustedRules.find(r => r.id === 'perfil-incompativel' && r.enabled);
    if (profileRule) {
      console.log(`🔍 Executando detecção de Perfil Incompatível...`);
      const profileAlerts = detectIncompatibleProfile(transactionsData, profileRule.parameters, caseId);
      console.log(`  ✅ ${profileAlerts.length} alertas de perfil incompatível`);
      alerts.push(...profileAlerts);
    }

    // Run intensive cash usage analysis
    const cashRule = adjustedRules.find(r => r.id === 'especie-intensa' && r.enabled);
    if (cashRule) {
      console.log(`🔍 Executando detecção de Uso Intensivo de Espécie...`);
      const cashAlerts = detectIntensiveCash(transactionsData, cashRule.parameters, caseId);
      console.log(`  ✅ ${cashAlerts.length} alertas de espécie intensa`);
      alerts.push(...cashAlerts);
    }

    // ✅ CORREÇÃO 2: Novos padrões COAF
    console.log(`🔍 Executando novos padrões COAF...`);

    // Detectar transações atípicas (valores > R$ 1 milhão)
    const atypicalAlerts = detectAtypicalTransactions(transactionsData, caseId);
    console.log(`  ✅ ${atypicalAlerts.length} alertas de transações atípicas`);
    alerts.push(...atypicalAlerts);

    // Detectar sequências de TEDs no mesmo dia
    const tedSequenceAlerts = detectTEDSequences(transactionsData, caseId);
    console.log(`  ✅ ${tedSequenceAlerts.length} alertas de sequências TED`);
    alerts.push(...tedSequenceAlerts);

    // Detectar valores redondos suspeitos
    const roundValuesAlerts = detectRoundValues(transactionsData, caseId);
    console.log(`  ✅ ${roundValuesAlerts.length} alertas de valores redondos`);
    alerts.push(...roundValuesAlerts);

    console.log(`✅ Total: ${alerts.length} alertas de red flags gerados`);

    // Save alerts to Supabase
    for (const alert of alerts) {
      const { error } = await supabase
        .from('red_flag_alerts')
        .insert([alert]);

      if (error) {
        console.error('Erro ao salvar alerta no Supabase:', alert, error);
      }
    }

    console.log(`💾 Alertas de red flags salvos no Supabase`);
  } catch (error) {
    console.error('❌ Erro na análise de red flags:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');

    // ✅ CORREÇÃO 2: Tratamento de erro mais robusto
    if (error instanceof Error) {
      throw new Error(`Falha na análise: ${error.message}`);
    }
    throw error;
  }
};
