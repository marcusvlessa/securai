import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedRIFParser, StandardRIFRow } from './rifParserUnified';

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
    if (fileExtension === 'txt') {
      return parseRIFTextFile(file);
    } else if (fileExtension === 'csv') {
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

const parseRIFTextFile = async (file: File): Promise<Partial<RIFTransaction>[]> => {
  console.log('🔍 Parsing RIF text file:', file.name);
  
  const text = await file.text();
  const { RIFParser } = await import('./rifParser');
  
  try {
    const rifData = RIFParser.parseRIFText(text);
    const transactions: Partial<RIFTransaction>[] = [];
    
    // Converter créditos para transações
    rifData.creditos.forEach((credito, index) => {
      transactions.push({
        date: new Date().toISOString(),
        description: `Crédito de ${credito.contraparte}`,
        counterparty: credito.contraparte,
        agency: credito.agencia,
        account: credito.conta,
        bank: credito.banco,
        amount: credito.valor.toString(),
        type: 'credit' as const,
        method: 'PIX' as const,
        holderDocument: rifData.informacoesBasicas.cpf,
        counterpartyDocument: credito.documento
      });
    });
    
    // Converter débitos para transações
    rifData.debitos.forEach((debito, index) => {
      transactions.push({
        date: new Date().toISOString(),
        description: `Débito para ${debito.contraparte}`,
        counterparty: debito.contraparte,
        agency: debito.agencia,
        account: debito.conta,
        bank: debito.banco,
        amount: debito.valor.toString(),
        type: 'debit' as const,
        method: 'PIX' as const,
        holderDocument: rifData.informacoesBasicas.cpf,
        counterpartyDocument: debito.documento
      });
    });
    
    console.log(`✅ RIF parseado com sucesso: ${transactions.length} transações`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Erro ao parsear RIF:', error);
    throw new Error('Falha ao processar arquivo RIF: ' + error.message);
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
  console.log('🔍 Parsing Excel RIF file:', file.name);
  
  try {
    const { RIFExcelParser } = await import('./rifExcelParser');
    const rifData = await RIFExcelParser.parseExcelRIF(file);
    
    console.log('✅ RIF Excel parseado:', rifData.stats);
    
    // Converter entidades para transações
    const transactions: Partial<RIFTransaction>[] = [];
    
    rifData.entidades.forEach((entity, index) => {
      // Parse período para data
      let transactionDate = new Date().toISOString();
      if (entity.periodo) {
        const match = entity.periodo.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
        }
      }
      
      // Determinar tipo de transação
      let type: 'credit' | 'debit' = 'credit';
      if (entity.tipoRelacao.toUpperCase().includes('BENEFICIARIO')) {
        type = 'debit'; // Se o titular é beneficiário, é uma saída (débito)
      } else if (entity.tipoRelacao.toUpperCase().includes('REMETENTE')) {
        type = 'credit'; // Se o titular recebe, é uma entrada (crédito)
      }
      
      transactions.push({
        date: transactionDate,
        description: `${entity.tipoRelacao} - ${entity.remetenteNome} (Indexador ${entity.indexador})`,
        counterparty: entity.remetenteNome,
        agency: '',
        account: '',
        bank: '',
        amount: entity.valor.toString(),
        type: type,
        method: 'TED' as const, // Assumir TED como padrão
        holderDocument: entity.titularDocumento,
        counterpartyDocument: entity.remetenteDocumento
      });
    });
    
    console.log(`✅ Convertidas ${transactions.length} entidades em transações`);
    
    // Salvar relatório detalhado
    const detailedReport = RIFExcelParser.generateDetailedReport(rifData);
    console.log('📊 Relatório detalhado:', detailedReport);
    
    // Armazenar relatório no localStorage para posterior consulta
    const reportKey = `securai-rif-report-${rifData.rif}`;
    localStorage.setItem(reportKey, detailedReport);
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Erro ao processar Excel RIF:', error);
    throw new Error('Falha ao processar arquivo Excel RIF: ' + (error as Error).message);
  }
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
  console.log('🔍 Parsing PDF RIF file com OCR:', file.name);
  
  try {
    // Usar biblioteca pdf-parse existente
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extrair texto de todas as páginas
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('📄 Texto extraído do PDF:', fullText.substring(0, 500));
    
    // Tentar parsear como RIF de texto
    try {
      const { RIFParser } = await import('./rifParser');
      const rifData = RIFParser.parseRIFText(fullText);
      
      const transactions: Partial<RIFTransaction>[] = [];
      
      // Converter créditos
      rifData.creditos.forEach(credito => {
        transactions.push({
          date: new Date().toISOString(),
          description: `Crédito de ${credito.contraparte}`,
          counterparty: credito.contraparte,
          agency: credito.agencia,
          account: credito.conta,
          bank: credito.banco,
          amount: credito.valor.toString(),
          type: 'credit' as const,
          method: 'TED' as const,
          holderDocument: rifData.informacoesBasicas.cpf,
          counterpartyDocument: credito.documento
        });
      });
      
      // Converter débitos
      rifData.debitos.forEach(debito => {
        transactions.push({
          date: new Date().toISOString(),
          description: `Débito para ${debito.contraparte}`,
          counterparty: debito.contraparte,
          agency: debito.agencia,
          account: debito.conta,
          bank: debito.banco,
          amount: debito.valor.toString(),
          type: 'debit' as const,
          method: 'TED' as const,
          holderDocument: rifData.informacoesBasicas.cpf,
          counterpartyDocument: debito.documento
        });
      });
      
      console.log(`✅ PDF RIF parseado com sucesso: ${transactions.length} transações`);
      return transactions;
      
    } catch (parseError) {
      console.warn('⚠️ Não foi possível parsear como RIF estruturado, usando extração básica');
      
      // Fallback: extração básica de valores e documentos
      const transactions: Partial<RIFTransaction>[] = [];
      
      // Regex para encontrar valores monetários
      const valorRegex = /R\$\s*([\d.,]+)/g;
      const valores = [...fullText.matchAll(valorRegex)].map(m => m[1]);
      
      // Regex para encontrar CPF/CNPJ
      const docRegex = /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/g;
      const documentos = [...fullText.matchAll(docRegex)].map(m => m[1]);
      
      console.log(`📊 Extração básica: ${valores.length} valores, ${documentos.length} documentos`);
      
      // Criar transação genérica
      if (valores.length > 0) {
        transactions.push({
          date: new Date().toISOString(),
          description: 'Transação extraída de PDF',
          counterparty: 'A definir',
          agency: '',
          account: '',
          bank: '',
          amount: normalizeAmount(valores[0]),
          type: 'credit' as const,
          method: 'Outros' as const,
          holderDocument: documentos[0] ? normalizeDocument(documentos[0]) : '',
          counterpartyDocument: documentos[1] ? normalizeDocument(documentos[1]) : ''
        });
      }
      
      return transactions;
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    throw new Error('Falha ao processar arquivo PDF: ' + (error as Error).message);
  }
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
    console.log(`📤 Processando arquivo RIF: ${file.name} para caso: ${caseId}`);
    
    // Parse file
    const parsedTransactions = await parseRIFFile(file);
    console.log(`📊 ${parsedTransactions.length} transações parseadas do arquivo`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    // Validate and enrich transactions
    const enrichedTransactions = parsedTransactions
      .filter(t => t.date && t.amount)
      .map((t, index) => ({
        case_id: caseId,
        user_id: user.id,
        date: t.date || new Date().toISOString(),
        description: t.description || 'Transação sem descrição',
        counterparty: t.counterparty || 'Não informado',
        agency: t.agency || '',
        account: t.account || '',
        bank: t.bank || '',
        amount: parseFloat(t.amount || '0'),
        currency: 'BRL',
        type: t.type || 'debit',
        method: t.method || 'Outros',
        channel: 'Internet Banking',
        country: 'BR',
        holder_document: t.holderDocument || '',
        counterparty_document: t.counterpartyDocument || '',
        evidence_id: file.name
      }));
    
    console.log(`✅ ${enrichedTransactions.length} transações válidas preparadas para salvar`);
    
    // ✅ SOLUÇÃO: Limpar transações anteriores deste caso antes de inserir novas
    // Isso garante que cada upload crie uma nova análise ao invés de acumular
    console.log(`🗑️ Removendo transações anteriores do caso ${caseId}...`);
    const { error: deleteError } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('case_id', caseId);
    
    if (deleteError) {
      console.error('❌ Erro ao limpar transações antigas:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Transações antigas removidas. Inserindo novas transações...');
    
    // Save to Supabase in batches of 100
    const BATCH_SIZE = 100;
    let savedCount = 0;
    
    for (let i = 0; i < enrichedTransactions.length; i += BATCH_SIZE) {
      const batch = enrichedTransactions.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('financial_transactions')
        .insert(batch);
      
      if (error) {
        console.error('❌ Erro ao salvar lote de transações:', error);
        throw error;
      }
      
      savedCount += batch.length;
      console.log(`💾 Salvos ${savedCount}/${enrichedTransactions.length} registros...`);
    }
    
    // Calculate totals
    const totalValue = enrichedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`✅ ${savedCount} transações salvas com sucesso no Supabase`);
    
    // ✅ Limpar red flags anteriores deste caso antes de executar nova análise
    console.log(`🗑️ Removendo red flags anteriores do caso ${caseId}...`);
    const { error: deleteRedFlagsError } = await supabase
      .from('financial_red_flags')
      .delete()
      .eq('case_id', caseId);
    
    if (deleteRedFlagsError) {
      console.warn('⚠️ Aviso ao limpar red flags antigas:', deleteRedFlagsError);
      // Não bloqueia o fluxo se houver erro ao limpar red flags
    }
    
    toast.success(`✅ Nova análise criada: ${savedCount} transações. Total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    // Initialize red flag rules in localStorage for reference
    const rulesKey = `securai-redflag-rules-${caseId}`;
    if (!localStorage.getItem(rulesKey)) {
      localStorage.setItem(rulesKey, JSON.stringify(DEFAULT_RED_FLAG_RULES));
    }
    
    // Executar análise de red flags automaticamente
    console.log('🔍 Iniciando análise automática de red flags...');
    try {
      await runRedFlagAnalysis({
        caseId,
        thresholds: { fractionamento: 10000, especie: 50000 },
        window: 168
      });
      console.log('✅ Análise de red flags concluída');
    } catch (analysisError) {
      console.error('⚠️ Erro na análise automática de red flags:', analysisError);
      toast.error('⚠️ Upload concluído, mas houve erro na análise automática. Execute a análise manualmente.');
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
    console.log(`🔍 Iniciando análise de red flags para caso: ${caseId}`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    // Get transactions from Supabase
    const { data: transactionsData, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('case_id', caseId)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    if (!transactionsData || transactionsData.length === 0) {
      throw new Error('Nenhuma transação encontrada. Faça upload de dados RIF primeiro.');
    }
    
    console.log(`📊 ${transactionsData.length} transações carregadas para análise`);
    
    // Convert to RIFTransaction format
    const transactions: RIFTransaction[] = transactionsData.map(t => ({
      id: t.id,
      caseId: t.case_id,
      date: t.date,
      description: t.description || '',
      counterparty: t.counterparty || '',
      agency: t.agency || '',
      account: t.account || '',
      bank: t.bank || '',
      amount: t.amount.toString(),
      currency: t.currency || 'BRL',
      type: t.type as 'credit' | 'debit',
      method: t.method as RIFTransaction['method'],
      channel: t.channel || '',
      country: t.country || 'BR',
      holderDocument: t.holder_document || '',
      counterpartyDocument: t.counterparty_document || '',
      evidenceId: t.evidence_id || '',
      createdAt: t.created_at
    }));
    
    // Detectar tamanho do dataset e ajustar limiares
    const datasetSize = transactionsData.length;
    const isDynamicThreshold = datasetSize < 50;
    
    console.log(`🔍 Iniciando análise de red flags:`);
    console.log(`  📊 Transações: ${transactions.length}`);
    console.log(`  ⚙️ Limiares dinâmicos: ${isDynamicThreshold ? 'ATIVADOS' : 'PADRÃO'}`);
    
    // Ajustar limiares para datasets pequenos
    const adjustedThresholds = {
      fracionamento: isDynamicThreshold ? 5000 : 10000,
      especie: isDynamicThreshold ? 25000 : 50000,
      minTransactions: isDynamicThreshold ? 2 : 3
    };
    
    console.log(`  🎯 Limiares: fracionamento=R$ ${adjustedThresholds.fracionamento.toLocaleString('pt-BR')}, espécie=R$ ${adjustedThresholds.especie.toLocaleString('pt-BR')}`);
    
    const alerts: RedFlagAlert[] = [];
    
    // Get rules
    const rulesKey = `securai-redflag-rules-${caseId}`;
    const rulesData = localStorage.getItem(rulesKey);
    const rules: RedFlagRule[] = rulesData ? JSON.parse(rulesData) : DEFAULT_RED_FLAG_RULES;
    
    // Run fractionamento analysis
    const fractioningRule = rules.find(r => r.id === 'fracionamento' && r.enabled);
    if (fractioningRule) {
      const adjustedParams = { 
        ...fractioningRule.parameters, 
        threshold: adjustedThresholds.fracionamento,
        minTransactions: adjustedThresholds.minTransactions
      };
      const fractioningAlerts = detectFractionamento(transactions, adjustedParams, caseId);
      console.log(`  ✅ Fracionamento: ${fractioningAlerts.length} alertas`);
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
      const adjustedCashParams = { 
        ...cashRule.parameters, 
        threshold: adjustedThresholds.especie 
      };
      const cashAlerts = detectIntensiveCash(transactions, adjustedCashParams, caseId);
      console.log(`  ✅ Espécie Intensa: ${cashAlerts.length} alertas`);
      alerts.push(...cashAlerts);
    }
    
    // Run atypical values analysis (valores muito altos)
    const atypicalRule: RedFlagRule = {
      id: 'valor-atipico',
      name: 'Valor Atípico',
      description: 'Transações com valores excepcionalmente altos',
      enabled: true,
      severity: 'high',
      parameters: { threshold: 1000000 }
    };
    const atypicalAlerts = detectAtypicalValues(transactions, atypicalRule.parameters, caseId);
    console.log(`  ✅ Valores Atípicos: ${atypicalAlerts.length} alertas`);
    alerts.push(...atypicalAlerts);
    
    console.log(`✅ Gerados ${alerts.length} alertas de red flags`);
    
    // Delete existing alerts for this case
    await supabase
      .from('financial_red_flags')
      .delete()
      .eq('case_id', caseId);
    
    // Save new alerts to Supabase
    if (alerts.length > 0) {
      const alertsToInsert = alerts.map(alert => ({
        case_id: caseId,
        user_id: user.id,
        rule_id: alert.ruleId,
        type: alert.type,
        description: alert.description,
        severity: alert.severity,
        evidence_count: alert.evidenceCount,
        transaction_ids: alert.transactionIds,
        parameters: alert.parameters,
        score: parseFloat(alert.score.toFixed(2)),
        explanation: alert.explanation
      }));
      
      const { error: insertError } = await supabase
        .from('financial_red_flags')
        .insert(alertsToInsert);
      
      if (insertError) throw insertError;
      
      console.log(`💾 ${alerts.length} alertas salvos no Supabase`);
    }
    
    toast.success(`Análise concluída: ${alerts.length} red flags detectados`);
    
  } catch (error) {
    console.error('❌ Erro na análise de red flags:', error);
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

// Detect atypical values (valores muito altos)
const detectAtypicalValues = (transactions: RIFTransaction[], params: any, caseId: string): RedFlagAlert[] => {
  const alerts: RedFlagAlert[] = [];
  const threshold = params.threshold || 1000000;
  
  console.log(`🔍 Detectando valores atípicos (> R$ ${threshold.toLocaleString('pt-BR')})`);
  
  const highValueTxs = transactions.filter(tx => 
    new Decimal(tx.amount).greaterThan(threshold)
  );
  
  highValueTxs.forEach(tx => {
    const txAmount = new Decimal(tx.amount);
    alerts.push({
      id: `atipico-${tx.id}`,
      caseId,
      ruleId: 'valor-atipico',
      type: 'Valor Atípico',
      description: `Transação de valor excepcionalmente alto: R$ ${txAmount.toFixed(2)}`,
      severity: 'high',
      evidenceCount: 1,
      transactionIds: [tx.id],
      parameters: { amount: tx.amount, threshold },
      score: Math.min(100, txAmount.dividedBy(threshold).times(50).toNumber()),
      explanation: 'Valores muito acima da média podem indicar operações estruturadas ou lavagem de dinheiro',
      createdAt: new Date().toISOString()
    });
  });
  
  return alerts;
};

// Get financial metrics
export const getFinancialMetrics = async (caseId: string, filters: any = {}) => {
  try {
    console.log(`📊 Buscando métricas financeiras para caso: ${caseId}`);
    
    // Build query
    let query = supabase
      .from('financial_transactions')
      .select('*')
      .eq('case_id', caseId);
    
    // Apply filters (SOMENTE se explicitamente fornecidos e diferentes de 'all')
    if (filters.timeRange && filters.timeRange !== 'all' && filters.timeRange !== undefined) {
      const now = new Date();
      let days = 30;
      
      if (filters.timeRange === '7d') days = 7;
      else if (filters.timeRange === '30d') days = 30;
      else if (filters.timeRange === '90d') days = 90;
      else if (filters.timeRange === '1y') days = 365;
      
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('date', cutoffDate);
      console.log(`📅 Filtro de tempo aplicado: últimos ${days} dias`);
    } else {
      console.log('📅 Sem filtro de tempo - carregando todas as transações');
    }
    
    if (filters.minValue) {
      query = query.gte('amount', parseFloat(filters.minValue));
    }
    
    if (filters.method) {
      query = query.eq('method', filters.method);
    }
    
    const { data: transactionsData, error } = await query;
    
    if (error) throw error;
    
    if (!transactionsData || transactionsData.length === 0) {
      console.log('⚠️ Nenhuma transação encontrada');
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
    
    console.log(`✅ ${transactionsData.length} transações carregadas`);
    
    // Convert to RIFTransaction format for calculations
    const transactions: RIFTransaction[] = transactionsData.map(t => ({
      id: t.id,
      caseId: t.case_id,
      date: t.date,
      description: t.description || '',
      counterparty: t.counterparty || '',
      agency: t.agency || '',
      account: t.account || '',
      bank: t.bank || '',
      amount: t.amount.toString(),
      currency: t.currency || 'BRL',
      type: t.type as 'credit' | 'debit',
      method: t.method as RIFTransaction['method'],
      channel: t.channel || '',
      country: t.country || 'BR',
      holderDocument: t.holder_document || '',
      counterpartyDocument: t.counterparty_document || '',
      evidenceId: t.evidence_id || '',
      createdAt: t.created_at
    }));
    
    
    // Calculate metrics
    const credits = transactions.filter(tx => tx.type === 'credit');
    const debits = transactions.filter(tx => tx.type === 'debit');
    
    const totalCredits = credits.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    const totalDebits = debits.reduce((sum, tx) => sum.plus(tx.amount), new Decimal(0));
    const balance = totalCredits.minus(totalDebits);
    const avgTicket = transactions.length > 0 ? 
      totalCredits.plus(totalDebits).dividedBy(transactions.length) : 
      new Decimal(0);
    
    // Top counterparties
    const counterpartyMap = new Map<string, { amount: Decimal; count: number }>();
    transactions.forEach(tx => {
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
    transactions.forEach(tx => {
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
    transactions.forEach(tx => {
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
      transactionCount: transactions.length,
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
    console.log(`📋 Buscando transações financeiras para caso: ${caseId}`);
    
    // Build query
    let query = supabase
      .from('financial_transactions')
      .select('*', { count: 'exact' })
      .eq('case_id', caseId);
    
    // Apply filters
    if (params.minValue) {
      query = query.gte('amount', parseFloat(params.minValue));
    }
    
    if (params.method) {
      query = query.eq('method', params.method);
    }
    
    if (params.counterparty) {
      query = query.ilike('counterparty', `%${params.counterparty}%`);
    }
    
    // Sorting
    const sortField = params.sortField || 'date';
    const sortOrder = params.sortOrder === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });
    
    // Pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 100;
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, count, error } = await query;
    
    if (error) throw error;
    
    console.log(`✅ ${data?.length || 0} transações retornadas (total: ${count})`);
    
    return {
      transactions: data || [],
      total: count || 0
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar transações:', error);
    throw error;
  }
};
    

// Get red flag alerts
export const getRedFlagAlerts = async (caseId: string): Promise<RedFlagAlert[]> => {
  try {
    console.log(`🚨 Buscando alertas de red flags para caso: ${caseId}`);
    
    const { data, error } = await supabase
      .from('financial_red_flags')
      .select('*')
      .eq('case_id', caseId)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum alerta encontrado');
      return [];
    }
    
    console.log(`✅ ${data.length} alertas carregados`);
    
    // Convert to RedFlagAlert format
    return data.map(alert => ({
      id: alert.id,
      caseId: alert.case_id,
      ruleId: alert.rule_id,
      type: alert.type,
      description: alert.description,
      severity: alert.severity as 'low' | 'medium' | 'high',
      evidenceCount: alert.evidence_count,
      transactionIds: alert.transaction_ids || [],
      parameters: alert.parameters as Record<string, any>,
      score: parseFloat(alert.score.toString()),
      explanation: alert.explanation || '',
      createdAt: alert.created_at
    }));
    
  } catch (error) {
    console.error('❌ Erro ao buscar alertas:', error);
    throw error;
  }
};

/**
 * Gera relatório COAF com análise de IA real via Edge Function
 */
export const generateCOAFReport = async (params: {
  caseId: string;
  filters: any;
  includeCharts: boolean;
}): Promise<string> => {
  const { caseId, filters } = params;
  
  try {
    // Buscar dados
    const metrics = await getFinancialMetrics(caseId, filters);
    const alerts = await getRedFlagAlerts(caseId);
    const { transactions } = await getFinancialTransactions(caseId, { ...filters, pageSize: 100 });
    
    console.log('📄 Gerando relatório COAF com IA...');

    // Chamar Edge Function para análise com IA
    const { data: aiAnalysis, error } = await supabase.functions.invoke('analyze-rif', {
      body: { 
        caseId, 
        metrics, 
        alerts,
        transactions: transactions.slice(0, 50)
      }
    });

    if (error) {
      console.error('⚠️ Erro ao gerar insights com IA, usando fallback:', error);
    }

    const insights = aiAnalysis?.insights || `RESUMO EXECUTIVO:
    
Com base nos dados analisados, foram identificados ${alerts.length} alertas COAF, sendo ${alerts.filter(a => a.severity === 'high').length} de severidade alta.

O volume total de créditos foi de R$ ${metrics.totalCredits}, enquanto os débitos totalizaram R$ ${metrics.totalDebits}, resultando em um saldo líquido de R$ ${metrics.balance}.

RECOMENDAÇÕES:
- Priorizar investigação dos alertas de alta severidade
- Revisar manualmente as transações sinalizadas
- Documentar evidências para eventual comunicação ao COAF`;
    
    const reportContent = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                     RELATÓRIO FINANCEIRO COAF                             ║
║                     ${new Date().toLocaleString('pt-BR').padEnd(50)}          ║
╚═══════════════════════════════════════════════════════════════════════════╝

${insights}

═══════════════════════════════════════════════════════════════════════════
MÉTRICAS CONSOLIDADAS
═══════════════════════════════════════════════════════════════════════════
• Total de Créditos:        R$ ${metrics.totalCredits}
• Total de Débitos:         R$ ${metrics.totalDebits}
• Saldo Final:              R$ ${metrics.balance}
• Total de Transações:      ${metrics.transactionCount}
• Ticket Médio:             R$ ${metrics.avgTicket || 'N/A'}

═══════════════════════════════════════════════════════════════════════════
RED FLAGS IDENTIFICADOS (${alerts.length} alertas)
═══════════════════════════════════════════════════════════════════════════
${alerts.map((alert, i) => `
[${String(i + 1).padStart(2, '0')}] ${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}
     Descrição: ${alert.description}
     Score: ${alert.score}/100
     Transações: ${alert.transactionIds.length}
`).join('\n')}

═══════════════════════════════════════════════════════════════════════════
Relatório gerado automaticamente pelo Sistema de Análise Financeira
Modelo IA: ${aiAnalysis?.metadata?.model || 'Fallback Manual'}
Data/Hora: ${new Date().toLocaleString('pt-BR')}
═══════════════════════════════════════════════════════════════════════════

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

// Export financial data with real XLSX support
export const exportFinancialData = async (params: {
  caseId: string;
  filters: any;
  format: 'csv' | 'xlsx';
}): Promise<Blob> => {
  const { caseId, filters, format } = params;
  
  try {
    const { transactions } = await getFinancialTransactions(caseId, { ...filters, pageSize: 10000 });
    
    if (!transactions || transactions.length === 0) {
      throw new Error('Nenhuma transação encontrada para exportar');
    }

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      
      const data = transactions.map(tx => ({
        'Data': new Date(tx.date).toLocaleDateString('pt-BR'),
        'Descrição': tx.description || '',
        'Contraparte': tx.counterparty || '',
        'Valor': tx.amount,
        'Tipo': tx.type === 'credit' ? 'Crédito' : 'Débito',
        'Método': tx.method || '',
        'Banco': tx.bank || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transações');
      
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    
    if (format === 'csv') {
      const headers = [
        'Data', 'Descrição', 'Contraparte', 'Agência', 'Conta', 'Banco',
        'Valor', 'Tipo', 'Método', 'Documento Titular', 'Documento Contraparte'
      ];
      
      // Escape CSV values properly
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // If contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const csvContent = [
        headers.join(','),
        ...transactions.map(tx => [
          escapeCSV(new Date(tx.date).toLocaleDateString('pt-BR')),
          escapeCSV(tx.description || ''),
          escapeCSV(tx.counterparty || ''),
          escapeCSV(tx.agency || ''),
          escapeCSV(tx.account || ''),
          escapeCSV(tx.bank || ''),
          escapeCSV(tx.amount || 0),
          escapeCSV(tx.type === 'credit' ? 'Crédito' : 'Débito'),
          escapeCSV(tx.method || ''),
          escapeCSV(tx.holder_document || ''),
          escapeCSV(tx.counterparty_document || '')
        ].join(','))
      ].join('\n');
      
      // ✅ Converter string para Blob
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    throw new Error('Formato de exportação inválido');
    
  } catch (error) {
    console.error('Error exporting financial data:', error);
    throw error;
  }
};