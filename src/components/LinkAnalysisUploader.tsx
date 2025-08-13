import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface ColumnMapping {
  [key: string]: string;
}

interface FileUploadProps {
  onDataUploaded: (data: any[], mapping: ColumnMapping, fileType: string) => void;
}

const LinkAnalysisUploader: React.FC<FileUploadProps> = ({ onDataUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'complete'>('upload');

  // Presets for different data types
  const presets = {
    financial: {
      source: 'Conta Origem',
      target: 'Conta Destino', 
      value: 'Valor',
      date: 'Data',
      type: 'Tipo Transação'
    },
    cdr: {
      source: 'Número Origem',
      target: 'Número Destino',
      date: 'Data/Hora',
      duration: 'Duração',
      location: 'ERB/Cell-ID'
    },
    mobile: {
      source: 'Contato',
      target: 'Destinatário',
      date: 'Timestamp',
      type: 'Tipo Comunicação',
      content: 'Conteúdo'
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const uploadedFile = files[0];
    const fileName = uploadedFile.name.toLowerCase();
    
    if (!(fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.json'))) {
      toast.error('Formato não suportado. Use CSV, XLSX ou JSON.');
      return;
    }
    
    setFile(uploadedFile);
    parseFile(uploadedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Simple CSV parser
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        setHeaders(headers);
        setRawData(data);
        setStep('mapping');
        
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const jsonData = JSON.parse(text);
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const firstItem = jsonData[0];
          const headers = Object.keys(firstItem);
          setHeaders(headers);
          setRawData(jsonData);
          setStep('mapping');
        }
      }
      
      toast.success('Arquivo carregado com sucesso');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao processar arquivo');
    }
  };

  const applyPreset = (presetType: keyof typeof presets) => {
    const preset = presets[presetType];
    const newMapping: ColumnMapping = {};
    
    // Try to auto-map based on column names
    Object.entries(preset).forEach(([key, suggestedName]) => {
      const matchingHeader = headers.find(header => 
        header.toLowerCase().includes(suggestedName.toLowerCase()) ||
        suggestedName.toLowerCase().includes(header.toLowerCase())
      );
      if (matchingHeader) {
        newMapping[key] = matchingHeader;
      }
    });
    
    setMapping(newMapping);
    setFileType(presetType);
  };

  const updateMapping = (field: string, header: string) => {
    setMapping(prev => ({ ...prev, [field]: header }));
  };

  const confirmMapping = () => {
    if (Object.keys(mapping).length === 0) {
      toast.error('Configure pelo menos um mapeamento de coluna');
      return;
    }
    
    onDataUploaded(rawData, mapping, fileType);
    setStep('complete');
    toast.success('Dados carregados e mapeados com sucesso');
  };

  const reset = () => {
    setFile(null);
    setFileType('');
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setStep('upload');
  };

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Dados para Análise de Vínculos
          </CardTitle>
          <CardDescription>
            Carregue dados financeiros, CDR ou extrações de celular
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            <Input
              type="file"
              id="link-data-upload"
              className="hidden"
              accept=".csv,.xlsx,.json"
              onChange={handleFileUpload}
            />
            <label 
              htmlFor="link-data-upload" 
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <FileText className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clique para carregar CSV, XLSX ou JSON
              </p>
            </label>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'mapping') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mapeamento de Colunas
          </CardTitle>
          <CardDescription>
            Configure como os dados devem ser interpretados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('financial')}
            >
              Preset Financeiro
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('cdr')}
            >
              Preset CDR
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('mobile')}
            >
              Preset Celular
            </Button>
          </div>
          
          <div className="space-y-3">
            {['source', 'target', 'value', 'date', 'type', 'duration', 'location', 'content'].map(field => (
              <div key={field} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium capitalize">
                  {field === 'source' ? 'Origem' :
                   field === 'target' ? 'Destino' :
                   field === 'value' ? 'Valor' :
                   field === 'date' ? 'Data' :
                   field === 'type' ? 'Tipo' :
                   field === 'duration' ? 'Duração' :
                   field === 'location' ? 'Local' :
                   field === 'content' ? 'Conteúdo' : field}:
                </div>
                <Select 
                  value={mapping[field] || ''} 
                  onValueChange={(value) => updateMapping(field, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não mapear</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={confirmMapping} className="flex-1">
              Confirmar Mapeamento
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Dados Carregados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Arquivo:</strong> {file?.name}
          </p>
          <p className="text-sm">
            <strong>Registros:</strong> {rawData.length}
          </p>
          <p className="text-sm">
            <strong>Tipo:</strong> {fileType || 'Customizado'}
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Carregar Outro Arquivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkAnalysisUploader;