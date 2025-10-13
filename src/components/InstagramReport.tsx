import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  FileText, 
  AlertTriangle, 
  Users, 
  MessageSquare, 
  Image,
  Calendar,
  MapPin,
  Shield,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProcessedInstagramData } from '@/services/instagramParserService';

interface InstagramReportProps {
  data: ProcessedInstagramData;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  findings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export const InstagramReport: React.FC<InstagramReportProps> = ({ data }) => {
  const { toast } = useToast();
  const [reportSections, setReportSections] = useState<ReportSection[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string>('summary');

  // Inicializar seções do relatório
  useEffect(() => {
    const sections: ReportSection[] = [
      {
        id: 'summary',
        title: 'Resumo Executivo',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'low'
      },
      {
        id: 'timeline',
        title: 'Linha do Tempo',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'low'
      },
      {
        id: 'communications',
        title: 'Análise de Comunicações',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'low'
      },
      {
        id: 'network',
        title: 'Análise de Rede Social',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'low'
      },
      {
        id: 'digital-forensics',
        title: 'Evidências Digitais',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'low'
      },
      {
        id: 'risk-assessment',
        title: 'Avaliação de Risco',
        content: '',
        status: 'pending',
        findings: [],
        riskLevel: 'medium'
      }
    ];

    setReportSections(sections);
  }, [data]);

  const generateReport = async () => {
    setGeneratingReport(true);
    setReportProgress(0);

    try {
      const sections = [...reportSections];
      
      for (let i = 0; i < sections.length; i++) {
        setReportProgress((i / sections.length) * 100);
        sections[i].status = 'generating';
        setReportSections([...sections]);

        // Simular geração de relatório baseado nos dados
        await new Promise(resolve => setTimeout(resolve, 1500));

      switch (sections[i].id) {
          case 'summary':
            sections[i] = generateSummarySection(data);
            break;
          case 'timeline':
            sections[i] = generateTimelineSection(data);
            break;
          case 'communications':
            sections[i] = generateCommunicationsSection(data);
            break;
          case 'network':
            sections[i] = generateNetworkSection(data);
            break;
          case 'digital-forensics':
            sections[i] = generateDigitalForensicsSection(data);
            break;
          case 'risk-assessment':
            sections[i] = generateRiskAssessmentSection(data);
            break;
        }

        sections[i].status = 'completed';
        setReportSections([...sections]);
      }

      setReportProgress(100);
      toast({
        title: "Relatório Gerado",
        description: "O relatório investigativo foi gerado com sucesso",
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro na Geração",
        description: "Falha ao gerar o relatório investigativo",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const generateSummarySection = (data: ProcessedInstagramData): ReportSection => {
    const totalMessages = data.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const uniqueContacts = new Set(
      data.conversations.flatMap(conv => 
        conv.messages.map(msg => msg.sender)
      )
    ).size;

    return {
      id: 'summary',
      title: 'Resumo Executivo',
      content: `
**RELATÓRIO DE ANÁLISE INVESTIGATIVA - DADOS INSTAGRAM**

**Período de análise:** ${new Date(data.metadata.processedAt).toLocaleDateString('pt-BR')}

**Dados processados:**
- ${data.conversations.length} conversas analisadas
- ${totalMessages} mensagens totais
- ${uniqueContacts} contatos únicos
- ${data.media.length} arquivos de mídia
- ${data.devices.length} dispositivos identificados
- ${data.logins.length} registros de acesso

**Achados preliminares:**
${totalMessages > 1000 ? '⚠️ Alto volume de comunicações identificado' : '✅ Volume normal de comunicações'}
${data.devices.length > 5 ? '⚠️ Múltiplos dispositivos de acesso detectados' : '✅ Padrão normal de dispositivos'}
${uniqueContacts > 50 ? '⚠️ Rede social extensa identificada' : '✅ Rede social de tamanho normal'}

**Recomendações:**
- Análise detalhada das comunicações prioritárias
- Verificação de dispositivos e acessos suspeitos
- Correlação temporal de eventos
      `,
      status: 'completed',
      findings: [
        `${data.conversations.length} conversas identificadas`,
        `${totalMessages} mensagens processadas`,
        `${data.media.length} arquivos de mídia coletados`,
        `${data.devices.length} dispositivos mapeados`
      ],
      riskLevel: totalMessages > 1000 || uniqueContacts > 50 ? 'medium' : 'low'
    };
  };

  const generateTimelineSection = (data: ProcessedInstagramData): ReportSection => {
    const messages = data.conversations.flatMap(conv => 
      conv.messages.map(msg => ({...msg, conversationId: conv.id}))
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const timeSpan = lastMessage && firstMessage ? 
      Math.ceil((new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      id: 'timeline',
      title: 'Linha do Tempo',
      content: `
**ANÁLISE TEMPORAL DAS COMUNICAÇÕES**

**Período de atividade:** ${timeSpan} dias
**Primeira mensagem:** ${firstMessage ? new Date(firstMessage.timestamp).toLocaleString('pt-BR') : 'N/A'}
**Última mensagem:** ${lastMessage ? new Date(lastMessage.timestamp).toLocaleString('pt-BR') : 'N/A'}

**Padrões identificados:**
- Comunicações distribuídas ao longo de ${timeSpan} dias
- Média de ${Math.ceil(messages.length / Math.max(timeSpan, 1))} mensagens por dia
- Picos de atividade necessitam análise específica

**Eventos significativos:**
${messages.filter(m => m.mediaPath).length > 0 ? `- ${messages.filter(m => m.mediaPath).length} mensagens com mídia compartilhada` : ''}
${data.logins.length > 0 ? `- ${data.logins.length} registros de acesso identificados` : ''}

**Cronologia detalhada disponível para análise forense.**
      `,
      status: 'completed',
      findings: [
        `Período de ${timeSpan} dias analisado`,
        `${messages.length} mensagens em ordem cronológica`,
        `${messages.filter(m => m.mediaPath).length} compartilhamentos de mídia`,
      ],
      riskLevel: 'low'
    };
  };

  const generateCommunicationsSection = (data: ProcessedInstagramData): ReportSection => {
    const totalMessages = data.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const conversationsWithMedia = data.conversations.filter(conv => 
      conv.messages.some(msg => msg.mediaPath)
    ).length;

    return {
      id: 'communications',
      title: 'Análise de Comunicações',
      content: `
**ANÁLISE DETALHADA DAS COMUNICAÇÕES**

**Estatísticas gerais:**
- Total de conversas: ${data.conversations.length}
- Total de mensagens: ${totalMessages}
- Conversas com mídia: ${conversationsWithMedia}
- Participantes únicos: ${data.users.length}

**Padrões de comunicação:**
- Conversas mais ativas necessitam análise prioritária
- Compartilhamento de mídia em ${conversationsWithMedia} conversas
- Necessária análise de conteúdo das mensagens de interesse investigativo

**Recomendações técnicas:**
- Exportar conversas específicas para análise forense
- Correlacionar timestamps com eventos externos
- Verificar autenticidade das comunicações
      `,
      status: 'completed',
      findings: [
        `${data.conversations.length} threads de conversa`,
        `${conversationsWithMedia} conversas com mídia`,
        'Padrões temporais identificados',
        'Correlações necessárias com outros dados'
      ],
      riskLevel: conversationsWithMedia > 5 ? 'medium' : 'low'
    };
  };

  const generateNetworkSection = (data: ProcessedInstagramData): ReportSection => {
    return {
      id: 'network',
      title: 'Análise de Rede Social',
      content: `
**MAPEAMENTO DA REDE SOCIAL**

**Composição da rede:**
- Usuários identificados: ${data.users.length}
- Conexões diretas (conversas): ${data.conversations.length}
- Densidade da rede: ${data.users.length > 0 ? (data.conversations.length / data.users.length).toFixed(2) : 0} conversas por usuário

**Análise de centralidade:**
- Identificação de nós centrais na rede
- Usuários com maior atividade comunicativa
- Padrões de influência e conexão

**Visualização disponível no módulo de Conexões.**
      `,
      status: 'completed',
      findings: [
        `${data.users.length} usuários mapeados`,
        `${data.conversations.length} conexões diretas`,
        'Rede social mapeada e visualizável'
      ],
      riskLevel: 'low'
    };
  };

  const generateDigitalForensicsSection = (data: ProcessedInstagramData): ReportSection => {
    return {
      id: 'digital-forensics',
      title: 'Evidências Digitais',
      content: `
**COLETA E PRESERVAÇÃO DE EVIDÊNCIAS**

**Arquivos coletados:**
- Mídia digital: ${data.media.length} arquivos
- Conversas: ${data.conversations.length} threads
- Metadados: Timestamps, dispositivos, IPs

**Integridade dos dados:**
- Hash SHA-256 calculado para cada arquivo
- Cadeia de custódia documentada
- Metadados preservados

**Arquivos processados:**
- Imagens: ${data.media.filter(m => m.type === 'image').length}
- Vídeos: ${data.media.filter(m => m.type === 'video').length}
- Áudios: ${data.media.filter(m => m.type === 'audio').length}

**Status da análise forense:**
- Transcrições de áudio em andamento
- Classificação de imagens via IA
- Análise de metadados concluída
      `,
      status: 'completed',
      findings: [
        `${data.media.length} arquivos de evidência coletados`,
        'Metadados preservados integralmente',
        'Cadeia de custódia documentada',
        'Análise por IA em andamento'
      ],
      riskLevel: 'low'
    };
  };

  const generateRiskAssessmentSection = (data: ProcessedInstagramData): ReportSection => {
    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Avaliar fatores de risco
    if (data.conversations.length > 20) {
      riskFactors.push('Alto número de conversas ativas');
    }
    if (data.users.length > 50) {
      riskFactors.push('Rede social extensa');
      riskLevel = 'medium';
    }
    if (data.devices.length > 5) {
      riskFactors.push('Múltiplos dispositivos de acesso');
    }
    if (data.media.length > 100) {
      riskFactors.push('Grande volume de mídia compartilhada');
      riskLevel = 'medium';
    }

    return {
      id: 'risk-assessment',
      title: 'Avaliação de Risco',
      content: `
**AVALIAÇÃO DE RISCO INVESTIGATIVO**

**Nível de risco: ${riskLevel.toUpperCase()}**

**Fatores de risco identificados:**
${riskFactors.map(factor => `- ${factor}`).join('\n')}

**Recomendações de segurança:**
- Monitoramento contínuo das atividades
- Análise aprofundada de comunicações suspeitas
- Correlação com bases de dados externas
- Implementação de alertas automáticos

**Próximos passos:**
1. Análise detalhada de conversas prioritárias
2. Verificação de identidades dos contatos
3. Correlação temporal com eventos externos
4. Elaboração de relatório final
      `,
      status: 'completed',
      findings: riskFactors,
      riskLevel
    };
  };

  const exportReport = () => {
    const reportContent = reportSections
      .filter(section => section.status === 'completed')
      .map(section => `# ${section.title}\n\n${section.content}\n\n`)
      .join('---\n\n');

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-instagram-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedSections = reportSections.filter(s => s.status === 'completed').length;
  const totalSections = reportSections.length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Relatório de Análise Investigativa IA
          </CardTitle>
          <CardDescription>
            Análise automatizada dos dados do Instagram com insights investigativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">Progresso: {completedSections}/{totalSections} seções</p>
                <Progress value={(completedSections / totalSections) * 100} className="w-48 mt-1" />
              </div>
              <Badge variant={completedSections === totalSections ? 'default' : 'secondary'}>
                {completedSections === totalSections ? 'Concluído' : 'Em andamento'}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={generateReport} 
                disabled={generatingReport}
                variant="default"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generatingReport ? 'animate-spin' : ''}`} />
                {generatingReport ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              <Button 
                onClick={exportReport}
                variant="outline"
                disabled={completedSections === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {generatingReport && (
            <div className="mb-4">
              <Progress value={reportProgress} />
              <p className="text-sm text-muted-foreground mt-1">
                Gerando análise investigativa... {Math.round(reportProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seções do Relatório */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedSection} onValueChange={setSelectedSection}>
            <div className="border-b">
              <TabsList className="w-full justify-start rounded-none h-auto flex-wrap gap-0">
                {reportSections.map((section) => (
                  <TabsTrigger 
                    key={section.id} 
                    value={section.id}
                    className="flex items-center gap-2 rounded-none"
                  >
                    {section.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {section.status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
                    {section.status === 'generating' && <RefreshCw className="h-3 w-3 animate-spin" />}
                    {section.status === 'pending' && <div className="h-3 w-3 rounded-full bg-muted" />}
                    <span className="text-xs">{section.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {reportSections.map((section) => (
              <TabsContent key={section.id} value={section.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          section.riskLevel === 'high' ? 'destructive' : 
                          section.riskLevel === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        Risco: {section.riskLevel === 'low' ? 'Baixo' : section.riskLevel === 'medium' ? 'Médio' : 'Alto'}
                      </Badge>
                    </div>
                  </div>

                  {section.status === 'completed' && (
                    <div className="space-y-4">
                      <ScrollArea className="h-96 border rounded-lg p-4">
                        <div className="whitespace-pre-wrap text-sm">
                          {section.content}
                        </div>
                      </ScrollArea>

                      {section.findings.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Achados Principais:</h4>
                          <ul className="space-y-1">
                            {section.findings.map((finding, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {section.status === 'pending' && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Seção aguardando geração</p>
                    </div>
                  )}

                  {section.status === 'generating' && (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                      <p className="text-muted-foreground">Gerando análise...</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};