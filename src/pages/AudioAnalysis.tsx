
import React, { useState, useEffect } from 'react';
import { Upload, AudioWaveform, Mic, FileText, AlertCircle, Database, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';
import { transcribeAudioWithGroq, makeGroqAIRequest, getAudioFileInfo, isAudioFileTooLarge } from '../services/groqService';
import { saveAudioTranscription, getAudioTranscriptionsByCaseId } from '../services/databaseService';

interface AudioFile {
  id: string;
  name: string;
  url: string;
  file: File;
  transcription?: string;
  speakerSegments?: {
    speaker: string;
    start: number;
    end: number;
    text: string;
  }[];
  fileInfo?: {
    sizeInMB: string;
    isLarge: boolean;
    isTooLarge: boolean;
    needsCompression: boolean;
    needsChunking: boolean;
  };
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

const AudioAnalysis = () => {
  const { currentCase, saveToCurrentCase } = useCase();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);
  const [showSpeakers, setShowSpeakers] = useState<boolean>(false);

  // Check for existing transcriptions in the database when case changes
  useEffect(() => {
    if (currentCase) {
      checkForExistingTranscriptions();
    }
  }, [currentCase]);

  const checkForExistingTranscriptions = async () => {
    if (!currentCase) return;
    
    try {
      setIsCheckingDb(true);
      const transcriptions = await getAudioTranscriptionsByCaseId(currentCase.id);
      setIsCheckingDb(false);
      
      if (transcriptions.length > 0) {
        toast.info(`${transcriptions.length} transcrições encontradas no banco de dados para este caso`);
      }
    } catch (error) {
      console.error('Error checking for existing transcriptions:', error);
      setIsCheckingDb(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const validFiles: AudioFile[] = [];
    const invalidFiles: string[] = [];
    const largeFiles: string[] = [];
    
    // Process multiple files
    Array.from(files).forEach((file, index) => {
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.wav', '.mp3', '.mp4', '.opus', '.m4a', '.flac', '.aac', '.ogg', '.webm'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!file.type.startsWith('audio/') && !hasValidExtension) {
        invalidFiles.push(file.name);
        return;
      }
      
      // Verificar tamanho do arquivo
      const fileInfo = getAudioFileInfo(file);
      if (fileInfo.isLarge) {
        largeFiles.push(`${file.name} (${fileInfo.sizeInMB}MB)`);
      }
      
      // Create object URL for the audio file
      const audioUrl = URL.createObjectURL(file);
      
      const newAudio: AudioFile = {
        id: `audio-${Date.now()}-${index}`,
        name: file.name,
        url: audioUrl,
        file: file,
        fileInfo: getAudioFileInfo(file),
        status: 'pending'
      };
      
      validFiles.push(newAudio);
    });
    
    if (invalidFiles.length > 0) {
      toast.error(`Arquivos inválidos ignorados: ${invalidFiles.join(', ')}`);
    }
    
    if (largeFiles.length > 0) {
      toast.warning(`Arquivos grandes detectados: ${largeFiles.join(', ')}. O sistema irá comprimir automaticamente.`);
    }
    
    if (validFiles.length > 0) {
      setAudioFiles([...audioFiles, ...validFiles]);
      toast.success(`${validFiles.length} arquivo(s) de áudio adicionado(s) com sucesso`);
    }
  };

  const handleTranscribe = async (audio: AudioFile) => {
    setSelectedAudio(audio);
    setIsTranscribing(true);
    
    try {
      // Atualizar status para processando
      const processingAudio = { ...audio, status: 'processing' as const };
      setAudioFiles(prev => prev.map(a => 
        a.id === audio.id ? processingAudio : a
      ));
      
      // Check if we already have this audio transcribed in the database
      if (currentCase) {
        const transcriptions = await getAudioTranscriptionsByCaseId(currentCase.id);
        const existingTranscription = transcriptions.find(t => t.filename === audio.name);
        
        if (existingTranscription && existingTranscription.transcription) {
          // Parse speaker segments if they exist
          let speakerSegments = [];
          try {
            if (existingTranscription.speakerData) {
              speakerSegments = JSON.parse(existingTranscription.speakerData);
            }
          } catch (e) {
            console.error('Error parsing speaker data:', e);
          }
          
          // Use existing transcription from DB
          const completedAudio = { 
            ...processingAudio, 
            transcription: existingTranscription.transcription,
            speakerSegments: speakerSegments,
            status: 'completed' as const
          };
          
          const updatedAudioFiles = audioFiles.map(a => 
            a.id === audio.id ? completedAudio : a
          );
          
          setAudioFiles(updatedAudioFiles);
          setSelectedAudio(completedAudio);
          toast.success('Transcrição recuperada do banco de dados');
          setIsTranscribing(false);
          return;
        }
      }
      
      console.log('Transcribing audio file:', audio.name);
      // Call GROQ Whisper API with enhanced speaker detection
      const { text, speakerSegments } = await transcribeAudioWithGroq(audio.file);
      console.log('Transcription completed successfully with speakers:', speakerSegments.length);
      
      // Update the audio file with transcription and speaker segments
      const completedAudio = { 
        ...processingAudio, 
        transcription: text, 
        speakerSegments,
        status: 'completed' as const
      };
      
      const updatedAudioFiles = audioFiles.map(a => 
        a.id === audio.id ? completedAudio : a
      );
      
      setAudioFiles(updatedAudioFiles);
      setSelectedAudio(completedAudio);
      
      // Save to database if we have a case
      if (currentCase) {
        await saveAudioTranscription({
          caseId: currentCase.id,
          filename: audio.name,
          transcription: text,
          speakerData: JSON.stringify(speakerSegments),
          dateProcessed: new Date().toISOString()
        });
      }
      
      toast.success('Transcrição concluída com sucesso');
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Atualizar status para erro
      const errorAudio = { 
        ...audio, 
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      
      setAudioFiles(prev => prev.map(a => 
        a.id === audio.id ? errorAudio : a
      ));
      
      toast.error(`Erro na transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateReport = async () => {
    const audiosWithTranscription = audioFiles.filter(a => a.transcription);
    
    if (audiosWithTranscription.length === 0) {
      toast.error('Não há transcrições disponíveis para gerar o relatório');
      return;
    }
    
    if (!currentCase) {
      toast.error('Selecione um caso antes de gerar o relatório');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Create a more detailed transcript with speaker information for the AI
      const allTranscriptions = audiosWithTranscription.map(a => {
        let formattedTranscript = `## Arquivo: ${a.name}\n\n`;
        
        if (a.speakerSegments && a.speakerSegments.length > 0) {
          // Format with speaker information
          const speakerGroups = a.speakerSegments.reduce((groups, segment) => {
            const { speaker, text } = segment;
            if (!groups[speaker]) groups[speaker] = [];
            groups[speaker].push(text);
            return groups;
          }, {} as Record<string, string[]>);
          
          formattedTranscript += "### Transcrição por Falante:\n\n";
          
          Object.entries(speakerGroups).forEach(([speaker, texts]) => {
            formattedTranscript += `**${speaker}**: ${texts.join(' ')}\n\n`;
          });
        } else {
          // Use raw transcription if no speaker info
          formattedTranscript += a.transcription;
        }
        
        return formattedTranscript;
      }).join('\n\n---\n\n');
      
      // Use GROQ API to generate report with improved prompt for crime detection
      const messages = [
        {
          role: "system",
          content: 
            "Você é um investigador especializado em análise forense de áudios e detecção de crimes. " +
            "Sua tarefa é analisar transcrições de áudios e identificar possíveis evidências criminais, " +
            "padrões suspeitos, menções a atividades ilegais, nomes, locais, datas importantes, " +
            "e qualquer informação relevante para investigações. " +
            "Estruture sua análise de forma profissional e detalhada com seções claras. " +
            "O relatório deve incluir: " +
            "1) RESUMO EXECUTIVO com principais achados criminais; " +
            "2) ANÁLISE DE ÁUDIOS (arquivo por arquivo); " +
            "3) IDENTIFICAÇÃO DE INTERLOCUTORES; " +
            "4) INDÍCIOS CRIMINAIS DETECTADOS (ameaças, conspiração, lavagem de dinheiro, tráfico, corrupção, etc.); " +
            "5) ANÁLISE DE COMPORTAMENTO E LINGUAGEM; " +
            "6) CRONOLOGIA DE EVENTOS SUSPEITOS; " +
            "7) RECOMENDAÇÕES INVESTIGATIVAS. " +
            "Utilize formato Markdown. Seja específico sobre crimes detectados e cite trechos relevantes."
        },
        {
          role: "user",
          content: `Analise as seguintes transcrições de áudio em busca de evidências criminais e informações investigativas relevantes. 

ESTRUTURE O RELATÓRIO COM AS SEGUINTES SEÇÕES:

1. RESUMO EXECUTIVO
2. EVIDÊNCIAS CRIMINAIS IDENTIFICADAS
3. PESSOAS MENCIONADAS (nomes, apelidos, funções)
4. LOCAIS E ENDEREÇOS CITADOS
5. DATAS E HORÁRIOS IMPORTANTES
6. ATIVIDADES SUSPEITAS DETECTADAS
7. PADRÕES DE COMPORTAMENTO
8. POSSÍVEIS CONEXÕES CRIMINAIS
9. RECOMENDAÇÕES INVESTIGATIVAS
10. ANEXOS (trechos relevantes das transcrições)

Transcrições para análise:

${allTranscriptions}`
        }
      ];
      
      console.log('Generating report based on audio transcriptions with speaker data');
      const generatedReport = await makeGroqAIRequest(messages, 2048);
      setReport(generatedReport);
      
      // Save to case
      saveToCurrentCase({
        timestamp: new Date().toISOString(),
        audioFiles: audioFiles.map(a => ({
          name: a.name,
          hasTranscription: !!a.transcription
        })),
        report: generatedReport
      }, 'audioAnalysis');
      
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToCase = () => {
    if (!report || !currentCase) {
      toast.error('Não há relatório para salvar ou nenhum caso selecionado');
      return;
    }
    
    // Save report to case
    saveToCurrentCase({
      timestamp: new Date().toISOString(),
      audioFiles: audioFiles.map(a => ({
        name: a.name,
        hasTranscription: !!a.transcription
      })),
      report
    }, 'audioAnalysis');
    
    toast.success('Análise de áudio salva com sucesso no caso atual');
  };

  // Render transcription with speaker segments
  const renderTranscriptionWithSpeakers = () => {
    if (!selectedAudio?.speakerSegments || selectedAudio.speakerSegments.length === 0) {
      return (
        <pre className="whitespace-pre-wrap text-sm">{selectedAudio?.transcription}</pre>
      );
    }

    return (
      <div className="space-y-4">
        {selectedAudio.speakerSegments.map((segment, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="w-24 flex-shrink-0">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-md p-2 text-blue-800 dark:text-blue-200 text-sm font-medium">
                {segment.speaker}
              </div>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {segment.text}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container py-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <AudioWaveform className="h-8 w-8 text-brand" />
          Análise de Áudio
        </h1>
        <p className="page-description">
          Transcreva e analise áudios para criar relatórios detalhados
        </p>
      </div>

      {!currentCase ? (
        <Card className="border-warning bg-warning-light">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="text-warning-foreground">
                Selecione um caso antes de prosseguir com a análise de áudio.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload de Áudio
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Database className="h-4 w-4" />
                  As transcrições são processadas e salvas no banco de dados local
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Informações sobre limitações */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                                                 <p className="font-medium mb-1">📁 Limitações de Arquivo:</p>
                         <ul className="space-y-1 text-xs">
                           <li>• <strong>Recomendado:</strong> Até 5MB para melhor performance</li>
                           <li>• <strong>Máximo:</strong> 25MB (será comprimido automaticamente)</li>
                           <li>• <strong>Arquivos grandes:</strong> Serão divididos em chunks de 2 minutos</li>
                           <li>• <strong>Formatos suportados:</strong> WAV, MP3, MP4, OPUS, M4A, FLAC, AAC, OGG</li>
                         </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      id="audio-upload"
                      className="hidden"
                      accept="audio/*,.wav,.mp3,.mp4,.opus,.m4a,.flac,.aac,.ogg"
                      multiple
                      onChange={handleAudioUpload}
                    />
                    <label 
                      htmlFor="audio-upload" 
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Mic className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Arraste arquivos de áudio aqui ou clique para fazer upload
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Formatos suportados: MP3, WAV, MP4, OPUS, M4A, FLAC, AAC, OGG
                      </p>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AudioWaveform className="h-5 w-5" /> Áudios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audioFiles.length === 0 ? (
                  <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                    <AudioWaveform className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    <p>Nenhum áudio adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {audioFiles.map((audio) => (
                      <div 
                        key={audio.id} 
                        className={`p-3 rounded-lg border transition-colors ${
                          selectedAudio?.id === audio.id
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{audio.name}</h4>
                            {audio.fileInfo && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{audio.fileInfo.sizeInMB}MB</span>
                                {audio.fileInfo.isLarge && (
                                  <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-xs">
                                    Grande
                                  </span>
                                )}
                                {audio.fileInfo.needsChunking && (
                                  <span className="px-1 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded text-xs">
                                    Muito Grande
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {/* Status do arquivo */}
                            {audio.status === 'processing' && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full flex items-center gap-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                                Processando
                              </span>
                            )}
                            {audio.status === 'error' && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                Erro
                              </span>
                            )}
                            {audio.speakerSegments && audio.speakerSegments.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full flex items-center gap-1">
                                <Users size={12} />
                                {new Set(audio.speakerSegments.map(s => s.speaker)).size} falantes
                              </span>
                            )}
                            {audio.transcription && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                Transcrito
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <audio src={audio.url} controls className="w-full h-8 mb-3" />
                        
                        <div className="flex justify-end">
                          <Button
                            variant={audio.transcription ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleTranscribe(audio)}
                            disabled={isTranscribing || audio.status === 'processing'}
                          >
                            {audio.status === 'processing' ? 'Processando...' : 
                             audio.transcription ? 'Transcrever Novamente' : 'Transcrever'}
                          </Button>
                        </div>
                        
                        {/* Mostrar erro se houver */}
                        {audio.status === 'error' && audio.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                            <strong>Erro:</strong> {audio.error}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      onClick={generateReport} 
                      disabled={!audioFiles.some(a => a.transcription) || isGenerating}
                      className="w-full mt-4"
                    >
                      {isGenerating ? 'Gerando relatório com IA...' : 'Gerar Relatório Consolidado'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>
                    {selectedAudio ? 'Transcrição' : 'Relatório de Áudio'}
                    {selectedAudio && selectedAudio.speakerSegments && selectedAudio.speakerSegments.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => setShowSpeakers(!showSpeakers)}
                      >
                        <Users size={16} className="mr-1" />
                        {showSpeakers ? 'Ocultar falantes' : 'Mostrar falantes'}
                      </Button>
                    )}
                  </span>
                  {report && !selectedAudio && (
                    <Button variant="outline" size="sm" onClick={saveToCase}>
                      Salvar no Caso
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                {isTranscribing ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Transcrevendo áudio com Whisper via GROQ...
                    </p>
                  </div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Analisando transcrições e gerando relatório com IA...
                    </p>
                  </div>
                ) : selectedAudio && selectedAudio.transcription ? (
                  <div className="h-full flex flex-col">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 flex-1 overflow-auto">
                      {showSpeakers && selectedAudio.speakerSegments ? 
                        renderTranscriptionWithSpeakers() : 
                        <pre className="whitespace-pre-wrap text-sm">{selectedAudio.transcription}</pre>
                      }
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAudio(null)}
                      >
                        Voltar para o Relatório
                      </Button>
                    </div>
                  </div>
                ) : report ? (
                  <Textarea
                    className="h-full min-h-[500px] font-mono"
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <FileText className="h-16 w-16 opacity-20 mb-4" />
                    <p className="text-center">
                      Faça upload de áudios, transcreva-os e gere um relatório consolidado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioAnalysis;
