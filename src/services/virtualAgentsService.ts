// Virtual Agents Service
// Manages virtual agents for automated case analysis and reporting

import { createDesignFromTemplate, exportCanvaDesign, listCanvaTemplates } from './canvaService';
import { makeGroqAIRequest } from './groqService';

export interface VirtualAgent {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  lastExecution: string;
  executionCount: number;
  connectors: AgentConnector[];
  functions: AgentFunction[];
  schedule?: AgentSchedule;
  scope: AgentScope;
  securityRules: AgentSecurityRule[];
}

export interface AgentConnector {
  type: 'canva' | 'webhook' | 'email' | 'database';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface AgentFunction {
  type: 'analyze_case' | 'generate_summary' | 'generate_visual_report' | 'send_notification' | 'monitor_evidence' | 'analyze_links';
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface AgentSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6, Sunday to Saturday
  dayOfMonth?: number; // 1-31
}

export interface AgentScope {
  caseIds: string[];
  reportTypes: string[];
  dataTypes: string[];
}

export interface AgentSecurityRule {
  type: 'data_access' | 'export_permission' | 'user_role' | 'time_restriction';
  rule: string;
  value: any;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  logs: AgentLog[];
  outputs: AgentOutput[];
  metrics: AgentMetrics;
}

export interface AgentLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: any;
}

export interface AgentOutput {
  type: 'text' | 'file' | 'url' | 'data';
  name: string;
  content: any;
  metadata?: Record<string, any>;
}

export interface AgentMetrics {
  executionTime: number; // in milliseconds
  tokensUsed?: number;
  apiCallsCount: number;
  dataProcessed: number; // in bytes
}

// Storage keys
const AGENTS_STORAGE_KEY = 'securai-virtual-agents';
const EXECUTIONS_STORAGE_KEY = 'securai-agent-executions';

// Get all virtual agents
export const getVirtualAgents = (): VirtualAgent[] => {
  try {
    const agents = localStorage.getItem(AGENTS_STORAGE_KEY);
    return agents ? JSON.parse(agents) : getDefaultAgents();
  } catch (error) {
    console.error('Error getting virtual agents:', error);
    return getDefaultAgents();
  }
};

// Get default agents for demonstration
const getDefaultAgents = (): VirtualAgent[] => [
  {
    id: 'agent-weekly-summary',
    name: 'Resumo de Caso Semanal',
    objective: 'Gerar apresentação visual semanal dos principais insights do caso',
    status: 'active',
    lastExecution: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    executionCount: 12,
    connectors: [
      {
        type: 'canva',
        name: 'Canva Integration',
        config: { templateId: 'template-3' },
        enabled: true
      },
      {
        type: 'email',
        name: 'Email Notifications',
        config: { recipients: ['investigator@securai.com'] },
        enabled: true
      }
    ],
    functions: [
      {
        type: 'analyze_case',
        name: 'Analisar Caso',
        description: 'Analisa todos os dados do caso',
        parameters: { includeStatistics: true },
        enabled: true
      },
      {
        type: 'generate_visual_report',
        name: 'Gerar Relatório Visual',
        description: 'Cria apresentação no Canva',
        parameters: { format: 'presentation' },
        enabled: true
      },
      {
        type: 'send_notification',
        name: 'Enviar Notificação',
        description: 'Envia resumo por email',
        parameters: { includeAttachment: true },
        enabled: true
      }
    ],
    schedule: {
      type: 'weekly',
      dayOfWeek: 1, // Monday
      time: '09:00'
    },
    scope: {
      caseIds: ['*'], // All cases
      reportTypes: ['summary', 'statistics'],
      dataTypes: ['occurrences', 'images', 'audio']
    },
    securityRules: [
      {
        type: 'user_role',
        rule: 'minimum_role',
        value: 'analyst'
      }
    ]
  },
  {
    id: 'agent-links-visualization',
    name: 'Relatório Visual de Vínculos',
    objective: 'Converter análises de vínculos em apresentações visuais',
    status: 'inactive',
    lastExecution: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    executionCount: 5,
    connectors: [
      {
        type: 'canva',
        name: 'Canva Integration',
        config: { templateId: 'template-4' },
        enabled: true
      }
    ],
    functions: [
      {
        type: 'analyze_links',
        name: 'Analisar Vínculos',
        description: 'Processa dados de relacionamentos',
        parameters: { includeGraphs: true },
        enabled: true
      },
      {
        type: 'generate_visual_report',
        name: 'Gerar Apresentação',
        description: 'Cria slides visuais dos vínculos',
        parameters: { format: 'infographic' },
        enabled: true
      }
    ],
    schedule: {
      type: 'manual'
    },
    scope: {
      caseIds: ['*'],
      reportTypes: ['links', 'relationships'],
      dataTypes: ['link_analysis']
    },
    securityRules: []
  }
];

// Save virtual agents
export const saveVirtualAgents = (agents: VirtualAgent[]): void => {
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (error) {
    console.error('Error saving virtual agents:', error);
  }
};

// Create new virtual agent
export const createVirtualAgent = (agentData: Omit<VirtualAgent, 'id' | 'lastExecution' | 'executionCount'>): VirtualAgent => {
  const newAgent: VirtualAgent = {
    ...agentData,
    id: `agent-${Date.now()}`,
    lastExecution: new Date().toISOString(),
    executionCount: 0
  };

  const agents = getVirtualAgents();
  agents.push(newAgent);
  saveVirtualAgents(agents);

  return newAgent;
};

// Update virtual agent
export const updateVirtualAgent = (agentId: string, updates: Partial<VirtualAgent>): VirtualAgent | null => {
  const agents = getVirtualAgents();
  const agentIndex = agents.findIndex(a => a.id === agentId);

  if (agentIndex === -1) {
    return null;
  }

  agents[agentIndex] = { ...agents[agentIndex], ...updates };
  saveVirtualAgents(agents);

  return agents[agentIndex];
};

// Delete virtual agent
export const deleteVirtualAgent = (agentId: string): boolean => {
  const agents = getVirtualAgents();
  const filteredAgents = agents.filter(a => a.id !== agentId);

  if (filteredAgents.length === agents.length) {
    return false; // Agent not found
  }

  saveVirtualAgents(filteredAgents);
  return true;
};

// Execute virtual agent
export const executeVirtualAgent = async (agentId: string, caseData?: any): Promise<AgentExecution> => {
  const agents = getVirtualAgents();
  const agent = agents.find(a => a.id === agentId);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const execution: AgentExecution = {
    id: `execution-${Date.now()}`,
    agentId,
    status: 'running',
    startTime: new Date().toISOString(),
    logs: [],
    outputs: [],
    metrics: {
      executionTime: 0,
      apiCallsCount: 0,
      dataProcessed: 0
    }
  };

  try {
    // Update agent status
    await updateVirtualAgent(agentId, { status: 'running' });

    // Add start log
    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting execution of agent: ${agent.name}`
    });

    // Execute agent functions
    for (const func of agent.functions.filter(f => f.enabled)) {
      await executeAgentFunction(func, agent, execution, caseData);
    }

    // Mark as completed
    execution.status = 'completed';
    execution.endTime = new Date().toISOString();
    execution.metrics.executionTime = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();

    // Update agent status and execution count
    await updateVirtualAgent(agentId, { 
      status: 'active',
      lastExecution: execution.endTime,
      executionCount: agent.executionCount + 1
    });

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Agent execution completed successfully`
    });

  } catch (error) {
    execution.status = 'failed';
    execution.endTime = new Date().toISOString();
    execution.metrics.executionTime = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });

    // Update agent status
    await updateVirtualAgent(agentId, { status: 'error' });

    throw error;
  }

  // Save execution
  saveAgentExecution(execution);

  return execution;
};

// Execute individual agent function
const executeAgentFunction = async (
  func: AgentFunction,
  agent: VirtualAgent,
  execution: AgentExecution,
  caseData?: any
): Promise<void> => {
  execution.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Executing function: ${func.name}`
  });

  switch (func.type) {
    case 'analyze_case':
      await executeAnalyzeCaseFunction(func, agent, execution, caseData);
      break;
    case 'generate_summary':
      await executeGenerateSummaryFunction(func, agent, execution, caseData);
      break;
    case 'generate_visual_report':
      await executeGenerateVisualReportFunction(func, agent, execution, caseData);
      break;
    case 'send_notification':
      await executeSendNotificationFunction(func, agent, execution, caseData);
      break;
    default:
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'warning',
        message: `Unknown function type: ${func.type}`
      });
  }
};

// Function implementations
const executeAnalyzeCaseFunction = async (
  func: AgentFunction,
  agent: VirtualAgent,
  execution: AgentExecution,
  caseData?: any
): Promise<void> => {
  try {
    // Mock case analysis
    const analysis = {
      totalOccurrences: Math.floor(Math.random() * 20) + 1,
      totalImages: Math.floor(Math.random() * 15) + 1,
      totalAudios: Math.floor(Math.random() * 10) + 1,
      criminalPatterns: ['Fraud pattern detected', 'Recurring location identified'],
      sentiment: 'neutral',
      confidence: 0.85
    };

    execution.outputs.push({
      type: 'data',
      name: 'Case Analysis Results',
      content: analysis,
      metadata: { function: func.name }
    });

    execution.metrics.apiCallsCount += 1;
    execution.metrics.dataProcessed += JSON.stringify(analysis).length;

  } catch (error) {
    throw new Error(`Case analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const executeGenerateSummaryFunction = async (
  func: AgentFunction,
  agent: VirtualAgent,
  execution: AgentExecution,
  caseData?: any
): Promise<void> => {
  try {
    // Generate summary using AI
    const messages = [
      {
        role: "system",
        content: "You are an expert investigative analyst. Generate a concise summary of the case data provided."
      },
      {
        role: "user",
        content: `Generate a summary for case data: ${JSON.stringify(caseData || {})}`
      }
    ];

    const summary = await makeGroqAIRequest(messages, 1024);

    execution.outputs.push({
      type: 'text',
      name: 'Case Summary',
      content: summary,
      metadata: { function: func.name, tokens: summary.length }
    });

    execution.metrics.apiCallsCount += 1;
    execution.metrics.tokensUsed = (execution.metrics.tokensUsed || 0) + summary.length;

  } catch (error) {
    throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const executeGenerateVisualReportFunction = async (
  func: AgentFunction,
  agent: VirtualAgent,
  execution: AgentExecution,
  caseData?: any
): Promise<void> => {
  try {
    // Find Canva connector
    const canvaConnector = agent.connectors.find(c => c.type === 'canva' && c.enabled);
    if (!canvaConnector) {
      throw new Error('Canva connector not configured');
    }

    // Get template ID from connector config
    const templateId = canvaConnector.config.templateId || 'template-1';

    // Prepare data for design
    const designData = {
      caseTitle: caseData?.title || 'Análise de Caso',
      analysisDate: new Date().toLocaleDateString('pt-BR'),
      summary: 'Resumo automatizado gerado pelo agente virtual',
      statistics: {
        occurrences: Math.floor(Math.random() * 20) + 1,
        images: Math.floor(Math.random() * 15) + 1,
        audios: Math.floor(Math.random() * 10) + 1
      }
    };

    // Create design in Canva
    const design = await createDesignFromTemplate(templateId, designData, `${agent.name} - ${new Date().toLocaleDateString('pt-BR')}`);

    execution.outputs.push({
      type: 'url',
      name: 'Canva Design',
      content: design.editUrl,
      metadata: { 
        function: func.name,
        designId: design.id,
        publishUrl: design.publishUrl
      }
    });

    // Export design as PDF
    const exportResult = await exportCanvaDesign(design.id, 'pdf');

    execution.outputs.push({
      type: 'file',
      name: 'Visual Report PDF',
      content: exportResult.downloadUrl,
      metadata: { 
        function: func.name,
        format: exportResult.format,
        designId: design.id
      }
    });

    execution.metrics.apiCallsCount += 2; // Create + Export

  } catch (error) {
    throw new Error(`Visual report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const executeSendNotificationFunction = async (
  func: AgentFunction,
  agent: VirtualAgent,
  execution: AgentExecution,
  caseData?: any
): Promise<void> => {
  try {
    // Find email connector
    const emailConnector = agent.connectors.find(c => c.type === 'email' && c.enabled);
    if (!emailConnector) {
      throw new Error('Email connector not configured');
    }

    // Mock email sending
    const notification = {
      to: emailConnector.config.recipients || ['admin@securai.com'],
      subject: `${agent.name} - Execução Concluída`,
      body: `O agente \"${agent.name}\" foi executado com sucesso.\\\n\\\nResumo:\\\n- ${execution.outputs.length} outputs gerados\\\n- Tempo de execução: ${execution.metrics.executionTime}ms`,
      attachments: execution.outputs.filter(o => o.type === 'file').map(o => o.content)
    };

    execution.outputs.push({
      type: 'data',
      name: 'Email Notification',
      content: notification,
      metadata: { function: func.name, sent: true }
    });

    execution.metrics.apiCallsCount += 1;

  } catch (error) {
    throw new Error(`Notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Save agent execution
const saveAgentExecution = (execution: AgentExecution): void => {
  try {
    const executions = getAgentExecutions();
    executions.push(execution);
    
    // Keep only last 100 executions
    const trimmedExecutions = executions.slice(-100);
    
    localStorage.setItem(EXECUTIONS_STORAGE_KEY, JSON.stringify(trimmedExecutions));
  } catch (error) {
    console.error('Error saving agent execution:', error);
  }
};

// Get agent executions
export const getAgentExecutions = (agentId?: string): AgentExecution[] => {
  try {
    const executions = localStorage.getItem(EXECUTIONS_STORAGE_KEY);
    const allExecutions: AgentExecution[] = executions ? JSON.parse(executions) : [];
    
    if (agentId) {
      return allExecutions.filter(e => e.agentId === agentId);
    }
    
    return allExecutions;
  } catch (error) {
    console.error('Error getting agent executions:', error);
    return [];
  }
};

// Default export
export default {
  getVirtualAgents,
  saveVirtualAgents,
  createVirtualAgent,
  updateVirtualAgent,
  deleteVirtualAgent,
  executeVirtualAgent,
  getAgentExecutions
};
