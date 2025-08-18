import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  Video, 
  Volume2, 
  Archive, 
  X, 
  Download,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  uploadedAt: Date;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
    caseId?: string;
  };
}

interface FileUploaderProps {
  caseId?: string;
  autoAnalyze?: boolean;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  onFileUploaded?: (file: UploadedFile) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  caseId,
  autoAnalyze = false,
  maxFileSize = 100, // 100MB default
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'text/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  onFileUploaded
}) => {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [fileCategory, setFileCategory] = useState('evidence');
  const [fileTags, setFileTags] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <Volume2 className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    if (type.startsWith('text/')) return <FileText className="w-4 h-4" />;
    if (type.includes('word') || type.includes('excel')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getFileTypeCategory = (type: string) => {
    if (type.startsWith('image/')) return 'Imagem';
    if (type.startsWith('video/')) return 'Vídeo';
    if (type.startsWith('audio/')) return 'Áudio';
    if (type === 'application/pdf') return 'PDF';
    if (type.startsWith('text/')) return 'Texto';
    if (type.includes('word')) return 'Documento Word';
    if (type.includes('excel')) return 'Planilha Excel';
    return 'Arquivo';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Arquivo muito grande. Tamanho máximo: ${maxFileSize}MB`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `Tipo de arquivo não suportado: ${file.type}`;
    }

    return null;
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: "Erro de validação",
          description: error,
          variant: "destructive"
        });
      });
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);

    for (const file of validFiles) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create upload entry
      const uploadEntry: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        status: 'uploading',
        progress: 0,
        uploadedAt: new Date(),
        metadata: {
          description: fileDescription,
          tags: fileTags.split(',').map(tag => tag.trim()).filter(tag => tag),
          category: fileCategory,
          caseId
        }
      };

      setUploads(prev => [...prev, uploadEntry]);

      try {
        // Upload to Supabase Storage
        const fileName = `${caseId || 'general'}/${fileId}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('evidence-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('evidence-files')
          .getPublicUrl(fileName);

        // Update upload entry
        const updatedEntry: UploadedFile = {
          ...uploadEntry,
          url: urlData.publicUrl,
          status: 'completed',
          progress: 100
        };

        setUploads(prev => prev.map(upload => 
          upload.id === fileId ? updatedEntry : upload
        ));

        // Save file metadata to database
        await saveFileMetadata(updatedEntry);

        // Trigger auto-analysis if enabled
        if (autoAnalyze) {
          await triggerFileAnalysis(updatedEntry);
        }

        // Call callback
        onFileUploaded?.(updatedEntry);

        toast({
          title: "Upload concluído",
          description: `${file.name} foi enviado com sucesso.`,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        setUploads(prev => prev.map(upload => 
          upload.id === fileId 
            ? { ...upload, status: 'error', error: errorMessage }
            : upload
        ));

        toast({
          title: "Erro no upload",
          description: `Falha ao enviar ${file.name}: ${errorMessage}`,
          variant: "destructive"
        });
      }
    }

    setIsUploading(false);
    setFileDescription('');
    setFileTags('');
    setFileCategory('evidence');
  }, [caseId, autoAnalyze, fileDescription, fileTags, fileCategory, maxFileSize, acceptedTypes, onFileUploaded, toast]);

  const saveFileMetadata = async (file: UploadedFile) => {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .insert({
          id: file.id,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          mime_type: file.type,
          file_path: file.url,
          case_id: file.metadata?.caseId || '',
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            category: file.metadata?.category,
            description: file.metadata?.description,
            tags: file.metadata?.tags
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving file metadata:', error);
    }
  };

  const triggerFileAnalysis = async (file: UploadedFile) => {
    try {
      // This would trigger the AI analysis service
      console.log('Triggering analysis for:', file.name);
      
      // For now, just log the action
      // In a real implementation, this would call the analysis service
      toast({
        title: "Análise iniciada",
        description: `Análise automática iniciada para ${file.name}`,
      });
    } catch (error) {
      console.error('Error triggering analysis:', error);
    }
  };

  const removeUpload = (fileId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== fileId));
  };

  const downloadFile = async (file: UploadedFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

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
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Evidências
          </CardTitle>
          <CardDescription>
            Envie arquivos de evidências para análise e armazenamento seguro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* File Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="file-description">Descrição</Label>
              <Textarea
                id="file-description"
                placeholder="Descreva o arquivo..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file-category">Categoria</Label>
              <Select value={fileCategory} onValueChange={setFileCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evidence">Evidência</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="photo">Fotografia</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="report">Relatório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file-tags">Tags</Label>
              <Input
                id="file-tags"
                placeholder="tag1, tag2, tag3"
                value={fileTags}
                onChange={(e) => setFileTags(e.target.value)}
              />
            </div>
          </div>

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
              ref={fileInputRef}
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
              
              <Button className="mt-4" disabled={isUploading}>
                {isUploading ? 'Enviando...' : 'Selecionar Arquivos'}
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
            <CardTitle className="text-sm">Arquivos Enviados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.map((upload) => (
              <div key={upload.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(upload.type)}
                    <span className="text-sm font-medium">{upload.name}</span>
                    
                    {upload.status === 'uploading' && (
                      <Badge variant="secondary">Enviando</Badge>
                    )}
                    {upload.status === 'completed' && (
                      <Badge variant="default">Concluído</Badge>
                    )}
                    {upload.status === 'error' && (
                      <Badge variant="destructive">Erro</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(upload.size)}
                    </span>
                    
                    {upload.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(upload)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(upload.url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUpload(upload.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-2" />
                )}
                
                {upload.status === 'error' && upload.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{upload.error}</AlertDescription>
                  </Alert>
                )}
                
                {upload.status === 'completed' && upload.metadata && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {upload.metadata.description && (
                      <p>Descrição: {upload.metadata.description}</p>
                    )}
                    {upload.metadata.tags && upload.metadata.tags.length > 0 && (
                      <p>Tags: {upload.metadata.tags.join(', ')}</p>
                    )}
                    {upload.metadata.category && (
                      <p>Categoria: {upload.metadata.category}</p>
                    )}
                  </div>
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