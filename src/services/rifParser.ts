import { toast } from 'sonner';

// Interface para dados do RIF
export interface RIFData {
  comunicacao: string;
  id: string;
  rif: string;
  indexador: string;
  titular: string;
  comunicante: string;
  segmento: string;
  periodo: string;
  envolvidos: RIFEntity[];
  informacoesBasicas: {
    nome: string;
    cpf: string;
    idade: number;
    estadoCivil: string;
    endereco: string;
    categorias: string[];
    rendaInformada?: string;
    rendaPresumida?: string;
    exposicaoPolitica: string;
    midiaNegativa: string;
    fatorGerador: string;
  };
  creditos: RIFTransaction[];
  debitos: RIFTransaction[];
  resumo: {
    totalCreditos: number;
    totalDebitos: number;
    volumeCreditos: number;
    volumeDebitos: number;
    saldoFinal: number;
    periodoAnalise: string;
  };
  alertas: RIFAlert[];
}

export interface RIFEntity {
  documento: string;
  nome: string;
  tipo: 'CPF' | 'CNPJ';
  papel: 'Beneficiário' | 'Remetente' | 'Titular';
  informacoes?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    endereco?: string;
    idade?: number;
    rendaPresumida?: string;
    profissao?: string;
    midiaNegativa?: string;
    pep?: string;
    fraudeConfirmada?: string;
    alertasPLD?: string;
  };
}

export interface RIFTransaction {
  contraparte: string;
  documento: string;
  valor: number;
  percentual: number;
  transacoes: number;
  banco: string;
  agencia: string;
  conta: string;
  informacoes?: string;
}

export interface RIFAlert {
  tipo: 'red_flag' | 'warning' | 'info';
  descricao: string;
  detalhes: string;
  relevancia: 'alta' | 'media' | 'baixa';
}

/**
 * Parser especializado para arquivos RIF do COAF
 */
export class RIFParser {
  
  /**
   * Analisa o texto RIF e extrai dados estruturados
   */
  static parseRIFText(rifText: string): RIFData {
    console.log('🔍 Iniciando parsing do RIF...');
    
    try {
      const lines = rifText.split('\n').map(line => line.trim()).filter(line => line);
      
      // Extrair cabeçalho
      const header = this.parseHeader(lines);
      
      // Extrair seções
      const sections = this.extractSections(lines);
      
      // Extrair envolvidos
      const envolvidos = this.parseEnvolvidos(sections.envolvidos || []);
      
      // Extrair informações básicas
      const informacoesBasicas = this.parseInformacoesBasicas(sections.informacoesBasicas || []);
      
      // Extrair transações
      const creditos = this.parseTransacoes(sections.creditos || [], 'credito');
      const debitos = this.parseTransacoes(sections.debitos || [], 'debito');
      
      // Calcular resumo
      const resumo = this.calculateResumo(creditos, debitos, header.periodo);
      
      // Identificar alertas
      const alertas = this.identifyAlerts(creditos, debitos, informacoesBasicas);
      
      const rifData: RIFData = {
        comunicacao: header.comunicacao,
        id: header.id,
        rif: header.rif,
        indexador: header.indexador,
        titular: header.titular,
        comunicante: header.comunicante,
        segmento: header.segmento,
        periodo: header.periodo,
        envolvidos,
        informacoesBasicas,
        creditos,
        debitos,
        resumo,
        alertas
      };
      
      console.log('✅ RIF parseado com sucesso:', rifData);
      return rifData;
      
    } catch (error) {
      console.error('❌ Erro ao parsear RIF:', error);
      throw new Error(`Falha ao processar RIF: ${error.message}`);
    }
  }
  
  /**
   * Extrai informações do cabeçalho
   */
  private static parseHeader(lines: string[]) {
    const header = {
      comunicacao: '',
      id: '',
      rif: '',
      indexador: '',
      titular: '',
      comunicante: '',
      segmento: '',
      periodo: ''
    };
    
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];
      
      if (line.startsWith('COMUNICAÇÃO')) {
        header.comunicacao = line.replace('COMUNICAÇÃO', '').trim();
      } else if (line.startsWith('ID')) {
        header.id = line.replace('ID', '').trim();
      } else if (line.startsWith('RIF:')) {
        header.rif = line.replace('RIF:', '').trim();
      } else if (line.startsWith('INDEXADOR:')) {
        header.indexador = line.replace('INDEXADOR:', '').trim();
      } else if (line.startsWith('Titular(es):')) {
        header.titular = line.replace('Titular(es):', '').trim();
      } else if (line.startsWith('Comunicante:')) {
        header.comunicante = line.replace('Comunicante:', '').trim();
      } else if (line.startsWith('Segmento:')) {
        header.segmento = line.replace('Segmento:', '').trim();
      } else if (line.startsWith('Período:')) {
        header.periodo = line.replace('Período:', '').trim();
      }
    }
    
    return header;
  }
  
  /**
   * Extrai seções do RIF
   */
  private static extractSections(lines: string[]) {
    const sections: Record<string, string[]> = {};
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('ENVOLVIDOS:')) {
        currentSection = 'envolvidos';
        sections[currentSection] = [];
      } else if (line.startsWith('Informações básicas de cadastro')) {
        currentSection = 'informacoesBasicas';
        sections[currentSection] = [];
      } else if (line.startsWith('CRÉDITOS:')) {
        currentSection = 'creditos';
        sections[currentSection] = [];
      } else if (line.startsWith('DÉBITOS:')) {
        currentSection = 'debitos';
        sections[currentSection] = [];
      } else if (line.startsWith('OUTRAS CONTRAPARTES DE CREDITO:')) {
        currentSection = 'creditosOutros';
        sections[currentSection] = [];
      } else if (line.startsWith('OUTRAS CONTRAPARTES DE DÉBITO:')) {
        currentSection = 'debitosOutros';
        sections[currentSection] = [];
      } else if (currentSection && line.trim()) {
        sections[currentSection].push(line);
      }
    }
    
    return sections;
  }
  
  /**
   * Parse dos envolvidos
   */
  private static parseEnvolvidos(lines: string[]): RIFEntity[] {
    const envolvidos: RIFEntity[] = [];
    
    for (const line of lines) {
      const match = line.match(/^([\d./-]+)\s*-\s*(.+?)\s*-\s*(Beneficiário|Remetente|Titular)$/);
      if (match) {
        const [, documento, nome, papel] = match;
        
        const entity: RIFEntity = {
          documento: this.normalizeDocument(documento),
          nome: nome.trim(),
          tipo: this.isValidCPF(documento) ? 'CPF' : 'CNPJ',
          papel: papel as any
        };
        
        envolvidos.push(entity);
      }
    }
    
    return envolvidos;
  }
  
  /**
   * Parse das informações básicas
   */
  private static parseInformacoesBasicas(lines: string[]) {
    const info = {
      nome: '',
      cpf: '',
      idade: 0,
      estadoCivil: '',
      endereco: '',
      categorias: [] as string[],
      rendaInformada: '',
      rendaPresumida: '',
      exposicaoPolitica: '',
      midiaNegativa: '',
      fatorGerador: ''
    };
    
    const fullText = lines.join(' ');
    
    // Extrair informações usando regex
    const nomeMatch = fullText.match(/(\w+\s+\w+\s+\w+),\s*CPF\s*([\d./-]+)/);
    if (nomeMatch) {
      info.nome = nomeMatch[1];
      info.cpf = this.normalizeDocument(nomeMatch[2]);
    }
    
    const idadeMatch = fullText.match(/idade\s*(\d+)\s*anos/);
    if (idadeMatch) {
      info.idade = parseInt(idadeMatch[1]);
    }
    
    const enderecoMatch = fullText.match(/endereço cadastrado:\s*([^,]+,\s*[^,]+\s*-\s*[^,]+\s*-\s*[A-Z]{2})/);
    if (enderecoMatch) {
      info.endereco = enderecoMatch[1];
    }
    
    const rendaInformadaMatch = fullText.match(/Renda informada pelo cliente:\s*R\$\s*([\d.,]+)/);
    if (rendaInformadaMatch) {
      info.rendaInformada = rendaInformadaMatch[1];
    }
    
    const rendaPresumidaMatch = fullText.match(/Renda presumida:\s*R\$\s*([\d.,]+)/);
    if (rendaPresumidaMatch) {
      info.rendaPresumida = rendaPresumidaMatch[1];
    }
    
    return info;
  }
  
  /**
   * Parse das transações (créditos e débitos)
   */
  private static parseTransacoes(lines: string[], tipo: 'credito' | 'debito'): RIFTransaction[] {
    const transacoes: RIFTransaction[] = [];
    
    for (const line of lines) {
      // Regex melhorada para capturar transações no formato do COAF
      const match = line.match(/^\s*-\s*([\d.,]+)%\s*\(R\$\s*([\d.,]+)\s*em\s*(\d+)\s*transaç[õo]*es?\)\s*(?:via|para)\s*(?:CPF|CNPJ)\s*([\d./-]+)\s*\(([^)]+)\)/);
      
      if (match) {
        const [, percentual, valor, transacoesCount, documento, nome] = match;
        
        // Extrair informações bancárias se existirem
        const bancoMatch = line.match(/banco\s*(\d+)\s*(?:-\s*([^,]+))?,\s*agência\s*(?:número\s*)?(\d+)\s*e\s*conta\s*(?:número\s*)?([\d-]+)/i);
        
        const transacao: RIFTransaction = {
          contraparte: nome.trim(),
          documento: this.normalizeDocument(documento),
          valor: this.parseValue(valor),
          percentual: parseFloat(percentual.replace(',', '.')),
          transacoes: parseInt(transacoesCount),
          banco: bancoMatch ? bancoMatch[1] : '',
          agencia: bancoMatch ? bancoMatch[3] : '',
          conta: bancoMatch ? bancoMatch[4] : '',
          informacoes: line
        };
        
        transacoes.push(transacao);
      }
    }
    
    return transacoes;
  }
  
  /**
   * Calcula resumo das transações
   */
  private static calculateResumo(creditos: RIFTransaction[], debitos: RIFTransaction[], periodo: string) {
    const totalCreditos = creditos.length;
    const totalDebitos = debitos.length;
    const volumeCreditos = creditos.reduce((sum, t) => sum + t.valor, 0);
    const volumeDebitos = debitos.reduce((sum, t) => sum + t.valor, 0);
    const saldoFinal = volumeCreditos - volumeDebitos;
    
    return {
      totalCreditos,
      totalDebitos,
      volumeCreditos,
      volumeDebitos,
      saldoFinal,
      periodoAnalise: periodo
    };
  }
  
  /**
   * Identifica alertas baseado nas transações
   */
  private static identifyAlerts(creditos: RIFTransaction[], debitos: RIFTransaction[], info: any): RIFAlert[] {
    const alertas: RIFAlert[] = [];
    
    // Alerta para volume alto
    const totalVolume = creditos.reduce((sum, t) => sum + t.valor, 0) + debitos.reduce((sum, t) => sum + t.valor, 0);
    if (totalVolume > 100000) {
      alertas.push({
        tipo: 'red_flag',
        descricao: 'Volume financeiro elevado',
        detalhes: `Volume total movimentado: R$ ${totalVolume.toLocaleString('pt-BR')}`,
        relevancia: 'alta'
      });
    }
    
    // Alerta para muitas contrapartes
    const totalContrapartes = new Set([...creditos.map(c => c.documento), ...debitos.map(d => d.documento)]).size;
    if (totalContrapartes > 20) {
      alertas.push({
        tipo: 'warning',
        descricao: 'Número elevado de contrapartes',
        detalhes: `Total de ${totalContrapartes} contrapartes distintas`,
        relevancia: 'media'
      });
    }
    
    // Alerta para fracionamento
    const pequenasTransacoes = [...creditos, ...debitos].filter(t => t.valor < 10000);
    if (pequenasTransacoes.length > 10) {
      alertas.push({
        tipo: 'red_flag',
        descricao: 'Possível fracionamento',
        detalhes: `${pequenasTransacoes.length} transações abaixo de R$ 10.000`,
        relevancia: 'alta'
      });
    }
    
    return alertas;
  }
  
  /**
   * Normaliza documento removendo caracteres especiais
   */
  private static normalizeDocument(doc: string): string {
    return doc.replace(/[^\d]/g, '');
  }
  
  /**
   * Valida se é CPF válido (formato)
   */
  private static isValidCPF(doc: string): boolean {
    const cleaned = this.normalizeDocument(doc);
    return cleaned.length === 11;
  }
  
  /**
   * Parse de valores monetários
   */
  private static parseValue(valueStr: string): number {
    if (!valueStr) return 0;
    
    // Remove R$ e espaços, substitui vírgulas por pontos
    const cleaned = valueStr
      .replace(/R\$\s*/, '')
      .replace(/\./g, '') // Remove pontos de milhar
      .replace(',', '.'); // Troca vírgula decimal por ponto
    
    return parseFloat(cleaned) || 0;
  }
  
  /**
   * Gera relatório de análise do RIF
   */
  static generateAnalysisReport(rifData: RIFData): string {
    const report = `
# RELATÓRIO DE ANÁLISE RIF - ${rifData.rif}

## DADOS BÁSICOS
- **Comunicação:** ${rifData.comunicacao}
- **ID:** ${rifData.id}
- **Titular:** ${rifData.titular}
- **Comunicante:** ${rifData.comunicante}
- **Período:** ${rifData.periodo}

## RESUMO FINANCEIRO
- **Volume Créditos:** R$ ${rifData.resumo.volumeCreditos.toLocaleString('pt-BR')}
- **Volume Débitos:** R$ ${rifData.resumo.volumeDebitos.toLocaleString('pt-BR')}
- **Saldo Líquido:** R$ ${rifData.resumo.saldoFinal.toLocaleString('pt-BR')}
- **Total Transações:** ${rifData.resumo.totalCreditos + rifData.resumo.totalDebitos}

## ALERTAS IDENTIFICADOS
${rifData.alertas.map(alerta => `- **${alerta.descricao}:** ${alerta.detalhes} (${alerta.relevancia})`).join('\n')}

## PRINCIPAIS CONTRAPARTES
### Créditos
${rifData.creditos.slice(0, 5).map(c => `- ${c.contraparte}: R$ ${c.valor.toLocaleString('pt-BR')} (${c.percentual}%)`).join('\n')}

### Débitos
${rifData.debitos.slice(0, 5).map(d => `- ${d.contraparte}: R$ ${d.valor.toLocaleString('pt-BR')} (${d.percentual}%)`).join('\n')}

## METODOLOGIA
Esta análise foi realizada utilizando parser especializado para dados RIF do COAF, extraindo automaticamente:
- Informações básicas do titular
- Transações de crédito e débito
- Rede de contrapartes
- Padrões de movimentação
- Indicadores de risco (red flags)

---
*Relatório gerado automaticamente pelo Sistema SecurAI*
`;
    
    return report.trim();
  }
}