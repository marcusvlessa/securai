import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet,
  Database,
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any[];
  columns?: string[];
  preview?: any[];
  error?: string;
  uploadedAt: Date;
  processedAt?: Date;
}

interface ColumnMapping {
  [key: string]: string;
}

interface LinkAnalysisUploaderProps {
  onDataUploaded: (data: any[], mapping: ColumnMapping, dataType: string) => void;
}

const LinkAnalysisUploader: React.FC<LinkAnalysisUploaderProps> = ({ onDataUploaded }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.json'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
  };

  const getFileType = (file: File): string => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) return 'CSV';
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'Excel';
    if (fileName.endsWith('.json')) return 'JSON';
    return 'Unknown';
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return data;
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    // For now, we'll use a simple approach
    // In production, you'd use a library like SheetJS
    const text = await file.text();
    return parseCSV(text); // Fallback to CSV parsing
  };

  const parseJSON = (text: string): any[] => {
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    } catch {
      return [];
    }
  };

  const processFile = async (file: File): Promise<FileData> => {
    const fileType = getFileType(file);
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fileData: FileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: fileType,
      status: 'processing',
      uploadedAt: new Date()
    };

    try {
      let parsedData: any[] = [];
      
      if (fileType === 'CSV') {
        const text = await file.text();
        parsedData = parseCSV(text);
      } else if (fileType === 'Excel') {
        parsedData = await parseExcel(file);
      } else if (fileType === 'JSON') {
        const text = await file.text();
        parsedData = parseJSON(text);
      }

      if (parsedData.length === 0) {
        throw new Error('Não foi possível extrair dados do arquivo');
      }

      const columns = Object.keys(parsedData[0] || {});
      const preview = parsedData.slice(0, 5); // First 5 rows for preview

      fileData.data = parsedData;
      fileData.columns = columns;
      fileData.preview = preview;
      fileData.status = 'completed';
      fileData.processedAt = new Date();

      toast.success(`Arquivo ${file.name} processado com sucesso: ${parsedData.length} registros`);
      
    } catch (error) {
      fileData.status = 'error';
      fileData.error = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao processar ${file.name}: ${fileData.error}`);
    }

    return fileData;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const newFiles: FileData[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        if (!validateFile(file)) {
          toast.error(`${file.name} não é um formato suportado. Use CSV, Excel ou JSON.`);
          continue;
        }

        const processedFile = await processFile(file);
        newFiles.push(processedFile);
        
        // Update progress
        setProcessingProgress(((i + 1) / selectedFiles.length) * 100);
      }

      setFiles(prev => [...prev, ...newFiles]);
      
      if (newFiles.length > 0) {
        toast.success(`${newFiles.length} arquivo(s) processado(s) com sucesso`);
      }

    } catch (error) {
      toast.error('Erro ao processar arquivos');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setColumnMapping({});
    }
    toast.success('Arquivo removido');
  };

  const selectFileForAnalysis = (file: FileData) => {
    console.log('selectFileForAnalysis called with file:', file);
    setSelectedFile(file);
    setActiveTab('mapping');
    
    // Auto-generate column mapping
    if (file.columns) {
      const mapping: ColumnMapping = {};
      file.columns.forEach(col => {
        mapping[col] = col; // Default mapping
      });
      setColumnMapping(mapping);
      console.log('Column mapping set:', mapping);
    }
  };

  const handleColumnMappingChange = (originalColumn: string, newMapping: string) => {
    console.log('Column mapping change:', { originalColumn, newMapping });
    setColumnMapping(prev => ({
      ...prev,
      [originalColumn]: newMapping
    }));
  };

  const startAnalysis = () => {
    console.log('startAnalysis called');
    if (!selectedFile || !selectedFile.data) {
      toast.error('Selecione um arquivo válido para análise');
      return;
    }

    // Transform data according to mapping
    const transformedData = selectedFile.data.map(row => {
      const transformed: any = {};
      Object.entries(columnMapping).forEach(([originalCol, newCol]) => {
        if (row[originalCol] !== undefined) {
          transformed[newCol] = row[originalCol];
        }
      });
      return transformed;
    });

    console.log('Transformed data:', transformedData);

    // Call parent callback
    onDataUploaded(transformedData, columnMapping, selectedFile.type);
    
    toast.success('Dados enviados para análise de vínculos');
    setActiveTab('upload');
  };

  const getStatusIcon = (status: FileData['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <Search className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'CSV':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'Excel':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'JSON':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload de Arquivos</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!selectedFile}>Mapeamento de Colunas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivos para Análise de Vínculos
              </CardTitle>
              <CardDescription>
                Faça upload de arquivos CSV, Excel ou JSON contendo dados para análise de vínculos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv,.xls,.xlsx,.json"
                    multiple
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Database className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Arraste arquivos CSV, Excel ou JSON aqui ou clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Formatos suportados: CSV, XLS, XLSX, JSON
                    </p>
                  </label>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={processingProgress} className="flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {Math.round(processingProgress)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Processando arquivos...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Files List */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Arquivos Processados ({files.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {files.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(file.status)}
                            {getFileIcon(file.type)}
                            <span className="font-medium">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                          
                          {file.status === 'completed' && file.data && (
                            <div className="text-sm text-muted-foreground">
                              {file.data.length} registros processados
                            </div>
                          )}
                          
                          {file.status === 'error' && file.error && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              Erro: {file.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {file.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectFileForAnalysis(file)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Analisar
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="mapping" className="space-y-6">
          {selectedFile && (
            <>
              {/* Debug Info */}
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p><strong>Arquivo selecionado:</strong> {selectedFile.name}</p>
                    <p><strong>Status:</strong> {selectedFile.status}</p>
                    <p><strong>Colunas:</strong> {selectedFile.columns?.length || 0}</p>
                    <p><strong>Preview:</strong> {selectedFile.preview?.length || 0} linhas</p>
                    <p><strong>Dados:</strong> {selectedFile.data?.length || 0} registros</p>
                  </div>
                </CardContent>
              </Card>

              {/* Column Mapping */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Mapeamento de Colunas
                  </CardTitle>
                  <CardDescription>
                    Configure como as colunas do arquivo devem ser interpretadas para análise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedFile.columns && selectedFile.columns.length > 0 ? (
                      selectedFile.columns.map((column) => (
                        <div key={column} className="flex items-center gap-4">
                          <Label className="w-32 text-sm font-medium">
                            {column}:
                          </Label>
                          <Input
                            value={columnMapping[column] || column}
                            onChange={(e) => handleColumnMappingChange(column, e.target.value)}
                            placeholder="Nome da coluna"
                            className="flex-1"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        Nenhuma coluna encontrada no arquivo
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Prévia dos Dados</CardTitle>
                  <CardDescription>
                    Primeiras 5 linhas do arquivo para verificação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedFile.preview && selectedFile.preview.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {Object.keys(selectedFile.preview[0] || {}).map((col) => (
                              <th key={col} className="text-left p-2 font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFile.preview.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              {Object.values(row).map((value, colIdx) => (
                                <td key={colIdx} className="p-2">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma prévia disponível</p>
                      <p className="text-xs mt-1">Verifique se o arquivo foi processado corretamente</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Iniciar Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button 
                      onClick={startAnalysis} 
                      disabled={!selectedFile.data || selectedFile.data.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Iniciar Análise de Vínculos
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('upload')}
                    >
                      Voltar
                    </Button>
                  </div>
                  
                  {(!selectedFile.data || selectedFile.data.length === 0) && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          Não é possível iniciar a análise: dados do arquivo não estão disponíveis
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LinkAnalysisUploader;