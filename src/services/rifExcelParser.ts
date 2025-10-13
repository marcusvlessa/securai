import * as XLSX from 'xlsx';
import { toast } from 'sonner';

/**
 * Parser especializado para arquivos Excel RIF do COAF
 * Baseado no formato real dos arquivos RIF124114_InformacoesAdicionais.xlsx
 */

export interface RIFExcelEntity {
  ordem: string;
  rif: string;
  indexador: string;
  remetenteDocumento: string;
  remetenteNome: string;
  tipoRelacao: string; // REMETENTE, BENEFICIARIO, etc
  valor: number;
  titularDocumento: string;
  titularNome: string;
  responsavelDocumento: string;
  responsavelNome: string;
  periodo: string;
  observacoes: string;
}

export interface RIFExcelData {
  rif: string;
  entidades: RIFExcelEntity[];
  titulares: Map<string, { documento: string; nome: string; totalEntradas: number; totalSaidas: number }>;
  indexadores: Map<string, RIFExcelEntity[]>;
  periodoCompleto: { inicio: Date | null; fim: Date | null };
  
  // Estatísticas
  stats: {
    totalEntidades: number;
    totalTitulares: number;
    totalIndexadores: number;
    valorTotalMovimentado: number;
    mediaTransacaoPorTitular: number;
  };
  
  // Alertas
  alertas: Array<{
    tipo: 'warning' | 'info' | 'danger';
    mensagem: string;
    entidades: RIFExcelEntity[];
  }>;
}

export class RIFExcelParser {
  
  /**
   * Parseia arquivo Excel RIF
   */
  static async parseExcelRIF(file: File): Promise<RIFExcelData> {
    console.log('🔍 Iniciando parsing de Excel RIF:', file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Assumir primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('Planilha não encontrada no arquivo');
      }
      
      // Converter para JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('📊 Dados brutos extraídos:', rawData.length, 'linhas');
      
      // Parse dos dados
      return this.processRawData(rawData);
      
    } catch (error) {
      console.error('❌ Erro ao parsear Excel RIF:', error);
      throw new Error(`Falha ao processar arquivo Excel RIF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
  
  /**
   * Processa dados brutos extraídos do Excel
   */
  private static processRawData(rawData: any[][]): RIFExcelData {
    if (rawData.length < 2) {
      throw new Error('Arquivo Excel vazio ou sem dados');
    }
    
    // Primeira linha é o cabeçalho
    const headers = rawData[0].map((h: any) => String(h || '').trim().toUpperCase());
    
    console.log('📋 Cabeçalhos detectados:', headers);
    
    // Mapear índices das colunas
    const columnMap = this.mapColumns(headers);
    
    // Processar entidades
    const entidades: RIFExcelEntity[] = [];
    let rifNumber = '';
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      if (!row || row.length === 0) continue;
      
      try {
        const entity = this.parseRow(row, columnMap);
        
        if (entity) {
          entidades.push(entity);
          
          // Capturar número do RIF
          if (entity.rif && !rifNumber) {
            rifNumber = entity.rif;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar linha ${i + 1}:`, error);
      }
    }
    
    console.log(`✅ ${entidades.length} entidades extraídas`);
    
    // Calcular estatísticas e agregações
    return this.calculateStatistics(rifNumber, entidades);
  }
  
  /**
   * Mapeia colunas do cabeçalho para índices
   */
  private static mapColumns(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    
    const columnPatterns = {
      ORDEM: ['ORDEM'],
      RIF: ['RIF'],
      INDEXADOR: ['INDEXADOR'],
      REMETENTE_DOC: ['REMETENTE/BENEFICIARIO CPF/CNPJ', 'REMETENTE/BENEFICIÁRIO CPF/CNPJ'],
      REMETENTE_NOME: ['REMETENTE/BENEFICIARIO NOME', 'REMETENTE/BENEFICIÁRIO NOME'],
      TIPO: ['REMETENTE OU BENEFICIARIO?', 'REMETENTE OU BENEFICIÁRIO?', 'TIPO'],
      VALOR: ['VALOR'],
      TITULAR_DOC: ['TITULAR CPF/CNPJ'],
      TITULAR_NOME: ['TITULAR NOME'],
      RESPONSAVEL_DOC: ['RESPONSÁVEL CPF/CNPJ', 'RESPONSAVEL CPF/CNPJ'],
      RESPONSAVEL_NOME: ['RESPONSÁVEL NOME', 'RESPONSAVEL NOME'],
      PERIODO: ['DATA/PERÍODO', 'DATA/PERIODO', 'PERÍODO', 'PERIODO'],
      OBSERVACOES: ['OBSERVAÇÕES', 'OBSERVACOES', 'OBS']
    };
    
    headers.forEach((header, index) => {
      for (const [key, patterns] of Object.entries(columnPatterns)) {
        if (patterns.some(pattern => header.includes(pattern))) {
          map.set(key, index);
          break;
        }
      }
    });
    
    console.log('🗺️ Mapeamento de colunas:', Object.fromEntries(map));
    
    return map;
  }
  
  /**
   * Parseia uma linha de dados
   */
  private static parseRow(row: any[], columnMap: Map<string, number>): RIFExcelEntity | null {
    const getValue = (key: string): string => {
      const index = columnMap.get(key);
      if (index === undefined || index >= row.length) return '';
      const value = row[index];
      return String(value || '').trim();
    };
    
    const remetenteDoc = getValue('REMETENTE_DOC');
    const remetenteNome = getValue('REMETENTE_NOME');
    
    // Pular linhas sem dados essenciais
    if (!remetenteDoc && !remetenteNome) {
      return null;
    }
    
    // Parse do valor
    const valorStr = getValue('VALOR');
    let valor = 0;
    
    if (valorStr && valorStr !== 'PREENCHER MANUALMENTE') {
      // Remover formatação e converter
      const cleaned = valorStr.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      valor = parseFloat(cleaned) || 0;
    }
    
    return {
      ordem: getValue('ORDEM'),
      rif: getValue('RIF'),
      indexador: getValue('INDEXADOR'),
      remetenteDocumento: this.normalizeDocument(remetenteDoc),
      remetenteNome: remetenteNome,
      tipoRelacao: getValue('TIPO'),
      valor: valor,
      titularDocumento: this.normalizeDocument(getValue('TITULAR_DOC')),
      titularNome: getValue('TITULAR_NOME'),
      responsavelDocumento: this.normalizeDocument(getValue('RESPONSAVEL_DOC')),
      responsavelNome: getValue('RESPONSAVEL_NOME'),
      periodo: getValue('PERIODO'),
      observacoes: getValue('OBSERVACOES')
    };
  }
  
  /**
   * Calcula estatísticas e agregações
   */
  private static calculateStatistics(rifNumber: string, entidades: RIFExcelEntity[]): RIFExcelData {
    const titulares = new Map<string, { documento: string; nome: string; totalEntradas: number; totalSaidas: number }>();
    const indexadores = new Map<string, RIFExcelEntity[]>();
    const alertas: Array<{ tipo: 'warning' | 'info' | 'danger'; mensagem: string; entidades: RIFExcelEntity[] }> = [];
    
    let valorTotalMovimentado = 0;
    let periodoInicio: Date | null = null;
    let periodoFim: Date | null = null;
    
    // Processar cada entidade
    entidades.forEach(entity => {
      // Agregar por titular
      const titularKey = entity.titularDocumento || entity.titularNome;
      if (titularKey) {
        if (!titulares.has(titularKey)) {
          titulares.set(titularKey, {
            documento: entity.titularDocumento,
            nome: entity.titularNome,
            totalEntradas: 0,
            totalSaidas: 0
          });
        }
        
        const titular = titulares.get(titularKey)!;
        
        if (entity.tipoRelacao.toUpperCase().includes('BENEFICIARIO')) {
          titular.totalSaidas += entity.valor;
        } else if (entity.tipoRelacao.toUpperCase().includes('REMETENTE')) {
          titular.totalEntradas += entity.valor;
        }
      }
      
      // Agregar por indexador
      if (entity.indexador) {
        if (!indexadores.has(entity.indexador)) {
          indexadores.set(entity.indexador, []);
        }
        indexadores.get(entity.indexador)!.push(entity);
      }
      
      // Somar valor total
      if (entity.valor > 0) {
        valorTotalMovimentado += entity.valor;
      }
      
      // Processar período
      if (entity.periodo) {
        const [inicioStr, fimStr] = entity.periodo.split(' a ').map(s => s.trim());
        
        const parseDate = (dateStr: string): Date | null => {
          const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [, day, month, year] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
          return null;
        };
        
        const inicio = parseDate(inicioStr);
        const fim = fimStr ? parseDate(fimStr) : inicio;
        
        if (inicio && (!periodoInicio || inicio < periodoInicio)) {
          periodoInicio = inicio;
        }
        
        if (fim && (!periodoFim || fim > periodoFim)) {
          periodoFim = fim;
        }
      }
    });
    
    // Identificar alertas
    
    // Alerta: Valores a preencher manualmente
    const semValor = entidades.filter(e => e.valor === 0 && e.tipoRelacao.includes('PREENCHER'));
    if (semValor.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensagem: `${semValor.length} entidade(s) precisam ter valores preenchidos manualmente`,
        entidades: semValor
      });
    }
    
    // Alerta: "Mesma titularidade"
    const mesmaTitularidade = entidades.filter(e => e.remetenteNome.toLowerCase().includes('mesma titularidade'));
    if (mesmaTitularidade.length > 0) {
      alertas.push({
        tipo: 'info',
        mensagem: `${mesmaTitularidade.length} transação(ões) de mesma titularidade detectadas`,
        entidades: mesmaTitularidade
      });
    }
    
    // Alerta: Sem CPF/CNPJ válido
    const semDocumento = entidades.filter(e => e.observacoes.includes('NÃO FOI DETECTADO NENHUM CPF/CNPJ VÁLIDO'));
    if (semDocumento.length > 0) {
      alertas.push({
        tipo: 'danger',
        mensagem: `${semDocumento.length} entidade(s) sem CPF/CNPJ válido`,
        entidades: semDocumento
      });
    }
    
    // Alerta: Valores altos
    const valoresAltos = entidades.filter(e => e.valor > 100000);
    if (valoresAltos.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensagem: `${valoresAltos.length} transação(ões) acima de R$ 100.000`,
        entidades: valoresAltos
      });
    }
    
    // Calcular estatísticas finais
    const mediaTransacaoPorTitular = titulares.size > 0 
      ? entidades.length / titulares.size 
      : 0;
    
    return {
      rif: rifNumber,
      entidades,
      titulares,
      indexadores,
      periodoCompleto: {
        inicio: periodoInicio,
        fim: periodoFim
      },
      stats: {
        totalEntidades: entidades.length,
        totalTitulares: titulares.size,
        totalIndexadores: indexadores.size,
        valorTotalMovimentado,
        mediaTransacaoPorTitular
      },
      alertas
    };
  }
  
  /**
   * Normaliza documento (CPF/CNPJ)
   */
  private static normalizeDocument(doc: string): string {
    if (!doc) return '';
    return doc.replace(/[^\d]/g, '');
  }
  
  /**
   * Gera relatório detalhado
   */
  static generateDetailedReport(rifData: RIFExcelData): string {
    const { rif, stats, titulares, indexadores, periodoCompleto, alertas } = rifData;
    
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };
    
    const formatDate = (date: Date | null) => {
      if (!date) return 'N/A';
      return date.toLocaleDateString('pt-BR');
    };
    
    let report = `
# RELATÓRIO DETALHADO - RIF ${rif}

## PERÍODO DE ANÁLISE
- **Início:** ${formatDate(periodoCompleto.inicio)}
- **Fim:** ${formatDate(periodoCompleto.fim)}

## ESTATÍSTICAS GERAIS
- **Total de Entidades:** ${stats.totalEntidades}
- **Total de Titulares:** ${stats.totalTitulares}
- **Total de Indexadores:** ${stats.totalIndexadores}
- **Valor Total Movimentado:** ${formatCurrency(stats.valorTotalMovimentado)}
- **Média de Transações por Titular:** ${stats.mediaTransacaoPorTitular.toFixed(2)}

## ANÁLISE POR TITULAR
`;
    
    Array.from(titulares.entries())
      .sort((a, b) => (b[1].totalEntradas + b[1].totalSaidas) - (a[1].totalEntradas + a[1].totalSaidas))
      .slice(0, 10)
      .forEach(([key, titular]) => {
        const saldo = titular.totalEntradas - titular.totalSaidas;
        report += `
### ${titular.nome} (${titular.documento || 'Sem documento'})
- **Total Entradas:** ${formatCurrency(titular.totalEntradas)}
- **Total Saídas:** ${formatCurrency(titular.totalSaidas)}
- **Saldo:** ${formatCurrency(saldo)}
`;
      });
    
    report += `
## ANÁLISE POR INDEXADOR
`;
    
    Array.from(indexadores.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([indexador, entidades]) => {
        const valorTotal = entidades.reduce((sum, e) => sum + e.valor, 0);
        report += `
### Indexador ${indexador}
- **Número de Entidades:** ${entidades.length}
- **Valor Total:** ${formatCurrency(valorTotal)}
`;
      });
    
    if (alertas.length > 0) {
      report += `
## ALERTAS E OBSERVAÇÕES
`;
      
      alertas.forEach(alerta => {
        const emoji = alerta.tipo === 'danger' ? '🔴' : alerta.tipo === 'warning' ? '🟡' : 'ℹ️';
        report += `
${emoji} **${alerta.mensagem}**
`;
      });
    }
    
    report += `

---
*Relatório gerado automaticamente pelo Sistema SecurAI em ${new Date().toLocaleString('pt-BR')}*
`;
    
    return report.trim();
  }
}
