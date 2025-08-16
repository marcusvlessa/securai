import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Music, Database, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { fileUploadService, type FileUploadResult } from '@/services/fileUploadService';
import { analysisService } from '@/services/analysisService';

interface FileUploaderProps {
  caseId: string;
  onFileUploaded?: (result: FileUploadResult) => void;
  onAnalysisComplete?: (analysisId: string) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  autoAnalyze?: boolean;
}

interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'completed' | 'error';
  error?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  caseId,
  onFileUploaded,
  onAnalysisComplete,
  acceptedTypes = ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.mp3', '.wav', '.xlsx', '.csv'],
  maxFileSize = 50, // 50MB default
  autoAnalyze = true
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return <Image className="h-5 w-5" />;
    }
    
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension || '')) {
      return <Music className="h-5 w-5" />;
    }
    
    if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return <Database className="h-5 w-5" />;
    }
    
    return <FileText className="h-5 w-5" />;
  };

  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return 'image';
    }
    
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension || '')) {
      return 'audio';
    }
    
    if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return 'financial';
    }
    
    if (['pdf', 'txt', 'doc', 'docx'].includes(extension || '')) {
      return 'document';
    }
    
    return 'other';
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Arquivo muito grande. Máximo permitido: ${maxFileSize}MB`;
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      return `Tipo de arquivo não suportado. Tipos aceitos: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const updateUploadProgress = (fileId: string, updates: Partial<UploadProgress>) => {
    setUploads(prev => prev.map(upload => 
      upload.fileId === fileId ? { ...upload, ...updates } : upload
    ));
  };

  const removeUpload = (fileId: string) => {
    setUploads(prev => prev.filter(upload => upload.fileId !== fileId));
  };

  const handleFileUpload = async (files: FileList) => {
    const validFiles: File[] = [];
    
    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Process each valid file
    for (const file of validFiles) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to upload progress
      setUploads(prev => [...prev, {
        fileId,
        filename: file.name,
        progress: 0,
        status: 'uploading'
      }]);

      try {
        // Upload file
        updateUploadProgress(fileId, { progress: 25 });
        
        const fileType = getFileType(file);
        const uploadResult = await fileUploadService.uploadFile(file, caseId, fileType);
        
        updateUploadProgress(fileId, { progress: 50 });
        
        // Notify parent component
        onFileUploaded?.(uploadResult);
        
        // Auto-analyze if enabled
        if (autoAnalyze) {
          updateUploadProgress(fileId, { 
            progress: 60, 
            status: 'analyzing'
          });
          
          const analysisResult = await analysisService.autoAnalyzeFile(
            uploadResult.fileId, 
            caseId
          );
          
          updateUploadProgress(fileId, { 
            progress: 100, 
            status: 'completed'
          });
          
          onAnalysisComplete?.(analysisResult.id);
          
          toast.success(`${file.name} enviado e analisado com sucesso!`);
        } else {
          updateUploadProgress(fileId, { 
            progress: 100, 
            status: 'completed'
          });
          
          toast.success(`${file.name} enviado com sucesso!`);
        }

        // Remove from list after 3 seconds
        setTimeout(() => removeUpload(fileId), 3000);
        
      } catch (error) {
        console.error('Upload error:', error);
        
        updateUploadProgress(fileId, { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        
        toast.error(`Erro ao enviar ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [caseId, autoAnalyze]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={onInputChange}
            />
            
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                Arraste arquivos aqui ou clique para selecionar
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Formatos aceitos: {acceptedTypes.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: {maxFileSize}MB por arquivo
              </p>
              
              <Button className="mt-4">
                Selecionar Arquivos
              </Button>
            </label>
          </div>
          
          {autoAnalyze && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ✨ Análise automática ativada - Os arquivos serão analisados automaticamente após o upload
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processando Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.map((upload) => (
              <div key={upload.fileId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(upload.filename)}
                    <span className="text-sm font-medium">{upload.filename}</span>
                    
                    {upload.status === 'uploading' && (
                      <Badge variant="secondary">Enviando</Badge>
                    )}
                    {upload.status === 'analyzing' && (
                      <Badge variant="secondary">Analisando</Badge>
                    )}
                    {upload.status === 'completed' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                    {upload.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Erro
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.fileId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {(upload.status === 'uploading' || upload.status === 'analyzing') && (
                  <Progress value={upload.progress} className="w-full" />
                )}
                
                {upload.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {upload.error}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;