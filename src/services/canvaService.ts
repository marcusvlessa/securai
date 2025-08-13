// Canva API Service for Virtual Agents Integration
// This service handles communication with Canva API for automated design generation

export interface CanvaSettings {
  apiKey: string;
  apiEndpoint: string;
  brandKitId?: string;
  defaultTemplateId?: string;
}

export interface CanvaTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
}

export interface CanvaDesign {
  id: string;
  name: string;
  thumbnail: string;
  editUrl: string;
  publishUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvaExportResult {
  url: string;
  format: 'pdf' | 'png' | 'jpg';
  downloadUrl: string;
}

// Storage key for Canva API settings
const CANVA_STORAGE_KEY = 'securai-canva-settings';

// Default Canva settings
const DEFAULT_CANVA_SETTINGS: CanvaSettings = {
  apiKey: '',
  apiEndpoint: 'https://api.canva.com/rest/v1',
  brandKitId: '',
  defaultTemplateId: ''
};

// Get Canva API settings from localStorage
export const getCanvaSettings = (): CanvaSettings => {
  try {
    const storedSettings = localStorage.getItem(CANVA_STORAGE_KEY);
    if (storedSettings) {
      return { ...DEFAULT_CANVA_SETTINGS, ...JSON.parse(storedSettings) };
    }
    return DEFAULT_CANVA_SETTINGS;
  } catch (error) {
    console.error('Error getting Canva settings:', error);
    return DEFAULT_CANVA_SETTINGS;
  }
};

// Save Canva API settings to localStorage
export const saveCanvaSettings = (settings: Partial<CanvaSettings>): void => {
  try {
    const currentSettings = getCanvaSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Trim API key
    if (updatedSettings.apiKey) {
      updatedSettings.apiKey = updatedSettings.apiKey.trim();
    }
    
    localStorage.setItem(CANVA_STORAGE_KEY, JSON.stringify(updatedSettings));
    console.log('Canva settings saved successfully');
  } catch (error) {
    console.error('Error saving Canva settings:', error);
  }
};

// Check if Canva API key is configured
export const hasValidCanvaApiKey = (): boolean => {
  const settings = getCanvaSettings();
  return !!settings.apiKey && settings.apiKey.trim() !== '';
};

// Authenticate with Canva (OAuth flow)
export const authenticateCanva = async (): Promise<{ authUrl: string }> => {
  try {
    const settings = getCanvaSettings();
    
    if (!settings.apiKey) {
      throw new Error('Canva API key not configured');
    }

    // Mock OAuth URL - In real implementation, this would initiate OAuth flow
    const authUrl = `https://www.canva.com/api/oauth/authorize?client_id=${settings.apiKey}&response_type=code&scope=design:read design:write folder:read folder:write`;
    
    return { authUrl };
  } catch (error) {
    console.error('Error authenticating with Canva:', error);
    throw error;
  }
};

// List available templates
export const listCanvaTemplates = async (category?: string): Promise<CanvaTemplate[]> => {
  try {
    const settings = getCanvaSettings();
    
    if (!hasValidCanvaApiKey()) {
      throw new Error('Canva API key not configured');
    }

    // Mock data for demonstration - Replace with actual API call
    const mockTemplates: CanvaTemplate[] = [
      {
        id: 'template-1',
        name: 'Relatório de Investigação',
        description: 'Template profissional para relatórios investigativos',
        thumbnail: '/api/placeholder/300/200',
        category: 'reports'
      },
      {
        id: 'template-2',
        name: 'Apresentação de Caso',
        description: 'Template para apresentações de casos criminais',
        thumbnail: '/api/placeholder/300/200',
        category: 'presentations'
      },
      {
        id: 'template-3',
        name: 'Resumo Executivo',
        description: 'Template para resumos executivos semanais',
        thumbnail: '/api/placeholder/300/200',
        category: 'summaries'
      },
      {
        id: 'template-4',
        name: 'Análise de Vínculos',
        description: 'Template visual para análise de relacionamentos',
        thumbnail: '/api/placeholder/300/200',
        category: 'analytics'
      }
    ];

    // Filter by category if provided
    if (category) {
      return mockTemplates.filter(template => template.category === category);
    }

    return mockTemplates;
  } catch (error) {
    console.error('Error listing Canva templates:', error);
    throw error;
  }
};

// Create design from template with data
export const createDesignFromTemplate = async (
  templateId: string,
  data: Record<string, any>,
  designName?: string
): Promise<CanvaDesign> => {
  try {
    const settings = getCanvaSettings();
    
    if (!hasValidCanvaApiKey()) {
      throw new Error('Canva API key not configured');
    }

    console.log('Creating design from template:', templateId, 'with data:', data);

    // Mock design creation - Replace with actual API call
    const mockDesign: CanvaDesign = {
      id: `design-${Date.now()}`,
      name: designName || `Design from ${templateId}`,
      thumbnail: '/api/placeholder/400/300',
      editUrl: `https://www.canva.com/design/mock-design-id/edit`,
      publishUrl: `https://www.canva.com/design/mock-design-id/view`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In real implementation, this would:
    // 1. Call Canva API to create design from template
    // 2. Replace placeholders with actual data
    // 3. Return the created design information

    return mockDesign;
  } catch (error) {
    console.error('Error creating design from template:', error);
    throw error;
  }
};

// Export design in specified format
export const exportCanvaDesign = async (
  designId: string,
  format: 'pdf' | 'png' | 'jpg' = 'pdf'
): Promise<CanvaExportResult> => {
  try {
    const settings = getCanvaSettings();
    
    if (!hasValidCanvaApiKey()) {
      throw new Error('Canva API key not configured');
    }

    console.log('Exporting design:', designId, 'in format:', format);

    // Mock export - Replace with actual API call
    const mockExport: CanvaExportResult = {
      url: `https://export.canva.com/designs/${designId}.${format}`,
      format,
      downloadUrl: `https://export.canva.com/downloads/${designId}.${format}`
    };

    // In real implementation, this would:
    // 1. Call Canva API to export design
    // 2. Wait for export to complete
    // 3. Return download URLs

    return mockExport;
  } catch (error) {
    console.error('Error exporting Canva design:', error);
    throw error;
  }
};

// Get design information
export const getCanvaDesign = async (designId: string): Promise<CanvaDesign> => {
  try {
    const settings = getCanvaSettings();
    
    if (!hasValidCanvaApiKey()) {
      throw new Error('Canva API key not configured');
    }

    // Mock design info - Replace with actual API call
    const mockDesign: CanvaDesign = {
      id: designId,
      name: `Design ${designId}`,
      thumbnail: '/api/placeholder/400/300',
      editUrl: `https://www.canva.com/design/${designId}/edit`,
      publishUrl: `https://www.canva.com/design/${designId}/view`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return mockDesign;
  } catch (error) {
    console.error('Error getting Canva design:', error);
    throw error;
  }
};

// Default export
export default {
  getCanvaSettings,
  saveCanvaSettings,
  hasValidCanvaApiKey,
  authenticateCanva,
  listCanvaTemplates,
  createDesignFromTemplate,
  exportCanvaDesign,
  getCanvaDesign
};