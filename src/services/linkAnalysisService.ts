import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { makeGroqAIRequest } from '@/services/groqService';

// Tipos para análise de vínculos
export interface LinkNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, string | number | boolean>;
  degree: number;
  centrality: number;
}

export interface LinkEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
  properties: Record<string, string | number | boolean>;
}

export interface LinkGraph {
  nodes: LinkNode[];
  edges: LinkEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: string[];
    edgeTypes: string[];
    density: number;
    averageDegree: number;
  };
}

export interface ParsedData {
  data: Record<string, string | number | boolean>[];
  columns: string[];
  preview: Record<string, string | number | boolean>[];
  totalRows: number;
  fileInfo: {
    name: string;
    type: string;
    size: number;
    lastModified: Date;
  };
}

// Parser robusto para diferentes tipos de arquivo
export class LinkAnalysisParser {
  
  // Parse CSV com detecção automática de delimitador
  static async parseCSV(file: File): Promise<ParsedData> {
    try {
      console.log('🔍 Iniciando parsing CSV:', file.name);

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('Arquivo CSV deve ter pelo menos cabeçalho e uma linha de dados');
      }

      // Detectar delimitador automaticamente
      const delimiters = [',', ';', '\t', '|'];
      let bestDelimiter = ',';
      let maxColumns = 0;

      for (const delimiter of delimiters) {
        const columns = lines[0].split(delimiter).length;
        if (columns > maxColumns) {
          maxColumns = columns;
          bestDelimiter = delimiter;
        }
      }

      console.log(`🔍 Delimitador detectado: "${bestDelimiter}" (${maxColumns} colunas)`);

      // Parse do cabeçalho
      const headers = lines[0].split(bestDelimiter).map(h => h.trim().replace(/"/g, ''));

      // Parse dos dados
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(bestDelimiter);
        const row: Record<string, string | number | boolean> = {};

        headers.forEach((header, index) => {
          let value = values[index] || '';
          value = value.trim().replace(/"/g, '');

          // Tentar converter para número se possível
          if (!isNaN(Number(value)) && value !== '') {
            row[header] = Number(value);
          } else {
            row[header] = value;
          }
        });

        // Só adicionar linha se tiver pelo menos 2 valores não vazios
        const nonEmptyValues = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined);
        if (nonEmptyValues.length >= 2) {
          data.push(row);
        }
      }

      const preview = data.slice(0, 5);

      console.log(`✅ CSV parseado com sucesso: ${data.length} linhas, ${headers.length} colunas`);
      console.log('📊 Cabeçalhos:', headers);
      console.log('📋 Preview dos dados:', preview);

      return {
        data,
        columns: headers,
        preview,
        totalRows: data.length,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified)
        }
      };

    } catch (error) {
      console.error('❌ Erro ao parsear CSV:', error);
      throw new Error(`Falha ao processar arquivo CSV: ${error.message}`);
    }
  }

  // Parse Excel
  static async parseExcel(file: File): Promise<ParsedData> {
    try {
      console.log('🔍 Iniciando parsing Excel:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Pegar a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('Planilha não encontrada');
      }
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Planilha deve ter pelo menos cabeçalho e uma linha de dados');
      }
      
      // Primeira linha como cabeçalho
      const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(h => h);
      
      // Dados das linhas seguintes
      const data = [];
      for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i] as any[];
        if (!rowData || rowData.length === 0) continue;
        
        const row: Record<string, string | number | boolean> = {};
        let hasValidData = false;
        
        headers.forEach((header, index) => {
          let value = rowData[index];
          
          // Converter valor
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'number') {
            row[header] = value;
            hasValidData = true;
          } else {
            const strValue = String(value).trim();
            row[header] = strValue;
            if (strValue) hasValidData = true;
          }
        });
        
        // Só adicionar se tiver pelo menos 2 valores válidos
        if (hasValidData && Object.values(row).filter(v => v !== '' && v !== null && v !== undefined).length >= 2) {
          data.push(row);
        }
      }
      
      const preview = data.slice(0, 5);

      console.log(`✅ Excel parseado com sucesso: ${data.length} linhas, ${headers.length} colunas`);
      console.log('📊 Cabeçalhos:', headers);
      console.log('📋 Preview dos dados:', preview);

      return {
        data,
        columns: headers,
        preview,
        totalRows: data.length,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified)
        }
      };

    } catch (error) {
      console.error('❌ Erro ao parsear Excel:', error);
      throw new Error(`Falha ao processar arquivo Excel: ${error.message}`);
    }
  }

  // Parse JSON
  static async parseJSON(file: File): Promise<ParsedData> {
    try {
      console.log('🔍 Iniciando parsing JSON:', file.name);
      
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      let data: Record<string, string | number | boolean>[] = [];
      let columns: string[] = [];
      
      // Se for um array de objetos
      if (Array.isArray(jsonData)) {
        if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
          data = jsonData;
          columns = Object.keys(jsonData[0]);
        } else {
          throw new Error('JSON deve conter um array de objetos');
        }
      }
      // Se for um objeto com propriedades
      else if (typeof jsonData === 'object') {
        // Tentar encontrar arrays de dados
        for (const [key, value] of Object.entries(jsonData)) {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            data = value;
            columns = Object.keys(value[0]);
            break;
          }
        }
        
        if (data.length === 0) {
          throw new Error('JSON deve conter dados tabulares (array de objetos)');
        }
      }
      
              // Filtrar linhas com pelo menos 2 valores válidos
        data = data.filter((row: Record<string, string | number | boolean>) => {
          const validValues = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined);
          return validValues.length >= 2;
        });
      
      const preview = data.slice(0, 5);

      console.log(`✅ JSON parseado com sucesso: ${data.length} linhas, ${columns.length} colunas`);
      console.log('📊 Colunas:', columns);
      console.log('📋 Preview dos dados:', preview);

      return {
        data,
        columns,
        preview,
        totalRows: data.length,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified)
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao parsear JSON:', error);
      throw new Error(`Falha ao processar arquivo JSON: ${error.message}`);
    }
  }
  
  // Parse TXT com detecção automática de formato
  static async parseTXT(file: File): Promise<ParsedData> {
    try {
      console.log('🔍 Iniciando parsing TXT:', file.name);
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Arquivo TXT deve ter pelo menos cabeçalho e uma linha de dados');
      }
      
      // Tentar detectar se é CSV com delimitador específico
      const firstLine = lines[0];
      const delimiters = [',', ';', '\t', '|'];
      
      for (const delimiter of delimiters) {
        if (firstLine.includes(delimiter)) {
          console.log(`🔍 Detectado formato CSV com delimitador: "${delimiter}"`);
          // Recriar arquivo temporário como CSV
          const csvBlob = new Blob([text], { type: 'text/csv' });
          const csvFile = new File([csvBlob], file.name.replace('.txt', '.csv'), { type: 'text/csv' });
          return this.parseCSV(csvFile);
        }
      }
      
      // Se não for CSV, tratar como dados separados por espaços
      const headers = firstLine.split(/\s+/).filter(h => h.trim());
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/\s+/).filter(v => v.trim());
        if (values.length >= headers.length) {
          const row: Record<string, string | number | boolean> = {};
          headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // Tentar converter para número
            if (!isNaN(Number(value)) && value !== '') {
              row[header] = Number(value);
            } else {
              row[header] = value;
            }
          });
          
          // Só adicionar se tiver pelo menos 2 valores válidos
          const validValues = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined);
          if (validValues.length >= 2) {
            data.push(row);
          }
        }
      }
      
      const preview = data.slice(0, 5);

      console.log(`✅ TXT parseado com sucesso: ${data.length} linhas, ${headers.length} colunas`);
      console.log('📊 Cabeçalhos:', headers);
      console.log('📋 Preview dos dados:', preview);

      return {
        data,
        columns: headers,
        preview,
        totalRows: data.length,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified)
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao parsear TXT:', error);
      throw new Error(`Falha ao processar arquivo TXT: ${error.message}`);
    }
  }
  
  // Parser principal que detecta o tipo de arquivo
  static async parseFile(file: File): Promise<ParsedData> {
    try {
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      
      console.log(`🔍 Processando arquivo: ${file.name} (${file.type || fileExtension})`);
      
      // CSV
      if (file.type === 'text/csv' || fileExtension === 'csv') {
        return await this.parseCSV(file);
      }
      
      // Excel
      else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               file.type === 'application/vnd.ms-excel' ||
               fileExtension === 'xlsx' || fileExtension === 'xls') {
        return await this.parseExcel(file);
      }
      
      // JSON
      else if (file.type === 'application/json' || fileExtension === 'json') {
        return await this.parseJSON(file);
      }
      
      // TXT
      else if (file.type === 'text/plain' || fileExtension === 'txt') {
        return await this.parseTXT(file);
      }
      
      else {
        throw new Error(`Formato de arquivo não suportado: ${file.type || fileExtension}. Use CSV, Excel, JSON ou TXT.`);
      }
      
    } catch (error) {
      console.error('❌ Erro no parsing do arquivo:', error);
      throw error;
    }
  }
}

// Gerador de grafos para análise de vínculos
export class LinkGraphGenerator {
  
  // Gerar grafo a partir de dados parseados
  static generateGraph(
    data: Record<string, string | number | boolean>[],
    sourceColumn: string,
    targetColumn: string,
    relationshipColumn?: string,
    weightColumn?: string
  ): LinkGraph {
    console.log('🔍 Gerando grafo de vínculos...');
    console.log('📊 Dados recebidos:', { data, sourceColumn, targetColumn, relationshipColumn, weightColumn });
    
    const nodes = new Map<string, LinkNode>();
    const edges: LinkEdge[] = [];
    const nodeTypes = new Set<string>();
    const edgeTypes = new Set<string>();
    
    let processedRows = 0;
    let ignoredRows = 0;
    
    // Processar cada linha de dados
    data.forEach((row, index) => {
      const source = String(row[sourceColumn] || '').trim();
      const target = String(row[targetColumn] || '').trim();
      const relationship = relationshipColumn ? String(row[relationshipColumn] || '').trim() : 'relacionamento';
      const weight = weightColumn ? row[weightColumn] : undefined;
      
      console.log(`🔍 Processando linha ${index + 1}:`, { source, target, relationship, weight });
      
      // Validação mais rigorosa dos dados
      if (!source || !target) {
        console.log(`⚠️ Linha ${index + 1} ignorada: origem ou destino vazio`, { source, target });
        ignoredRows++;
        return;
      }
      
      if (source === target) {
        console.log(`⚠️ Linha ${index + 1} ignorada: origem igual ao destino`, { source, target });
        ignoredRows++;
        return;
      }
      
      // Verificar se os valores são muito curtos ou muito longos
      if (source.length < 2 || target.length < 2) {
        console.log(`⚠️ Linha ${index + 1} ignorada: valores muito curtos`, { source, target });
        ignoredRows++;
        return;
      }
      
      if (source.length > 100 || target.length > 100) {
        console.log(`⚠️ Linha ${index + 1} ignorada: valores muito longos`, { source, target });
        ignoredRows++;
        return;
      }
      
      // Verificar se são valores placeholder ou inválidos
      const invalidValues = ['-', 'N/A', 'null', 'undefined', 'nan', 'none', '', ' ', '  '];
      if (invalidValues.includes(source.toLowerCase()) || invalidValues.includes(target.toLowerCase())) {
        console.log(`⚠️ Linha ${index + 1} ignorada: valor placeholder ou inválido`, { source, target });
        ignoredRows++;
        return;
      }
      
      // Se passou por todas as validações, processar a linha
      processedRows++;
      
      // Criar ou atualizar nós com detecção automática de tipo
      const sourceNode = this.addOrUpdateNode(nodes, source, nodeTypes);
      const targetNode = this.addOrUpdateNode(nodes, target, nodeTypes);
      
      // Criar aresta
      const edge: LinkEdge = {
        id: `edge-${source}-${target}-${index}`,
        source,
        target,
        label: relationship || 'relacionamento',
        type: relationship || 'relacionamento',
        weight: weight !== undefined ? Number(weight) : 1,
        properties: {
          weight: weight !== undefined ? Number(weight) : 1,
          source: source,
          target: target,
          relationship: relationship || 'relacionamento'
        }
      };
      
      edges.push(edge);
      edgeTypes.add(edge.type);
      
      // Atualizar graus dos nós
      if (sourceNode.degree !== undefined) sourceNode.degree++;
      if (targetNode.degree !== undefined) targetNode.degree++;
      
      console.log(`✅ Linha ${index + 1} processada:`, { source, target, relationship });
    });
    
    console.log(`📊 Resumo do processamento: ${processedRows} linhas processadas, ${ignoredRows} ignoradas`);
    
    // Calcular métricas do grafo
    const totalNodes = nodes.size;
    const totalEdges = edges.length;
    
    // Calcular densidade e grau médio
    let density = 0;
    let averageDegree = 0;
    
    if (totalNodes > 1) {
      const maxEdges = totalNodes * (totalNodes - 1);
      density = totalEdges / maxEdges;
      
      const totalDegree = Array.from(nodes.values()).reduce((sum, node) => sum + (node.degree || 0), 0);
      averageDegree = totalDegree / totalNodes;
    }
    
    // Calcular centralidade para cada nó
    const nodeArray = Array.from(nodes.values());
    nodeArray.forEach(node => {
      if (node.degree !== undefined) {
        node.centrality = node.degree / (totalNodes - 1);
      }
    });
    
    console.log('✅ Grafo gerado com sucesso:', { totalNodes, totalEdges, density, averageDegree });
    console.log('📊 Tipos de nós:', Array.from(nodeTypes));
    console.log('📊 Tipos de arestas:', Array.from(edgeTypes));
    
    return {
      nodes: nodeArray,
      edges,
      metadata: {
        totalNodes,
        totalEdges,
        density,
        averageDegree,
        nodeTypes: Array.from(nodeTypes),
        edgeTypes: Array.from(edgeTypes)
      }
    };
  }
  
  
  // Detectar tipo de entidade automaticamente
  private static detectEntityType(value: string): string {
    const normalized = value.replace(/[^\w@.-]/g, '');
    
    // CPF: 11 dígitos
    if (/^\d{11}$/.test(normalized)) {
      return 'cpf';
    }
    
    // CNPJ: 14 dígitos
    if (/^\d{14}$/.test(normalized)) {
      return 'cnpj';
    }
    
    // Telefone: 10-11 dígitos começando com DDD
    if (/^[1-9]\d{9,10}$/.test(normalized)) {
      return 'telefone';
    }
    
    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email';
    }
    
    // Placa de veículo
    if (/^[A-Z]{3}[\d][A-Z]\d{2}$/.test(normalized.toUpperCase()) || /^[A-Z]{3}\d{4}$/.test(normalized.toUpperCase())) {
      return 'placa';
    }
    
    // Endereço (contém palavras como rua, av, etc)
    if (/(rua|avenida|av|alameda|travessa|praça|estrada|rodovia|r\.|av\.|al\.|tr\.|pr\.|est\.|rod\.)/i.test(value)) {
      return 'endereco';
    }
    
    // Padrão: entidade genérica
    return 'entidade';
  }

  // Adicionar ou atualizar nó no Map
  private static addOrUpdateNode(
    nodes: Map<string, LinkNode>,
    nodeId: string,
    nodeTypes: Set<string>
  ): LinkNode {
    let node = nodes.get(nodeId);
    
    if (!node) {
      // Detectar tipo automaticamente
      const nodeType = this.detectEntityType(nodeId);
      
      node = {
        id: nodeId,
        label: nodeId,
        type: nodeType,
        properties: {},
        degree: 0,
        centrality: 0
      };
      
      nodes.set(nodeId, node);
      nodeTypes.add(nodeType);
    }
    
    return node;
  }
}

// Serviço principal de análise de vínculos
export class LinkAnalysisService {
  
  // Analisar arquivo e gerar grafo
  static async analyzeFile(file: File): Promise<{ parsedData: ParsedData; graph: LinkGraph }> {
    try {
      console.log('🚀 Iniciando análise de vínculos para:', file.name);
      
      // Parse do arquivo
      const parsedData = await LinkAnalysisParser.parseFile(file);
      
      // Validar dados
      if (parsedData.data.length === 0) {
        throw new Error('Arquivo não contém dados válidos');
      }
      
      if (parsedData.columns.length < 2) {
        throw new Error('Arquivo deve ter pelo menos 2 colunas para análise de vínculos');
      }
      
      console.log('📊 Dados parseados válidos:', {
        totalRows: parsedData.totalRows,
        columns: parsedData.columns,
        sampleData: parsedData.data.slice(0, 3)
      });
      
      // Detecção inteligente de colunas para análise de vínculos
      const { sourceColumn, targetColumn, relationshipColumn, weightColumn } = this.detectColumnsForAnalysis(parsedData.columns, parsedData.data);
      
      console.log('🔍 Colunas detectadas automaticamente:', {
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn
      });
      
      // Gerar grafo com colunas detectadas
      const graph = LinkGraphGenerator.generateGraph(
        parsedData.data,
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn
      );
      
      console.log('✅ Análise de vínculos concluída com sucesso');
      
      return { parsedData, graph };
      
    } catch (error) {
      console.error('❌ Erro na análise de vínculos:', error);
      throw error;
    }
  }
  
  // Detectar automaticamente colunas apropriadas para análise de vínculos
  private static detectColumnsForAnalysis(columns: string[], data: Record<string, string | number | boolean>[]): {
    sourceColumn: string;
    targetColumn: string;
    relationshipColumn?: string;
    weightColumn?: string;
  } {
    console.log('🔍 Detectando colunas para análise de vínculos...');
    console.log('📊 Colunas disponíveis:', columns);
    console.log('📊 Total de linhas de dados:', data.length);
    
    // Analisar o conteúdo real dos dados para identificar tipos de colunas
    const columnAnalysis = this.analyzeColumnContent(columns, data);
    console.log('🔍 Análise de conteúdo das colunas:', columnAnalysis);
    
    // Padrões expandidos para identificar tipos de colunas
    const cpfCnpjPatterns = /(cpf|cnpj|documento|identificacao|rif|id|codigo|numero|matricula)/i;
    const namePatterns = /(nome|beneficiario|remetente|titular|responsavel|pessoa|entidade|empresa|cliente|fornecedor|destinatario|emissor)/i;
    const valuePatterns = /(valor|montante|quantia|preco|custo|peso|forca|intensidade|frequencia|importancia|relevancia)/i;
    const relationshipPatterns = /(tipo|relacao|relacionamento|operacao|acao|vinculo|status|categoria|funcao|papel|atividade)/i;
    const datePatterns = /(data|periodo|data_periodo|data_periodo|hora|tempo|inicio|fim|duracao)/i;
    
    // Padrões específicos para o arquivo de exemplo
    const sourcePatterns = /(origem|source|from|de|pessoa|entidade|remetente|beneficiario|emissor|primeiro|inicio|partida)/i;
    const targetPatterns = /(destino|target|to|para|relacionado|conectado|nome|receptor|destinatario|segundo|fim|chegada)/i;
    
    let sourceColumn = '';
    let targetColumn = '';
    let relationshipColumn: string | undefined;
    let weightColumn: string | undefined;
    
    // Estratégia 1: Procurar por padrões específicos de origem/destino
    const sourceColumns = columns.filter(col => sourcePatterns.test(col));
    if (sourceColumns.length > 0) {
      sourceColumn = sourceColumns[0];
      console.log(`✅ Coluna de origem detectada (padrão específico): ${sourceColumn}`);
    }
    
    const targetColumns = columns.filter(col => targetPatterns.test(col));
    if (targetColumns.length > 0) {
      targetColumn = targetColumns[0];
      console.log(`✅ Coluna de destino detectada (padrão específico): ${targetColumn}`);
    }
    
    // Estratégia 2: Usar análise de conteúdo para identificar colunas
    if (!sourceColumn || !targetColumn) {
      const { sourceCol, targetCol } = this.selectColumnsByContent(columnAnalysis);
      if (!sourceColumn && sourceCol) {
        sourceColumn = sourceCol;
        console.log(`✅ Coluna de origem detectada (análise de conteúdo): ${sourceColumn}`);
      }
      if (!targetColumn && targetCol) {
        targetColumn = targetCol;
        console.log(`✅ Coluna de destino detectada (análise de conteúdo): ${targetColumn}`);
      }
    }
    
    // Estratégia 3: Procurar por CPF/CNPJ como origem (se não encontrou padrão específico)
    if (!sourceColumn) {
      const cpfCnpjColumns = columns.filter(col => cpfCnpjPatterns.test(col));
      if (cpfCnpjColumns.length > 0) {
        sourceColumn = cpfCnpjColumns[0];
        console.log(`✅ Coluna de origem detectada (CPF/CNPJ): ${sourceColumn}`);
      }
    }
    
    // Estratégia 4: Procurar por nomes como destino (se não encontrou padrão específico)
    if (!targetColumn) {
      const nameColumns = columns.filter(col => namePatterns.test(col));
      if (nameColumns.length > 0) {
        targetColumn = nameColumns[0];
        console.log(`✅ Coluna de destino detectada (Nome): ${targetColumn}`);
      }
    }
    
    // Estratégia 5: Busca por sinônimos e variações comuns
    if (!sourceColumn || !targetColumn) {
      const { sourceCol, targetCol } = this.findColumnsBySynonyms(columns, columnAnalysis);
      if (!sourceColumn && sourceCol) {
        sourceColumn = sourceCol;
        console.log(`✅ Coluna de origem detectada (sinônimos): ${sourceColumn}`);
      }
      if (!targetColumn && targetCol) {
        targetColumn = targetCol;
        console.log(`✅ Coluna de destino detectada (sinônimos): ${targetColumn}`);
      }
    }
    
    // Fallback: usar primeira e segunda coluna se não encontrou nada
    if (!sourceColumn) {
      sourceColumn = columns[0];
      console.log(`⚠️ Usando primeira coluna como origem: ${sourceColumn}`);
    }
    
    if (!targetColumn) {
      targetColumn = columns[1];
      console.log(`⚠️ Usando segunda coluna como destino: ${targetColumn}`);
    }
    
    // Procurar por coluna de relacionamento
    const relColumns = columns.filter(col => relationshipPatterns.test(col));
    if (relColumns.length > 0) {
      relationshipColumn = relColumns[0];
      console.log(`✅ Coluna de relacionamento detectada: ${relationshipColumn}`);
    }
    
    // Procurar por coluna de peso/valor
    const weightColumns = columns.filter(col => valuePatterns.test(col));
    if (weightColumns.length > 0) {
      weightColumn = weightColumns[0];
      console.log(`✅ Coluna de peso/valor detectada: ${weightColumn}`);
    }
    
    // Se não encontrou relacionamento, usar uma coluna padrão
    if (!relationshipColumn) {
      // Procurar por colunas que podem indicar tipo de operação
      const operationColumns = columns.filter(col => 
        /(remetente|beneficiario|tipo|status|observacoes|categoria|operacao|acao|funcao)/i.test(col)
      );
      if (operationColumns.length > 0) {
        relationshipColumn = operationColumns[0];
        console.log(`✅ Coluna de relacionamento alternativa detectada: ${relationshipColumn}`);
      }
    }
    
    // Se não encontrou peso, usar uma coluna numérica
    if (!weightColumn) {
      const numericColumns = columns.filter(col => {
        // Verificar se a coluna contém valores numéricos
        const sampleData = this.getSampleDataForColumn(col, data);
        return sampleData.some(val => !isNaN(Number(val)) && val !== '');
      });
      
      if (numericColumns.length > 0) {
        weightColumn = numericColumns[0];
        console.log(`✅ Coluna de peso alternativa detectada (numérica): ${weightColumn}`);
      }
    }
    
    console.log('📊 Configuração final de colunas:', {
      sourceColumn,
      targetColumn,
      relationshipColumn,
      weightColumn
    });
    
    return { sourceColumn, targetColumn, relationshipColumn, weightColumn };
  }
  
  // Buscar colunas por sinônimos e variações comuns
  private static findColumnsBySynonyms(columns: string[], columnAnalysis: Record<string, any>): {
    sourceCol?: string;
    targetCol?: string;
  } {
    let sourceCol: string | undefined;
    let targetCol: string | undefined;
    
    // Sinônimos para colunas de origem
    const sourceSynonyms = [
      'remetente', 'emissor', 'origem', 'primeiro', 'inicio', 'partida', 'de', 'from',
      'cliente', 'fornecedor', 'vendedor', 'comprador', 'pagador', 'recebedor',
      'pessoa1', 'entidade1', 'sujeito1', 'ator1', 'participante1'
    ];
    
    // Sinônimos para colunas de destino
    const targetSynonyms = [
      'destinatario', 'receptor', 'destino', 'segundo', 'fim', 'chegada', 'para', 'to',
      'beneficiario', 'recebedor', 'cliente', 'fornecedor', 'vendedor', 'comprador',
      'pessoa2', 'entidade2', 'sujeito2', 'ator2', 'participante2'
    ];
    
    // Buscar por sinônimos exatos
    for (const col of columns) {
      const colLower = col.toLowerCase();
      
      if (!sourceCol && sourceSynonyms.some(syn => colLower.includes(syn))) {
        sourceCol = col;
        console.log(`🔍 Coluna de origem encontrada por sinônimo: ${col}`);
      }
      
      if (!targetCol && targetSynonyms.some(syn => colLower.includes(syn))) {
        targetCol = col;
        console.log(`🔍 Coluna de destino encontrada por sinônimo: ${col}`);
      }
    }
    
    // Se ainda não encontrou, buscar por padrões mais flexíveis
    if (!sourceCol || !targetCol) {
      for (const col of columns) {
        const colLower = col.toLowerCase();
        
        // Buscar por padrões de identificação
        if (!sourceCol && (
          colLower.includes('id') || 
          colLower.includes('codigo') || 
          colLower.includes('numero') ||
          colLower.includes('matricula') ||
          colLower.includes('registro')
        )) {
          sourceCol = col;
          console.log(`🔍 Coluna de origem encontrada por padrão de ID: ${col}`);
        }
        
        // Buscar por padrões de nome/descrição
        if (!targetCol && (
          colLower.includes('nome') || 
          colLower.includes('descricao') || 
          colLower.includes('titulo') ||
          colLower.includes('rotulo') ||
          colLower.includes('identificacao')
        )) {
          targetCol = col;
          console.log(`🔍 Coluna de destino encontrada por padrão de nome: ${col}`);
        }
      }
    }
    
    return { sourceCol, targetCol };
  }
  
  // Analisar o conteúdo real das colunas para identificar tipos
  private static analyzeColumnContent(columns: string[], data: Record<string, string | number | boolean>[]): Record<string, any> {
    const analysis: Record<string, any> = {};
    
    columns.forEach(column => {
      const sampleData = this.getSampleDataForColumn(column, data);
      const nonEmptyData = sampleData.filter(val => val !== '' && val !== null && val !== undefined);
      
      if (nonEmptyData.length === 0) {
        analysis[column] = { type: 'empty', uniqueValues: 0, sampleValues: [] };
        return;
      }
      
      // Analisar tipos de dados
      const types = new Set(nonEmptyData.map(val => typeof val));
      const uniqueValues = new Set(nonEmptyData).size;
      const sampleValues = nonEmptyData.slice(0, 5);
      
      // Detectar padrões específicos
      let detectedType = 'unknown';
      let confidence = 0;
      
      // Verificar se é CPF/CNPJ
      const cpfCnpjCount = nonEmptyData.filter(val => 
        /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(String(val)) || 
        /^[A-Z]{2}\d{9}$/.test(String(val))
      ).length;
      if (cpfCnpjCount > 0) {
        detectedType = 'cpf_cnpj';
        confidence = cpfCnpjCount / nonEmptyData.length;
      }
      
      // Verificar se é telefone
      const phoneCount = nonEmptyData.filter(val => 
        /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(String(val))
      ).length;
      if (phoneCount > 0 && phoneCount / nonEmptyData.length > 0.3) {
        detectedType = 'phone';
        confidence = phoneCount / nonEmptyData.length;
      }
      
      // Verificar se é email
      const emailCount = nonEmptyData.filter(val => 
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(val))
      ).length;
      if (emailCount > 0 && emailCount / nonEmptyData.length > 0.3) {
        detectedType = 'email';
        confidence = emailCount / nonEmptyData.length;
      }
      
      // Verificar se é numérico
      const numericCount = nonEmptyData.filter(val => !isNaN(Number(val))).length;
      if (numericCount / nonEmptyData.length > 0.7) {
        detectedType = 'numeric';
        confidence = numericCount / nonEmptyData.length;
      }
      
      // Verificar se é texto (nomes, endereços, etc.)
      const textCount = nonEmptyData.filter(val => 
        typeof val === 'string' && val.length > 2 && val.length < 100
      ).length;
      if (textCount / nonEmptyData.length > 0.7 && detectedType === 'unknown') {
        detectedType = 'text';
        confidence = textCount / nonEmptyData.length;
      }
      
      analysis[column] = {
        type: detectedType,
        confidence,
        uniqueValues,
        sampleValues,
        totalValues: nonEmptyData.length,
        types: Array.from(types)
      };
    });
    
    return analysis;
  }
  
  // Selecionar colunas baseado na análise de conteúdo
  private static selectColumnsByContent(columnAnalysis: Record<string, any>): {
    sourceCol?: string;
    targetCol?: string;
  } {
    let sourceCol: string | undefined;
    let targetCol: string | undefined;
    
    // Prioridade para origem: CPF/CNPJ, telefone, email, ou coluna com muitos valores únicos
    const sourceCandidates = Object.entries(columnAnalysis)
      .filter(([col, analysis]) => 
        analysis.type === 'cpf_cnpj' || 
        analysis.type === 'phone' || 
        analysis.type === 'email' ||
        (analysis.type === 'text' && analysis.uniqueValues > 10)
      )
      .sort((a, b) => (b[1].confidence || 0) - (a[1].confidence || 0));
    
    if (sourceCandidates.length > 0) {
      sourceCol = sourceCandidates[0][0];
    }
    
    // Prioridade para destino: texto (nomes, endereços) ou coluna com valores únicos
    const targetCandidates = Object.entries(columnAnalysis)
      .filter(([col, analysis]) => 
        analysis.type === 'text' || 
        (analysis.uniqueValues > 5 && analysis.type !== 'numeric')
      )
      .sort((a, b) => (b[1].uniqueValues || 0) - (a[1].uniqueValues || 0));
    
    if (targetCandidates.length > 0) {
      // Evitar usar a mesma coluna para origem e destino
      const availableTargets = targetCandidates.filter(([col]) => col !== sourceCol);
      if (availableTargets.length > 0) {
        targetCol = availableTargets[0][0];
      } else {
        targetCol = targetCandidates[0][0];
      }
    }
    
    return { sourceCol, targetCol };
  }
  
  // Obter dados de exemplo para uma coluna específica
  private static getSampleDataForColumn(columnName: string, data: Record<string, string | number | boolean>[]): any[] {
    try {
      // Pegar até 50 valores da coluna para análise mais precisa
      const sampleSize = Math.min(50, data.length);
      const sampleData = [];
      
      // Pegar valores distribuídos ao longo do arquivo (não só os primeiros)
      const step = Math.max(1, Math.floor(data.length / sampleSize));
      
      for (let i = 0; i < sampleSize && i * step < data.length; i++) {
        const index = i * step;
        if (data[index] && data[index][columnName] !== undefined) {
          sampleData.push(data[index][columnName]);
        }
      }
      
      // Se não conseguiu pegar dados suficientes, pegar os primeiros
      if (sampleData.length < 10) {
        for (let i = 0; i < Math.min(20, data.length); i++) {
          if (data[i] && data[i][columnName] !== undefined) {
            sampleData.push(data[i][columnName]);
          }
        }
      }
      
      return sampleData;
    } catch (error) {
      console.warn(`⚠️ Erro ao obter dados de exemplo para coluna ${columnName}:`, error);
      return [];
    }
  }
  
  // Gerar grafo com mapeamento personalizado
  static generateCustomGraph(
    parsedData: ParsedData,
    sourceColumn: string,
    targetColumn: string,
    relationshipColumn?: string,
    weightColumn?: string
  ): LinkGraph {
    try {
      console.log('🔍 Gerando grafo personalizado...');
      console.log('📊 Configuração:', {
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn,
        totalRows: parsedData.totalRows,
        columns: parsedData.columns
      });
      
      // Validar colunas
      if (!parsedData.columns.includes(sourceColumn)) {
        throw new Error(`Coluna de origem "${sourceColumn}" não encontrada`);
      }
      
      if (!parsedData.columns.includes(targetColumn)) {
        throw new Error(`Coluna de destino "${targetColumn}" não encontrada`);
      }
      
      if (relationshipColumn && !parsedData.columns.includes(relationshipColumn)) {
        throw new Error(`Coluna de relacionamento "${relationshipColumn}" não encontrada`);
      }
      
      if (weightColumn && !parsedData.columns.includes(weightColumn)) {
        throw new Error(`Coluna de peso "${weightColumn}" não encontrada`);
      }
      
      // Gerar grafo
      const graph = LinkGraphGenerator.generateGraph(
        parsedData.data,
        sourceColumn,
        targetColumn,
        relationshipColumn,
        weightColumn
      );
      
      console.log('✅ Grafo personalizado gerado com sucesso');
      
      return graph;
      
    } catch (error) {
      console.error('❌ Erro ao gerar grafo personalizado:', error);
      throw error;
    }
  }
  
  // Analisar grafo com IA (GROQ)
  static async analyzeGraphWithAI(graph: LinkGraph): Promise<string> {
    try {
      console.log('🤖 Iniciando análise de IA do grafo...');

      // Preparar dados para análise
      const analysisData = {
        totalNodes: graph.metadata.totalNodes,
        totalEdges: graph.metadata.totalEdges,
        nodeTypes: graph.metadata.nodeTypes,
        edgeTypes: graph.metadata.edgeTypes,
        density: graph.metadata.density,
        averageDegree: graph.metadata.averageDegree,
        topNodes: graph.nodes
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 10)
          .map(n => ({ id: n.id, type: n.type, degree: n.degree })),
        sampleEdges: graph.edges.slice(0, 20).map(e => ({
          source: e.source,
          target: e.target,
          type: e.type,
          weight: e.weight
        }))
      };

      // Criar prompt para IA
      const prompt = `Analise o seguinte grafo de vínculos e forneça insights investigativos:

**Métricas do Grafo:**
- Total de entidades: ${analysisData.totalNodes}
- Total de relacionamentos: ${analysisData.totalEdges}
- Densidade: ${analysisData.density.toFixed(3)}
- Grau médio: ${analysisData.averageDegree.toFixed(2)}

**Tipos de Entidades:** ${analysisData.nodeTypes.join(', ')}
**Tipos de Relacionamentos:** ${analysisData.edgeTypes.join(', ')}

**Top 10 Entidades por Conectividade:**
${analysisData.topNodes.map(n => `- ${n.id} (${n.type}): ${n.degree} conexões`).join('\n')}

**Amostra de Relacionamentos:**
${analysisData.sampleEdges.map(e => `- ${e.source} → ${e.target} [${e.type}] (peso: ${e.weight})`).join('\n')}

**Análise Investigativa:**
Identifique padrões suspeitos, clusters de interesse, entidades centrais, possíveis intermediários e anomalias que merecem investigação adicional.`;

      // Usar o serviço GROQ diretamente
      try {
        console.log('📡 Enviando dados para análise GROQ...');
        
        // Formatar mensagem no formato correto para a API GROQ
        const messages = [
          {
            role: 'system',
            content: 'Você é um analista especializado em investigação criminal e análise de vínculos. Analise os dados fornecidos e forneça insights investigativos detalhados.'
          },
          {
            role: 'user',
            content: prompt
          }
        ];
        
        const response = await makeGroqAIRequest(
          messages,
          2048
        );
        
        console.log('✅ Resposta da GROQ recebida:', response);
        
        // Formatar a resposta da IA
        const aiAnalysis = `🤖 **ANÁLISE DE IA - GROQ LLAMA 4 SCOUT 17B**

**INSIGHTS INVESTIGATIVOS:**

${response}

**Dados Analisados:**
- **Total de Entidades:** ${analysisData.totalNodes}
- **Total de Relacionamentos:** ${analysisData.totalEdges}
- **Densidade do Grafo:** ${analysisData.density.toFixed(3)}
- **Grau Médio:** ${analysisData.averageDegree.toFixed(2)}

**Tipos de Entidades Identificadas:** ${analysisData.nodeTypes.join(', ')}
**Tipos de Relacionamentos:** ${analysisData.edgeTypes.join(', ')}

**Análise Realizada em:** ${new Date().toLocaleString('pt-BR')}`;

        return aiAnalysis;
        
      } catch (groqError) {
        console.warn('⚠️ Erro na API GROQ, usando análise simulada:', groqError);
        
        // Fallback para análise simulada
        const aiAnalysis = `🤖 **ANÁLISE DE IA - GRAFO DE VÍNCULOS**

**INSIGHTS INVESTIGATIVOS:**

🔍 **Padrões Identificados:**
- O grafo possui ${analysisData.totalNodes} entidades com ${analysisData.totalEdges} relacionamentos
- Densidade de ${analysisData.density.toFixed(3)} indica ${analysisData.density > 0.1 ? 'alta' : 'baixa'} conectividade
- Grau médio de ${analysisData.averageDegree.toFixed(2)} sugere ${analysisData.averageDegree > 5 ? 'forte' : 'moderada'} interação

🎯 **Entidades de Alto Interesse:**
${analysisData.topNodes.slice(0, 5).map(n => `- **${n.id}** (${n.type}): ${n.degree} conexões - Investigar profundamente`).join('\n')}

⚠️ **Anomalias Detectadas:**
- Entidades com grau muito alto podem ser intermediários ou hubs
- Padrões de relacionamento repetitivos sugerem operações sistemáticas
- Clusters isolados podem indicar grupos independentes

📊 **Recomendações Investigativas:**
1. Focar nas entidades com maior grau de conectividade
2. Analisar padrões temporais nos relacionamentos
3. Investigar entidades com tipos específicos (CPF, Placa, etc.)
4. Mapear caminhos entre entidades de interesse
5. Identificar possíveis intermediários ou facilitadores

**Próximos Passos:**
- Aprofundar análise das entidades centrais
- Correlacionar com dados temporais
- Expandir investigação para entidades secundárias
- Gerar relatório detalhado para autoridades

**Nota:** Esta é uma análise simulada devido a erro na API GROQ: ${groqError instanceof Error ? groqError.message : 'Erro desconhecido'}`;

        return aiAnalysis;
      }

    } catch (error) {
      console.error('❌ Erro na análise de IA:', error);
      throw new Error(`Falha na análise de IA: ${error.message}`);
    }
  }
}
