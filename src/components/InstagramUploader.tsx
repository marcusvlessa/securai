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
        description: "Por favor, selecione um arquivo ZIP válido exportado do Instagram",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Iniciando upload do Instagram:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    setUploading(true);
    setProgress(0);
    setCurrentStep('Preparando para processar...');

    try {
      // Feedback inicial
      toast({
        title: "Processamento iniciado",
        description: `Analisando ${file.name}...`,
      });

      // Processar o arquivo ZIP com callback de progresso detalhado
      const result = await instagramParserService.processZipFile(file, (step, progressValue) => {
        console.log(`📊 Progresso: ${progressValue.toFixed(1)}% - ${step}`);
        setCurrentStep(step);
        setProgress(Math.min(progressValue, 100));
      });

      setProgress(100);
      setCurrentStep('✅ Processamento concluído com sucesso!');

      console.log('✅ Processamento finalizado:', {
        users: result.users.length,
        conversations: result.conversations.length,
        media: result.media.length,
        sectionsFound: result.metadata.sectionsFound
      });

      // Aguardar um momento para mostrar o sucesso
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Notificar o componente pai com dados completos
      onFileProcessed(result);

      toast({
        title: "🎉 Instagram processado com sucesso!",
        description: `✅ ${result.users.length} usuários • ${result.conversations.length} conversas • ${result.media.length} mídias`,
      });

    } catch (error) {
      console.error('❌ Erro fatal no processamento:', error);
      
      setCurrentStep('❌ Erro no processamento');
      
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Aguardar um pouco antes de resetar para mostrar o resultado final
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setCurrentStep('');
      }, 2000);
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
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">{currentStep}</p>
                  <Progress value={progress} className="mt-2" />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
                    <div className="text-xs text-muted-foreground">
                      {progress < 30 && "📁 Extraindo arquivos..."}
                      {progress >= 30 && progress < 60 && "🔍 Analisando dados..."}
                      {progress >= 60 && progress < 85 && "🤖 Processando com IA..."}
                      {progress >= 85 && progress < 100 && "✨ Finalizando..."}
                      {progress >= 100 && "🎉 Concluído!"}
                    </div>
                  </div>
                  {progress >= 75 && progress < 100 && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⏳ Processando mídias com IA - pode demorar alguns minutos
                    </p>
                  )}
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