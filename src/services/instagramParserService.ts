import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';

export interface InstagramUser {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  conversations: string[];
  posts: number;
  followers?: number;
  following?: number;
}

export interface InstagramMessage {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'audio' | 'link';
  mediaPath?: string;
  reactions?: any[];
}

export interface InstagramConversation {
  id: string;
  participants: string[];
  title?: string;
  messages: InstagramMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export interface InstagramMedia {
  id: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
  path: string;
  blob: Blob;
  metadata?: any;
  associatedMessageId?: string;
  transcript?: string; // Para áudios transcritos
  classification?: string; // Para imagens classificadas
}

export interface ProcessedInstagramData {
  id: string;
  users: InstagramUser[];
  conversations: InstagramConversation[];
  media: InstagramMedia[];
  metadata: {
    processedAt: Date;
    originalFilename: string;
    totalFiles: number;
    htmlContent?: string;
  };
}

export class InstagramParserService {
  private static instance: InstagramParserService;

  static getInstance(): InstagramParserService {
    if (!InstagramParserService.instance) {
      InstagramParserService.instance = new InstagramParserService();
    }
    return InstagramParserService.instance;
  }

  async processZipFile(
    file: File,
    onProgress?: (step: string, progress: number) => void
  ): Promise<ProcessedInstagramData> {
    const zip = new JSZip();
    
    try {
      onProgress?.('Carregando arquivo ZIP...', 0);
      const zipContent = await zip.loadAsync(file);
      
      onProgress?.('Procurando arquivos principais...', 10);
      
      // Procurar pelo arquivo HTML principal
      const htmlFile = this.findMainHtmlFile(zipContent);
      if (!htmlFile) {
        throw new Error('Arquivo records.html não encontrado no ZIP');
      }
      
      onProgress?.('Extraindo HTML...', 20);
      const htmlContent = await htmlFile.async('text');
      
      onProgress?.('Extraindo mídias...', 30);
      const mediaFiles = await this.extractMediaFiles(zipContent);
      
      onProgress?.('Analisando HTML...', 50);
      const parsedData = await this.parseHtmlContent(htmlContent, mediaFiles);
      
      onProgress?.('Organizando dados...', 70);
      const organizedData = this.organizeData(parsedData, mediaFiles);
      
      onProgress?.('Processando mídias...', 80);
      await this.processMediaFiles(organizedData.media);
      
      onProgress?.('Finalizando...', 90);
      
      return {
        id: uuidv4(),
        ...organizedData,
        metadata: {
          processedAt: new Date(),
          originalFilename: file.name,
          totalFiles: Object.keys(zipContent.files).length,
          htmlContent: htmlContent.substring(0, 1000) // Primeiros 1000 chars para preview
        }
      };
      
    } catch (error) {
      console.error('Erro ao processar ZIP:', error);
      throw new Error(`Falha ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private findMainHtmlFile(zipContent: JSZip): JSZip.JSZipObject | null {
    // Procurar por records.html ou index.html
    const possibleNames = ['records.html', 'index.html', 'instagram_data.html'];
    
    for (const name of possibleNames) {
      const file = zipContent.file(name);
      if (file) return file;
    }
    
    // Procurar por qualquer arquivo HTML na raiz
    for (const [filename, file] of Object.entries(zipContent.files)) {
      if (filename.endsWith('.html') && !filename.includes('/')) {
        return file;
      }
    }
    
    return null;
  }

  private async extractMediaFiles(zipContent: JSZip): Promise<Map<string, Blob>> {
    const mediaFiles = new Map<string, Blob>();
    
    for (const [filename, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;
      
      // Verificar se é um arquivo de mídia
      if (this.isMediaFile(filename)) {
        try {
          const blob = await file.async('blob');
          // Usar o caminho relativo como chave
          const key = filename.replace(/^.*\//, ''); // Remove diretórios do caminho
          mediaFiles.set(key, blob);
          mediaFiles.set(filename, blob); // Também indexar pelo caminho completo
        } catch (error) {
          console.warn(`Erro ao extrair mídia ${filename}:`, error);
        }
      }
    }
    
    return mediaFiles;
  }

  private isMediaFile(filename: string): boolean {
    const mediaExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
      '.mp4', '.mov', '.avi', '.webm', '.mkv',
      '.mp3', '.wav', '.ogg', '.m4a', '.aac'
    ];
    
    const lowerFilename = filename.toLowerCase();
    return mediaExtensions.some(ext => lowerFilename.endsWith(ext));
  }

  private async parseHtmlContent(htmlContent: string, mediaFiles: Map<string, Blob>): Promise<any> {
    // Sanitizar o HTML
    const cleanHtml = DOMPurify.sanitize(htmlContent);
    
    // Criar um parser DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    
    // Extrair dados do HTML
    const conversations = this.extractConversations(doc, mediaFiles);
    const users = this.extractUsers(doc, conversations);
    
    return { conversations, users };
  }

  private extractConversations(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    
    // Procurar por seções de conversas - o formato pode variar
    const conversationSections = doc.querySelectorAll('[data-testid="conversation"], .conversation, .thread');
    
    conversationSections.forEach((section, index) => {
      try {
        const conversation = this.parseConversationSection(section, mediaFiles, index);
        if (conversation) {
          conversations.push(conversation);
        }
      } catch (error) {
        console.warn(`Erro ao processar conversa ${index}:`, error);
      }
    });
    
    // Se não encontrou conversas com seletores específicos, tentar método genérico
    if (conversations.length === 0) {
      const genericConversations = this.extractConversationsGeneric(doc, mediaFiles);
      conversations.push(...genericConversations);
    }
    
    return conversations;
  }

  private parseConversationSection(
    section: Element, 
    mediaFiles: Map<string, Blob>, 
    index: number
  ): InstagramConversation | null {
    const messages: InstagramMessage[] = [];
    const participants = new Set<string>();
    
    // Extrair mensagens
    const messageElements = section.querySelectorAll('.message, [data-testid="message"]');
    
    messageElements.forEach((msgEl, msgIndex) => {
      try {
        const message = this.parseMessage(msgEl, mediaFiles, `conv_${index}_msg_${msgIndex}`);
        if (message) {
          messages.push(message);
          participants.add(message.sender);
        }
      } catch (error) {
        console.warn(`Erro ao processar mensagem ${msgIndex}:`, error);
      }
    });
    
    if (messages.length === 0) return null;
    
    const conversationId = `conversation_${index}`;
    
    // Atualizar conversationId nas mensagens
    messages.forEach(msg => {
      msg.conversationId = conversationId;
    });
    
    return {
      id: conversationId,
      participants: Array.from(participants),
      title: this.extractConversationTitle(section),
      messages,
      createdAt: messages[0]?.timestamp || new Date(),
      lastActivity: messages[messages.length - 1]?.timestamp || new Date()
    };
  }

  private parseMessage(
    element: Element, 
    mediaFiles: Map<string, Blob>,
    messageId: string
  ): InstagramMessage | null {
    // Extrair remetente
    const senderEl = element.querySelector('.sender, [data-testid="sender"], .author');
    const sender = senderEl?.textContent?.trim() || 'Unknown';
    
    // Extrair conteúdo da mensagem
    const contentEl = element.querySelector('.content, [data-testid="content"], .text');
    const content = contentEl?.textContent?.trim() || '';
    
    // Extrair timestamp
    const timestampEl = element.querySelector('.timestamp, [data-testid="timestamp"], time');
    const timestamp = this.parseTimestamp(timestampEl?.textContent || timestampEl?.getAttribute('datetime') || '');
    
    // Verificar se há mídia
    const mediaEl = element.querySelector('img, video, audio');
    let mediaPath: string | undefined;
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
    
    if (mediaEl) {
      const src = mediaEl.getAttribute('src');
      if (src) {
        mediaPath = src;
        if (mediaEl.tagName.toLowerCase() === 'img') {
          messageType = 'image';
        } else if (mediaEl.tagName.toLowerCase() === 'video') {
          messageType = 'video';
        } else if (mediaEl.tagName.toLowerCase() === 'audio') {
          messageType = 'audio';
        }
      }
    }
    
    // Verificar se há links
    if (content.includes('http') || element.querySelector('a')) {
      messageType = 'link';
    }
    
    return {
      id: messageId,
      conversationId: '', // Será preenchido pelo parseConversationSection
      sender,
      content,
      timestamp,
      type: messageType,
      mediaPath
    };
  }

  private extractConversationsGeneric(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    // Método genérico para extrair conversas quando seletores específicos falham
    const conversations: InstagramConversation[] = [];
    
    // Procurar por padrões comuns no HTML
    const textNodes = this.getTextNodes(doc.body);
    const messagePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/; // Padrão de data
    
    let currentConversation: InstagramMessage[] = [];
    let conversationIndex = 0;
    
    textNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (text && messagePattern.test(text)) {
        // Possível início de nova conversa ou mensagem
        if (currentConversation.length > 0) {
          // Finalizar conversa anterior
          conversations.push(this.createConversationFromMessages(currentConversation, conversationIndex++));
          currentConversation = [];
        }
      }
    });
    
    if (currentConversation.length > 0) {
      conversations.push(this.createConversationFromMessages(currentConversation, conversationIndex));
    }
    
    return conversations;
  }

  private getTextNodes(element: Node): Node[] {
    const textNodes: Node[] = [];
    
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node);
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          walk(node.childNodes[i]);
        }
      }
    };
    
    walk(element);
    return textNodes;
  }

  private createConversationFromMessages(messages: InstagramMessage[], index: number): InstagramConversation {
    const participants = new Set(messages.map(m => m.sender));
    const conversationId = `conversation_${index}`;
    
    messages.forEach(msg => {
      msg.conversationId = conversationId;
    });
    
    return {
      id: conversationId,
      participants: Array.from(participants),
      messages,
      createdAt: messages[0]?.timestamp || new Date(),
      lastActivity: messages[messages.length - 1]?.timestamp || new Date()
    };
  }

  private extractUsers(doc: Document, conversations: InstagramConversation[]): InstagramUser[] {
    const usersMap = new Map<string, InstagramUser>();
    
    // Extrair usuários das conversas
    conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (!usersMap.has(participant)) {
          usersMap.set(participant, {
            id: uuidv4(),
            username: participant,
            displayName: participant,
            conversations: [conv.id],
            posts: 0
          });
        } else {
          const user = usersMap.get(participant)!;
          user.conversations.push(conv.id);
        }
      });
    });
    
    // Tentar extrair informações adicionais do HTML
    const profileSections = doc.querySelectorAll('.profile, [data-testid="profile"]');
    profileSections.forEach(section => {
      const username = section.querySelector('.username')?.textContent?.trim();
      const displayName = section.querySelector('.display-name')?.textContent?.trim();
      
      if (username && usersMap.has(username)) {
        const user = usersMap.get(username)!;
        if (displayName) user.displayName = displayName;
      }
    });
    
    return Array.from(usersMap.values());
  }

  private extractConversationTitle(section: Element): string | undefined {
    const titleEl = section.querySelector('.title, [data-testid="title"], h1, h2, h3');
    return titleEl?.textContent?.trim();
  }

  private parseTimestamp(timestampStr: string): Date {
    if (!timestampStr) return new Date();
    
    // Tentar diferentes formatos de data
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/     // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = timestampStr.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        // Assumir formato americano por padrão
        const date = new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    // Fallback para Date.parse
    const parsed = Date.parse(timestampStr);
    return isNaN(parsed) ? new Date() : new Date(parsed);
  }

  private organizeData(
    parsedData: any, 
    mediaFiles: Map<string, Blob>
  ): { users: InstagramUser[]; conversations: InstagramConversation[]; media: InstagramMedia[] } {
    const media: InstagramMedia[] = [];
    
    // Converter Map de mídia para array
    mediaFiles.forEach((blob, filename) => {
      const type = this.getMediaType(filename);
      media.push({
        id: uuidv4(),
        type,
        filename,
        path: filename,
        blob
      });
    });
    
    return {
      users: parsedData.users,
      conversations: parsedData.conversations,
      media
    };
  }

  private getMediaType(filename: string): 'image' | 'video' | 'audio' {
    const lower = filename.toLowerCase();
    
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
      return 'image';
    } else if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) {
      return 'video';
    } else {
      return 'audio';
    }
  }

  private async processMediaFiles(media: InstagramMedia[]): Promise<void> {
    // Aqui podemos implementar processamento adicional:
    // - Transcrição de áudios
    // - Classificação de imagens
    // - Análise de metadados
    
    for (const item of media) {
      try {
        if (item.type === 'audio') {
          // TODO: Implementar transcrição de áudio
          // item.transcript = await this.transcribeAudio(item.blob);
        } else if (item.type === 'image') {
          // TODO: Implementar classificação de imagens
          // item.classification = await this.classifyImage(item.blob);
        }
      } catch (error) {
        console.warn(`Erro ao processar mídia ${item.filename}:`, error);
      }
    }
  }
}

// Export singleton instance
export const instagramParserService = InstagramParserService.getInstance();