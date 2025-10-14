import { parse as parseCSV } from 'papaparse';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { parse as parseDate, isValid } from 'date-fns';

/**
 * Interface padronizada para transações RIF
 * Todos os parsers devem converter para este formato
 */
export interface StandardRIFRow {
  date: Date;
  amount: Decimal;
  type: 'credit' | 'debit';
  counterparty: string;
  counterpartyDocument?: string;
  holderDocument?: string;
  description?: string;
  method?: string;
  bank?: string;
  agency?: string;
  account?: string;
  channel?: string;
  country?: string;
  currency?: string;
}

/**
 * Classe unificada para parsing de RIF
 * Garante consistência independente do formato de entrada
 */
export class UnifiedRIFParser {
  /**
   * Normaliza data para objeto Date válido
   */
  static normalizeDate(dateStr: string): Date {
    if (!dateStr) throw new Error('Data vazia');

    // Limpar string
    const cleaned = dateStr.trim();

    // Tentar formatos comuns brasileiros
    const formats = [
      'dd/MM/yyyy',
      'dd/MM/yyyy HH:mm:ss',
      'yyyy-MM-dd',
      'yyyy-MM-dd HH:mm:ss',
      'dd-MM-yyyy',
    ];

    for (const format of formats) {
      try {
        const parsed = parseDate(cleaned, format, new Date());
        if (isValid(parsed)) return parsed;
      } catch {
        continue;
      }
    }

    // Tentar parse nativo como fallback
    const nativeParsed = new Date(cleaned);
    if (isValid(nativeParsed)) return nativeParsed;

    throw new Error(`Data inválida: ${dateStr}`);
  }

  /**
   * Normaliza valor monetário para Decimal
   */
  static normalizeAmount(amountStr: string | number): Decimal {
    if (typeof amountStr === 'number') {
      return new Decimal(amountStr);
    }

    if (!amountStr) throw new Error('Valor vazio');

    // Limpar: remover R$, espaços, pontos de milhar
    let cleaned = String(amountStr)
      .trim()
      .replace(/R\$\s*/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, ''); // Remove pontos de milhar

    // Converter vírgula decimal para ponto
    cleaned = cleaned.replace(',', '.');

    // Remover caracteres não numéricos exceto ponto e sinal
    cleaned = cleaned.replace(/[^\d.-]/g, '');

    if (!cleaned || cleaned === '-') throw new Error(`Valor inválido: ${amountStr}`);

    try {
      const decimal = new Decimal(cleaned);
      if (decimal.isNaN()) throw new Error('NaN');
      return decimal.abs(); // Sempre positivo, o tipo define crédito/débito
    } catch (error) {
      throw new Error(`Erro ao converter valor "${amountStr}": ${error.message}`);
    }
  }

  /**
   * Normaliza tipo de transação
   */
  static normalizeType(typeStr: string): 'credit' | 'debit' {
    const cleaned = typeStr.trim().toLowerCase();
    
    if (/cr[eé]dito|entrada|recebimento|positivo|\+/i.test(cleaned)) {
      return 'credit';
    }
    
    if (/d[eé]bito|saida|sa[íi]da|pagamento|negativo|-/i.test(cleaned)) {
      return 'debit';
    }

    throw new Error(`Tipo de transação inválido: ${typeStr}`);
  }

  /**
   * Normaliza documento (CPF/CNPJ)
   */
  static normalizeDocument(doc: string): string {
    if (!doc) return '';
    return doc.replace(/[^\d]/g, '');
  }

  /**
   * Parse de arquivo TXT (RIF COAF padrão)
   */
  static async parseTXT(content: string): Promise<StandardRIFRow[]> {
    const lines = content.split('\n').filter(l => l.trim());
    const rows: StandardRIFRow[] = [];

    for (const line of lines) {
      try {
        // Formato esperado: DATA|TIPO|VALOR|CONTRAPARTE|...
        const parts = line.split('|').map(p => p.trim());
        
        if (parts.length < 4) continue;

        rows.push({
          date: this.normalizeDate(parts[0]),
          type: this.normalizeType(parts[1]),
          amount: this.normalizeAmount(parts[2]),
          counterparty: parts[3] || 'Desconhecido',
          counterpartyDocument: parts[4] ? this.normalizeDocument(parts[4]) : undefined,
          description: parts[5] || undefined,
          method: parts[6] || undefined,
        });
      } catch (error) {
        console.warn(`Ignorando linha inválida no TXT: ${error.message}`);
      }
    }

    return rows;
  }

  /**
   * Parse de arquivo CSV
   */
  static async parseCSV(content: string): Promise<StandardRIFRow[]> {
    return new Promise((resolve, reject) => {
      parseCSV(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows: StandardRIFRow[] = [];

            for (const row of results.data as any[]) {
              try {
                // Detectar colunas dinamicamente
                const dateKey = Object.keys(row).find(k => /data|date/i.test(k));
                const typeKey = Object.keys(row).find(k => /tipo|type|natureza/i.test(k));
                const amountKey = Object.keys(row).find(k => /valor|amount|quantia/i.test(k));
                const counterpartyKey = Object.keys(row).find(k => /contraparte|counterparty|benefici[aá]rio/i.test(k));

                if (!dateKey || !typeKey || !amountKey) {
                  console.warn('Linha sem campos obrigatórios, ignorando');
                  continue;
                }

                rows.push({
                  date: this.normalizeDate(row[dateKey]),
                  type: this.normalizeType(row[typeKey]),
                  amount: this.normalizeAmount(row[amountKey]),
                  counterparty: row[counterpartyKey] || 'Desconhecido',
                  counterpartyDocument: row['documento'] ? this.normalizeDocument(row['documento']) : undefined,
                  description: row['descricao'] || row['description'] || undefined,
                  method: row['metodo'] || row['method'] || undefined,
                });
              } catch (error) {
                console.warn(`Ignorando linha inválida no CSV: ${error.message}`);
              }
            }

            resolve(rows);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error),
      });
    });
  }

  /**
   * Parse de arquivo Excel
   */
  static async parseExcel(file: File): Promise<StandardRIFRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Pegar primeira planilha
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (rawData.length < 2) throw new Error('Planilha vazia ou sem dados');

    // Primeira linha = headers
    const headers = rawData[0].map(h => String(h).toLowerCase().trim());
    const rows: StandardRIFRow[] = [];

    // Detectar índices de colunas
    const dateIdx = headers.findIndex(h => /data|date/i.test(h));
    const typeIdx = headers.findIndex(h => /tipo|type|natureza/i.test(h));
    const amountIdx = headers.findIndex(h => /valor|amount|quantia/i.test(h));
    const counterpartyIdx = headers.findIndex(h => /contraparte|counterparty|benefici[aá]rio/i.test(h));

    if (dateIdx === -1 || typeIdx === -1 || amountIdx === -1) {
      throw new Error('Planilha não possui colunas obrigatórias (data, tipo, valor)');
    }

    // Processar linhas
    for (let i = 1; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        rows.push({
          date: this.normalizeDate(String(row[dateIdx])),
          type: this.normalizeType(String(row[typeIdx])),
          amount: this.normalizeAmount(row[amountIdx]),
          counterparty: counterpartyIdx !== -1 ? String(row[counterpartyIdx]) : 'Desconhecido',
        });
      } catch (error) {
        console.warn(`Ignorando linha ${i + 1} do Excel: ${error.message}`);
      }
    }

    return rows;
  }

  /**
   * Validação final do conjunto de dados
   */
  static validate(rows: StandardRIFRow[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (rows.length === 0) {
      errors.push('Nenhuma transação válida encontrada');
    }

    // Verificar datas futuras
    const now = new Date();
    const futureDates = rows.filter(r => r.date > now);
    if (futureDates.length > 0) {
      errors.push(`${futureDates.length} transações com datas futuras detectadas`);
    }

    // Verificar valores zerados
    const zeroAmounts = rows.filter(r => r.amount.isZero());
    if (zeroAmounts.length > 0) {
      errors.push(`${zeroAmounts.length} transações com valor zero detectadas`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Método principal unificado
   */
  static async parse(file: File): Promise<StandardRIFRow[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    let rows: StandardRIFRow[] = [];

    if (extension === 'txt') {
      const content = await file.text();
      rows = await this.parseTXT(content);
    } else if (extension === 'csv') {
      const content = await file.text();
      rows = await this.parseCSV(content);
    } else if (['xlsx', 'xls'].includes(extension || '')) {
      rows = await this.parseExcel(file);
    } else {
      throw new Error(`Formato de arquivo não suportado: ${extension}`);
    }

    // Validar resultado
    const validation = this.validate(rows);
    if (!validation.valid) {
      console.warn('Avisos de validação:', validation.errors);
      // Não lançar erro, apenas avisar
    }

    return rows;
  }
}