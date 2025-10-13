// Web Worker para processamento de dados pesados em background
/// <reference lib="webworker" />

import * as XLSX from 'xlsx';

declare const self: DedicatedWorkerGlobalScope;

export interface WorkerMessage {
  type: 'parse-csv' | 'parse-excel' | 'parse-json' | 'generate-graph';
  payload: unknown;
  id: string;
}

export interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  data?: unknown;
  error?: string;
  progress?: number;
  id: string;
}

// Parse CSV
async function parseCSV(text: string): Promise<unknown> {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Arquivo CSV inválido');
  }

  // Detectar delimitador
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

  const headers = lines[0].split(bestDelimiter).map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(bestDelimiter);
    const row: Record<string, string | number> = {};

    headers.forEach((header, index) => {
      let value = values[index] || '';
      value = value.trim().replace(/"/g, '');

      if (!isNaN(Number(value)) && value !== '') {
        row[header] = Number(value);
      } else {
        row[header] = value;
      }
    });

    const nonEmptyValues = Object.values(row).filter(v => v !== '' && v !== null);
    if (nonEmptyValues.length >= 2) {
      data.push(row);
    }

    // Reportar progresso
    if (i % 100 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / lines.length) * 100,
        id: 'current'
      });
    }
  }

  return { data, columns: headers };
}

// Parse Excel
async function parseExcel(arrayBuffer: ArrayBuffer): Promise<unknown> {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('Planilha não encontrada');
  }

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) {
    throw new Error('Planilha inválida');
  }

  const headers = (jsonData[0] as unknown[]).map(h => String(h || '').trim()).filter(h => h);
  const data = [];

  for (let i = 1; i < jsonData.length; i++) {
    const rowData = jsonData[i] as unknown[];
    if (!rowData || rowData.length === 0) continue;

    const row: Record<string, string | number> = {};
    let hasValidData = false;

    headers.forEach((header, index) => {
      let value = rowData[index];

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

    if (hasValidData) {
      data.push(row);
    }

    // Reportar progresso
    if (i % 100 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / jsonData.length) * 100,
        id: 'current'
      });
    }
  }

  return { data, columns: headers };
}

// Parse JSON
async function parseJSON(text: string): Promise<unknown> {
  const jsonData = JSON.parse(text);

  let data: Record<string, unknown>[] = [];
  let columns: string[] = [];

  if (Array.isArray(jsonData)) {
    if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
      data = jsonData;
      columns = Object.keys(jsonData[0]);
    }
  } else if (typeof jsonData === 'object') {
    for (const value of Object.values(jsonData)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        data = value;
        columns = Object.keys(value[0]);
        break;
      }
    }
  }

  return { data, columns };
}

// Message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = e.data;

  try {
    let result;

    switch (type) {
      case 'parse-csv':
        result = await parseCSV(payload as string);
        break;
      case 'parse-excel':
        result = await parseExcel(payload as ArrayBuffer);
        break;
      case 'parse-json':
        result = await parseJSON(payload as string);
        break;
      default:
        throw new Error(`Tipo de operação não suportado: ${type}`);
    }

    self.postMessage({
      type: 'success',
      data: result,
      id
    } as WorkerResponse);

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      id
    } as WorkerResponse);
  }
};
