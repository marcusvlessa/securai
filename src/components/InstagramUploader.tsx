import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Archive, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { instagramParserService } from '@/services/instagramParserService';

import { ProcessedInstagramData } from '@/services/instagramParserService';

interface InstagramUploaderProps {
  onFileProcessed: (data: ProcessedInstagramData) => void;
}

export const InstagramUploader: React.FC<InstagramUploaderProps> = ({ onFileProcessed }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file || !file.name.endsWith('.zip')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo ZIP válido",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentStep('Fazendo upload do arquivo...');

    try {
      // Simular progresso de upload
      for (let i = 0; i <= 20; i++) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setCurrentStep('Descompactando arquivo ZIP...');
      setProgress(25);

      // Processar o arquivo ZIP
      const result = await instagramParserService.processZipFile(file, (step, progressValue) => {
        setCurrentStep(step);
        setProgress(25 + (progressValue * 0.75)); // 25% já foi do upload, resto é processamento
      });

      setProgress(100);
      setCurrentStep('Processamento concluído!');

      // Notificar o componente pai com dados completos
      onFileProcessed(result);

      toast({
        title: "Arquivo processado com sucesso",
        description: `${result.users.length} usuários e ${result.conversations.length} conversas encontrados`,
      });

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [onFileProcessed, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${uploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <div>
                  <p className="text-sm font-medium">{currentStep}</p>
                  <Progress value={progress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  {isDragActive ? (
                    <Upload className="h-12 w-12 text-primary" />
                  ) : (
                    <Archive className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive 
                      ? 'Solte o arquivo aqui...' 
                      : 'Arraste um arquivo ZIP ou clique para selecionar'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Suporta apenas arquivos ZIP exportados do Instagram
                  </p>
                </div>
                
                <Button variant="outline" size="sm">
                  Selecionar Arquivo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Como obter dados do Instagram:</p>
            <ol className="list-decimal list-inside space-y-1 mt-2 text-muted-foreground">
              <li>Acesse as configurações da sua conta no Instagram</li>
              <li>Vá em "Privacidade e Segurança" → "Baixar Dados"</li>
              <li>Selecione "Baixar Informações" e escolha o formato "HTML"</li>
              <li>Aguarde o email com o link para download</li>
              <li>Baixe o arquivo ZIP e faça upload aqui</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};