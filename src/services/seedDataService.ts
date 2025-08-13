// Seed data service for demonstration purposes
import { toast } from 'sonner';

interface SeedCase {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// Seed data for cases
const SEED_CASES: SeedCase[] = [
  {
    id: 'seed-001',
    title: 'Investigação Financeira - Lavagem de Dinheiro',
    description: 'Análise de transações suspeitas em contas bancárias relacionadas a atividades ilícitas de uma organização criminosa.',
    status: 'active',
    priority: 'high',
    assignedTo: 'Detetive João Silva',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    tags: ['financeiro', 'lavagem', 'urgente']
  },
  {
    id: 'seed-002',
    title: 'Análise de Vínculos - Organização Criminosa',
    description: 'Mapeamento de relacionamentos entre suspeitos em investigação de tráfico de drogas na região metropolitana.',
    status: 'review',
    priority: 'medium',
    assignedTo: 'Analista Maria Santos',
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
    tags: ['vínculos', 'tráfico', 'análise']
  },
  {
    id: 'seed-003',
    title: 'Perícia Digital - Dispositivos Apreendidos',
    description: 'Análise forense de smartphones e computadores apreendidos em operação policial contra fraudes eletrônicas.',
    status: 'completed',
    priority: 'high',
    assignedTo: 'Perito Carlos Lima',
    createdAt: '2024-01-05T11:20:00Z',
    updatedAt: '2024-01-12T13:10:00Z',
    tags: ['digital', 'perícia', 'dispositivos']
  },
  {
    id: 'seed-004',
    title: 'Caso de Sequestro - Análise de Comunicações',
    description: 'Investigação de caso de sequestro com análise de áudios de negociação e imagens de câmeras de segurança.',
    status: 'active',
    priority: 'critical',
    assignedTo: 'Equipe Especial',
    createdAt: '2024-01-22T08:00:00Z',
    updatedAt: '2024-01-23T12:00:00Z',
    tags: ['sequestro', 'urgente', 'comunicações']
  }
];

// Generate sample occurrence analysis for a case
const generateSampleOccurrenceAnalysis = (caseId: string, caseTitle: string): any => {
  return {
    caseId,
    filename: `Boletim_Ocorrencia_${caseId}.pdf`,
    content: `Boletim de Ocorrência\nCaso: ${caseTitle}\nData: ${new Date().toLocaleDateString()}\n\nDescrição dos fatos...\nPartes envolvidas...\nEvidências coletadas...`,
    analysis: `# Análise de Ocorrência - ${caseTitle}\n\n## Resumo do Incidente\nEste caso apresenta características complexas que requerem análise detalhada.\n\n## Dados da Vítima\n- Identificação em andamento\n- Depoimentos coletados\n\n## Dados do Suspeito\n- Perfil em construção\n- Antecedentes sendo verificados\n\n## Descrição Detalhada dos Fatos\nOs fatos indicam um padrão específico de comportamento criminal.\n\n## Sugestões para Investigação\n1. Ampliar coleta de evidências\n2. Realizar oitivas complementares\n3. Solicitar análises técnicas especializadas\n\n## Classificação Penal Sugerida\nClassificação pendente de análise jurídica complementar.`,
    dateProcessed: new Date().toISOString()
  };
};

// Generate sample image analysis
const generateSampleImageAnalysis = (caseId: string): any => {
  return {
    caseId,
    filename: `Evidencia_Imagem_${Date.now()}.jpg`,
    dataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbWFnZW0gZGUgRXhhbXBsbzwvdGV4dD48L3N2Zz4=',
    ocrText: 'Texto extraído da imagem: Placa ABC-1234, Documento identificação',
    faces: [
      { id: 1, confidence: 0.85, region: { x: 100, y: 50, width: 80, height: 100 } }
    ],
    licensePlates: ['ABC-1234'],
    enhancementTechnique: 'Melhoria de contraste e nitidez aplicada',
    dateProcessed: new Date().toISOString()
  };
};

// Generate sample audio analysis
const generateSampleAudioAnalysis = (caseId: string): any => {
  return {
    caseId,
    filename: `Audio_Interceptacao_${Date.now()}.mp3`,
    transcription: 'Transcrição do áudio: Conversa entre dois indivíduos discutindo detalhes de uma operação. Falante 1: "O encontro será às 14h no local combinado." Falante 2: "Entendido, levarei o material solicitado."',
    speakerData: JSON.stringify([
      { speaker: 'Falante 1', start: 0, end: 10, text: 'O encontro será às 14h no local combinado.' },
      { speaker: 'Falante 2', start: 11, end: 18, text: 'Entendido, levarei o material solicitado.' }
    ]),
    dateProcessed: new Date().toISOString()
  };
};

// Generate sample virtual agents
const generateSampleAgents = (): any[] => {
  return [
    {
      id: 'agent-001',
      name: 'Analisador de Casos',
      objective: 'Analisar evidências e gerar resumos executivos de casos',
      functions: ['analyzeCase', 'generateSummary'],
      dataSources: ['cases', 'reports'],
      securityRules: { scope: 'case', roles: ['analyst', 'admin'] },
      executionFrequency: 'manual',
      connectors: {
        canva: { enabled: true, template: 'report-template' },
        webhook: { enabled: false, url: '' }
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'agent-002',
      name: 'Gerador de Relatórios Visuais',
      objective: 'Criar apresentações visuais para relatórios de investigação',
      functions: ['generateVisualReport', 'createPresentation'],
      dataSources: ['reports', 'images'],
      securityRules: { scope: 'case', roles: ['admin'] },
      executionFrequency: 'weekly',
      connectors: {
        canva: { enabled: true, template: 'presentation-template' },
        webhook: { enabled: true, url: 'https://api.example.com/webhook' }
      },
      createdAt: new Date().toISOString()
    }
  ];
};

// Load seed data
export const loadSeedData = () => {
  try {
    // Load cases
    const existingCases = localStorage.getItem('securai-cases');
    if (!existingCases) {
      localStorage.setItem('securai-cases', JSON.stringify(SEED_CASES));
      console.log('Seed cases loaded');
    }

    // Load sample data for each case
    SEED_CASES.forEach(seedCase => {
      // Occurrence analysis
      const occurrenceKey = `occurrence-analysis-${seedCase.id}`;
      if (!localStorage.getItem(occurrenceKey)) {
        const sampleAnalysis = generateSampleOccurrenceAnalysis(seedCase.id, seedCase.title);
        localStorage.setItem(occurrenceKey, JSON.stringify([sampleAnalysis]));
      }

      // Image analysis
      const imageKey = `image-analysis-${seedCase.id}`;
      if (!localStorage.getItem(imageKey)) {
        const sampleImage = generateSampleImageAnalysis(seedCase.id);
        localStorage.setItem(imageKey, JSON.stringify([sampleImage]));
      }

      // Audio analysis
      const audioKey = `audio-transcription-${seedCase.id}`;
      if (!localStorage.getItem(audioKey)) {
        const sampleAudio = generateSampleAudioAnalysis(seedCase.id);
        localStorage.setItem(audioKey, JSON.stringify([sampleAudio]));
      }
    });

    // Load virtual agents
    const existingAgents = localStorage.getItem('virtual-agents');
    if (!existingAgents) {
      const sampleAgents = generateSampleAgents();
      localStorage.setItem('virtual-agents', JSON.stringify(sampleAgents));
      console.log('Seed virtual agents loaded');
    }

    toast.success('Dados de exemplo carregados com sucesso');
    return true;
  } catch (error) {
    console.error('Error loading seed data:', error);
    toast.error('Erro ao carregar dados de exemplo');
    return false;
  }
};

// Clear all data
export const clearAllData = () => {
  try {
    const keys = [
      'securai-cases',
      'virtual-agents',
      'securai-api-settings'
    ];
    
    // Clear case-specific data
    const allKeys = Object.keys(localStorage);
    const dataKeys = allKeys.filter(key => 
      key.startsWith('occurrence-analysis-') ||
      key.startsWith('image-analysis-') ||
      key.startsWith('audio-transcription-') ||
      key.startsWith('case-')
    );
    
    [...keys, ...dataKeys].forEach(key => {
      localStorage.removeItem(key);
    });

    toast.success('Todos os dados foram limpos');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    toast.error('Erro ao limpar dados');
    return false;
  }
};

export default {
  loadSeedData,
  clearAllData
};