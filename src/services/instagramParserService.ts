import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import { InstagramParserMethods } from './instagramParserMethods';

// Expanded interfaces for Meta Business Record sections
export interface InstagramProfile {
  username: string;
  displayName?: string;
  email: string[];
  phone: string[];
  registrationDate?: Date;
  registrationIP?: string;
  profilePicture?: string;
  accountStatus: 'active' | 'disabled' | 'deactivated';
  verificationStatus: 'verified' | 'unverified';
  businessAccount?: boolean;
  privacySettings?: any;
}

export interface InstagramDevice {
  uuid: string;
  type: string;
  deviceModel?: string;
  os?: string;
  appVersion?: string;
  status: 'active' | 'inactive' | 'removed';
  firstSeen?: Date;
  lastSeen: Date;
  ipAddresses?: string[];
}

export interface InstagramLogin {
  timestamp: Date;
  ip: string;
  location?: string;
  device?: string;
  deviceId?: string;
  success: boolean;
  method?: string;
}

export interface InstagramFollowing {
  username: string;
  instagramId?: string;
  displayName?: string;
  followDate: Date;
  followType: 'following' | 'follower' | 'blocked' | 'restricted';
}

export interface ThreadsPost {
  id: string;
  content: string;
  timestamp: Date;
  reactions?: number;
  replies?: number;
  shares?: number;
  mediaAttached?: boolean;
  visibility: 'public' | 'private' | 'followers';
}

export interface NCMECReport {
  id: string;
  reportDate: Date;
  contentType: string;
  status: string;
  description?: string;
}

export interface RequestParameter {
  parameterName: string;
  value: string;
  category: string;
  timestamp?: Date;
}

export interface InstagramUser {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  conversations: string[];
  posts: number;
  followers?: number;
  following?: number;
  isMainUser?: boolean;
}

export interface InstagramMessage {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'audio' | 'link';
  mediaPath?: string;
  mediaId?: string;
  reactions?: any[];
  isDisappearing?: boolean;
}

export interface InstagramConversation {
  id: string;
  participants: string[];
  title?: string;
  messages: InstagramMessage[];
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  mediaCount: number;
}

export interface InstagramMedia {
  id: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
  path: string;
  blob: Blob;
  metadata?: any;
  associatedMessageId?: string;
  associatedConversationId?: string;
  transcript?: string;
  classification?: string;
  uploadDate?: Date;
  fileSize: number;
}

export interface CaseMetadata {
  dateRange: {
    start: Date;
    end: Date;
  };
  generationDate: Date;
  ticketNumber?: string;
  targetAccount?: string;
  preservationId?: string;
  reportType: string;
}

export interface ProcessedInstagramData {
  id: string;
  users: InstagramUser[];
  conversations: InstagramConversation[];
  media: InstagramMedia[];
  profile?: InstagramProfile;
  devices: InstagramDevice[];
  logins: InstagramLogin[];
  following: InstagramFollowing[];
  threadsPosts: ThreadsPost[];
  ncmecReports: NCMECReport[];
  requestParameters: RequestParameter[];
  caseMetadata?: CaseMetadata;
  metadata: {
    processedAt: Date;
    originalFilename: string;
    totalFiles: number;
    htmlContent?: string;
    sectionsFound: string[];
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
        users: organizedData.users,
        conversations: organizedData.conversations,
        media: organizedData.media,
        profile: organizedData.profile,
        devices: organizedData.devices,
        logins: organizedData.logins,
        following: organizedData.following,
        threadsPosts: organizedData.threadsPosts,
        ncmecReports: organizedData.ncmecReports,
        requestParameters: organizedData.requestParameters,
        caseMetadata: organizedData.caseMetadata,
        metadata: {
          processedAt: new Date(),
          originalFilename: file.name,
          totalFiles: Object.keys(zipContent.files).length,
          htmlContent: htmlContent.substring(0, 1000),
          sectionsFound: parsedData.sectionsFound || []
        }
      };
      
    } catch (error) {
      console.error('Erro ao processar ZIP:', error);
      throw new Error(`Falha ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private findMainHtmlFile(zipContent: JSZip): JSZip.JSZipObject | null {
    // Priorizar records.html (Meta Business Record padrão)
    const priorityNames = ['records.html'];
    const fallbackNames = ['index.html', 'instagram_data.html'];
    
    // Primeiro tentar nomes prioritários
    for (const name of priorityNames) {
      const file = zipContent.file(name);
      if (file) {
        console.log(`Found priority HTML file: ${name}`);
        return file;
      }
    }
    
    // Depois tentar fallbacks
    for (const name of fallbackNames) {
      const file = zipContent.file(name);
      if (file) {
        console.log(`Found fallback HTML file: ${name}`);
        return file;
      }
    }
    
    // Por último, procurar por qualquer arquivo HTML na raiz
    for (const [filename, file] of Object.entries(zipContent.files)) {
      if (filename.endsWith('.html') && !filename.includes('/')) {
        console.log(`Found generic HTML file: ${filename}`);
        return file;
      }
    }
    
    console.error('No HTML file found in ZIP');
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
          
          // Indexar de múltiplas formas para facilitar busca
          const basename = filename.replace(/^.*\//, ''); // Nome sem caminho
          const fullPath = filename; // Caminho completo
          
          // Indexar por basename (para referências como unified_message_123.mp3)
          mediaFiles.set(basename, blob);
          // Indexar por caminho completo
          mediaFiles.set(fullPath, blob);
          
          // Para arquivos em linked_media/, também indexar sem o prefixo
          if (filename.startsWith('linked_media/')) {
            const withoutPrefix = filename.replace('linked_media/', '');
            mediaFiles.set(withoutPrefix, blob);
          }
          
          console.log(`Indexed media file: ${basename} (${fullPath})`);
        } catch (error) {
          console.warn(`Erro ao extrair mídia ${filename}:`, error);
        }
      }
    }
    
    console.log(`Total media files indexed: ${mediaFiles.size / 3}`); // Dividir por 3 porque indexamos cada arquivo 3 vezes
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
    
    console.log('Starting comprehensive Meta Business Record parsing...');
    
    // Parse all Meta Business Record sections
    const sectionsFound: string[] = [];
    
    // Extract Request Parameters
    const requestParameters = InstagramParserMethods.parseRequestParameters(doc);
    if (requestParameters.length > 0) sectionsFound.push('Request Parameters');
    
    // Extract NCMEC Reports
    const ncmecReports = InstagramParserMethods.parseNCMECReports(doc);
    if (ncmecReports.length > 0) sectionsFound.push('NCMEC Reports');
    
    // Extract Profile Information
    const profile = InstagramParserMethods.parseProfileSection(doc);
    if (profile) sectionsFound.push('Profile');
    
    // Extract Photos section
    const photosData = InstagramParserMethods.parsePhotosSection(doc, mediaFiles);
    if (photosData.length > 0) sectionsFound.push('Photos');
    
    // Extract Unified Messages (main conversation data)
    const conversations = this.extractMetaConversations(doc, mediaFiles);
    if (conversations.length > 0) sectionsFound.push('Unified Messages');
    
    // Extract Disappearing Messages
    const disappearingMessages = InstagramParserMethods.parseDisappearingMessages(doc, mediaFiles);
    if (disappearingMessages.length > 0) sectionsFound.push('Disappearing Messages');
    
    // Extract Threads Posts
    const threadsPosts = InstagramParserMethods.parseThreadsPosts(doc);
    if (threadsPosts.length > 0) sectionsFound.push('Threads Posts');
    
    // Extract device and login information
    const devices = InstagramParserMethods.parseDevices(doc);
    if (devices.length > 0) sectionsFound.push('Devices');
    
    const logins = InstagramParserMethods.parseLogins(doc);
    if (logins.length > 0) sectionsFound.push('Logins');
    
    // Extract following/followers data
    const following = InstagramParserMethods.parseFollowing(doc);
    if (following.length > 0) sectionsFound.push('Following');
    
    // Extract users from all parsed data
    const users = this.extractUsers(doc, conversations);
    
    // Extract case metadata
    const caseMetadata = InstagramParserMethods.extractCaseMetadata(doc);
    
    console.log(`Parsed ${conversations.length} conversations, ${users.length} users`);
    console.log(`Sections found: ${sectionsFound.join(', ')}`);
    
    return { 
      conversations, 
      users, 
      profile,
      devices,
      logins,
      following,
      threadsPosts,
      ncmecReports,
      requestParameters,
      caseMetadata,
      sectionsFound
    };
  }

  private extractMetaConversations(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    
    // Método 1: Procurar por seção "Unified Messages" do Meta Business Record
    const unifiedMessagesSection = this.findSectionByHeader(doc, ['Unified Messages', 'Messages', 'Mensagens']);
    if (unifiedMessagesSection) {
      console.log('Found Unified Messages section');
      const unifiedConversations = this.parseUnifiedMessagesSection(unifiedMessagesSection, mediaFiles);
      conversations.push(...unifiedConversations);
    }
    
    // Método 2: Procurar por tabelas com estrutura conhecida
    const messageTables = doc.querySelectorAll('table');
    messageTables.forEach((table, index) => {
      const tableConversations = this.parseMessageTable(table, mediaFiles, index);
      conversations.push(...tableConversations);
    });
    
    // Método 3: Procurar por divs com padrões de mensagem
    if (conversations.length === 0) {
      const genericConversations = this.extractConversationsGeneric(doc, mediaFiles);
      conversations.push(...genericConversations);
    }
    
    return conversations;
  }

  // Parse Unified Messages section from Meta Business Record
  private parseUnifiedMessages(section: Element): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    
    // Look for conversation groups or tables
    const conversationElements = section.querySelectorAll('table, .conversation-group, .message-thread');
    
    conversationElements.forEach((convElement, index) => {
      const messages: InstagramMessage[] = [];
      const participants = new Set<string>();
      
      // Parse messages from tables or structured content
      const messageRows = convElement.querySelectorAll('tr, .message-item');
      
      messageRows.forEach((row, msgIndex) => {
        const cells = row.querySelectorAll('td, .message-cell, .message-content');
        
        if (cells.length >= 2) {
          const timestamp = this.parseTimestamp(cells[0]?.textContent?.trim() || '');
          const sender = cells[1]?.textContent?.trim() || 'Unknown';
          const content = cells[2]?.textContent?.trim() || '';
          const mediaRef = cells[3]?.textContent?.trim();
          
          participants.add(sender);
          
          // Detect media type from content or reference
          let messageType: 'text' | 'image' | 'video' | 'audio' = 'text';
          let mediaPath: string | undefined;
          
          if (mediaRef) {
            if (mediaRef.includes('.jpg') || mediaRef.includes('.png') || mediaRef.includes('.jpeg')) {
              messageType = 'image';
              mediaPath = mediaRef;
            } else if (mediaRef.includes('.mp4') || mediaRef.includes('.mov')) {
              messageType = 'video';
              mediaPath = mediaRef;
            } else if (mediaRef.includes('.mp3') || mediaRef.includes('.wav') || mediaRef.includes('.m4a')) {
              messageType = 'audio';
              mediaPath = mediaRef;
            }
          }
          
          messages.push({
            id: `msg_${index}_${msgIndex}`,
            conversationId: `conv_unified_${index}`,
            timestamp,
            sender,
            content,
            type: messageType,
            mediaPath,
            reactions: []
          });
        }
      });
      
      if (messages.length > 0) {
        const participantsList = Array.from(participants);
        conversations.push({
          id: `conv_unified_${index}`,
          participants: participantsList,
          title: participantsList.length > 2 ? 
            `Conversa em grupo (${participantsList.length} pessoas)` : 
            participantsList.join(', '),
          messages,
          lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
          messageCount: messages.length,
          mediaCount: messages.filter(m => m.type !== 'text').length,
          createdAt: messages[0]?.timestamp || new Date()
        });
      }
    });
    
    console.log(`Parsed ${conversations.length} conversations from Unified Messages`);
    return conversations;
  }

  // Enhanced section finder
  private findSectionByHeader(doc: Document, headerTexts: string[]): Element | null {
    const headers = doc.querySelectorAll('h1, h2, h3, h4, .section-header, strong, b, th');
    
    for (const header of headers) {
      const text = header.textContent?.trim();
      if (text && headerTexts.some(headerText => text.includes(headerText))) {
        // Find the section that contains this header
        let current = header.parentElement;
        while (current) {
          if (current.querySelector('table, .message, .conversation, .content')) {
            return current;
          }
          current = current.parentElement;
        }
        // If no section found, use next element
        return header.nextElementSibling;
      }
    }
    
    return null;
  }


  private parseUnifiedMessagesSection(section: Element, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    
    // Procurar por sub-seções de thread
    const threadSections = section.querySelectorAll('.thread, .conversation');
    
    threadSections.forEach((threadSection, index) => {
      const conversation = this.parseThreadSection(threadSection, mediaFiles, `unified_${index}`);
      if (conversation) {
        conversations.push(conversation);
      }
    });
    
    // Se não encontrou thread sections, procurar por tabelas ou listas
    if (conversations.length === 0) {
      const tables = section.querySelectorAll('table');
      tables.forEach((table, index) => {
        const tableConversations = this.parseMessageTable(table, mediaFiles, index);
        conversations.push(...tableConversations);
      });
    }
    
    return conversations;
  }

  private parseThreadSection(section: Element, mediaFiles: Map<string, Blob>, threadId: string): InstagramConversation | null {
    const messages: InstagramMessage[] = [];
    const participants = new Set<string>();
    
    // Procurar por linhas de mensagem na seção
    const messageRows = section.querySelectorAll('tr, .message-row, .message');
    
    messageRows.forEach((row, index) => {
      const message = this.parseMessageRow(row, mediaFiles, `${threadId}_msg_${index}`);
      if (message) {
        messages.push(message);
        participants.add(message.sender);
      }
    });
    
    if (messages.length === 0) return null;
    
    return {
      id: threadId,
      participants: Array.from(participants),
      title: this.extractThreadTitle(section),
      messages,
      createdAt: messages[0]?.timestamp || new Date(),
      lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
      messageCount: messages.length,
      mediaCount: messages.filter(m => m.type !== 'text').length
    };
  }

  private parseMessageTable(table: Element, mediaFiles: Map<string, Blob>, tableIndex: number): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    const messages: InstagramMessage[] = [];
    const participants = new Set<string>();
    
    // Analisar cabeçalhos para entender a estrutura
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim().toLowerCase() || '');
    
    const rows = table.querySelectorAll('tbody tr, tr');
    
    rows.forEach((row, index) => {
      if (row.querySelector('th')) return; // Pular linhas de cabeçalho
      
      const message = this.parseTableRow(row, headers, mediaFiles, `table_${tableIndex}_msg_${index}`);
      if (message) {
        messages.push(message);
        participants.add(message.sender);
      }
    });
    
    if (messages.length > 0) {
        conversations.push({
          id: `table_conversation_${tableIndex}`,
          participants: Array.from(participants),
          title: `Conversa ${tableIndex + 1}`,
          messages,
          createdAt: messages[0]?.timestamp || new Date(),
          lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
          messageCount: messages.length,
          mediaCount: messages.filter(m => m.type !== 'text').length
        });
    }
    
    return conversations;
  }

  private parseMessageRow(row: Element, mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    const cells = row.querySelectorAll('td, .cell');
    
    if (cells.length < 2) return null;
    
    // Tentar extrair sender, content, timestamp
    let sender = 'Unknown';
    let content = '';
    let timestamp = new Date();
    let mediaPath: string | undefined;
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
    
    // Primeira célula geralmente é timestamp
    const timestampText = cells[0]?.textContent?.trim() || '';
    if (timestampText) {
      timestamp = this.parseTimestamp(timestampText);
    }
    
    // Segunda célula geralmente é sender ou content
    if (cells.length >= 2) {
      sender = cells[1]?.textContent?.trim() || 'Unknown';
    }
    
    // Terceira célula geralmente é content
    if (cells.length >= 3) {
      content = cells[2]?.textContent?.trim() || '';
    } else if (cells.length === 2) {
      // Se só há 2 células, a segunda deve ser content
      content = cells[1]?.textContent?.trim() || '';
      sender = 'User';
    }
    
    // Verificar se há referência de mídia
    const mediaLinks = row.querySelectorAll('a[href*="unified_message"], img[src*="unified_message"]');
    if (mediaLinks.length > 0) {
      const href = mediaLinks[0].getAttribute('href') || mediaLinks[0].getAttribute('src');
      if (href) {
        const mediaId = href.match(/unified_message_(\d+)/)?.[0];
        if (mediaId) {
          mediaPath = mediaId;
          const extension = href.split('.').pop()?.toLowerCase();
          if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            messageType = 'image';
          } else if (extension && ['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
            messageType = 'video';
          } else if (extension && ['mp3', 'm4a', 'wav', 'ogg'].includes(extension)) {
            messageType = 'audio';
          }
        }
      }
    }
    
    return {
      id: messageId,
      conversationId: '', // Será preenchido pelo caller
      sender,
      content,
      timestamp,
      type: messageType,
      mediaPath
    };
  }

  private parseTableRow(row: Element, headers: string[], mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    const cells = Array.from(row.querySelectorAll('td'));
    
    if (cells.length === 0) return null;
    
    let sender = 'Unknown';
    let content = '';
    let timestamp = new Date();
    let mediaPath: string | undefined;
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
    
    // Mapear cells baseado nos headers
    cells.forEach((cell, index) => {
      const cellText = cell.textContent?.trim() || '';
      const header = headers[index] || '';
      
      if (header.includes('timestamp') || header.includes('time') || header.includes('date')) {
        timestamp = this.parseTimestamp(cellText);
      } else if (header.includes('sender') || header.includes('from') || header.includes('user')) {
        sender = cellText;
      } else if (header.includes('content') || header.includes('message') || header.includes('text')) {
        content = cellText;
      } else if (index === 0 && !header) {
        // Primeira coluna sem header, provavelmente timestamp
        timestamp = this.parseTimestamp(cellText);
      } else if (index === 1 && !header) {
        // Segunda coluna sem header, provavelmente sender
        sender = cellText;
      } else if (index === 2 && !header) {
        // Terceira coluna sem header, provavelmente content
        content = cellText;
      }
      
      // Verificar links de mídia na célula
      const links = cell.querySelectorAll('a[href*="unified_message"], img[src*="unified_message"]');
      if (links.length > 0) {
        const href = links[0].getAttribute('href') || links[0].getAttribute('src');
        if (href) {
          mediaPath = href;
          messageType = this.determineMediaType(href);
        }
      }
    });
    
    return {
      id: messageId,
      conversationId: '',
      sender,
      content,
      timestamp,
      type: messageType,
      mediaPath
    };
  }

  private extractThreadTitle(section: Element): string | undefined {
    const titleSelectors = [
      '.thread-title', 
      '.conversation-title', 
      'h1', 'h2', 'h3', 'h4', 
      '.title'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = section.querySelector(selector);
      if (titleEl?.textContent?.trim()) {
        return titleEl.textContent.trim();
      }
    }
    
    return undefined;
  }

  private determineMediaType(href: string): 'text' | 'image' | 'video' | 'audio' | 'link' {
    const extension = href.split('.').pop()?.toLowerCase();
    
    if (extension) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
        return 'image';
      } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) {
        return 'video';
      } else if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(extension)) {
        return 'audio';
      }
    }
    
    return 'link';
  }

  private extractMetadata(doc: Document): any {
    const metadata: any = {};
    
    // Procurar por informações de metadados típicas do Meta Business Record
    const titleEl = doc.querySelector('title, h1');
    if (titleEl) {
      metadata.reportTitle = titleEl.textContent?.trim();
    }
    
    // Procurar por informações do usuário alvo
    const targetInfo = this.findSectionByHeader(doc, ['Target User', 'User Information', 'Account Information']);
    if (targetInfo) {
      metadata.targetUser = this.extractTargetUserInfo(targetInfo);
    }
    
    return metadata;
  }

  private extractTargetUserInfo(section: Element): any {
    const info: any = {};
    
    const rows = section.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim().toLowerCase();
        const value = cells[1].textContent?.trim();
        
        if (key && value) {
          if (key.includes('username')) info.username = value;
          else if (key.includes('email')) info.email = value;
          else if (key.includes('name')) info.name = value;
          else if (key.includes('phone')) info.phone = value;
        }
      }
    });
    
    return info;
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
      lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
      messageCount: messages.length,
      mediaCount: messages.filter(m => m.type !== 'text').length
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
      lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
      messageCount: messages.length,
      mediaCount: messages.filter(m => m.type !== 'text').length
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

  private organizeData(parsedData: any, mediaFiles: Map<string, Blob>): { users: InstagramUser[]; conversations: InstagramConversation[]; media: InstagramMedia[]; profile?: InstagramProfile; devices: InstagramDevice[]; logins: InstagramLogin[]; following: InstagramFollowing[]; threadsPosts: ThreadsPost[]; ncmecReports: NCMECReport[]; requestParameters: RequestParameter[]; caseMetadata?: CaseMetadata } {
    const media: InstagramMedia[] = [];
    
    // Process media files with proper typing
    mediaFiles.forEach((blob, filename) => {
      const type = this.getMediaType(filename);
      media.push({
        id: uuidv4(),
        type,
        filename,
        path: filename,
        blob,
        fileSize: blob.size
      });
    });
    
    return {
      users: parsedData.users || [],
      conversations: parsedData.conversations || [],
      media,
      profile: parsedData.profile,
      devices: parsedData.devices || [],
      logins: parsedData.logins || [],
      following: parsedData.following || [],
      threadsPosts: parsedData.threadsPosts || [],
      ncmecReports: parsedData.ncmecReports || [],
      requestParameters: parsedData.requestParameters || [],
      caseMetadata: parsedData.caseMetadata
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
    const { getGroqSettings } = await import('./groqService');
    const settings = getGroqSettings();
    
    if (!settings.groqApiKey) {
      console.warn('GROQ API key not configured - skipping media processing');
      return;
    }

    const audioFiles = media.filter(m => m.type === 'audio');
    const imageFiles = media.filter(m => m.type === 'image');

    console.log(`Processing ${audioFiles.length} audio files and ${imageFiles.length} images`);

    // Process audio files for transcription using GROQ with rate limiting
    const AUDIO_BATCH_SIZE = 2;
    const AUDIO_BATCH_DELAY = 3000; // 3 seconds between batches (audio takes longer)
    
    for (let i = 0; i < audioFiles.length; i += AUDIO_BATCH_SIZE) {
      const batch = audioFiles.slice(i, i + AUDIO_BATCH_SIZE);
      
      await Promise.allSettled(batch.map(async (audio) => {
        try {
          // Convert blob to base64 safely
          const arrayBuffer = await audio.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
          }
          const base64Audio = btoa(binary);
          
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for audio
          
          try {
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: {
                audioData: base64Audio,
                groqApiKey: settings.groqApiKey
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!error && data?.success) {
              audio.transcript = data.text;
              console.log(`Transcribed audio: ${audio.filename}`);
            } else {
              console.warn(`Failed to transcribe ${audio.filename}:`, error?.message || 'Unknown error');
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`Timeout or error processing audio ${audio.filename}:`, error.message);
          }
        } catch (error) {
          console.warn(`Error processing audio ${audio.filename}:`, error.message);
        }
      }));
      
      // Wait between batches to avoid overwhelming the API
      if (i + AUDIO_BATCH_SIZE < audioFiles.length) {
        await new Promise(resolve => setTimeout(resolve, AUDIO_BATCH_DELAY));
      }
    }

    // Process images for classification using GROQ with rate limiting
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 2000; // 2 seconds between batches
    
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(batch.map(async (image) => {
        try {
          // Convert blob to base64 safely
          const arrayBuffer = await image.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
          }
          const base64Image = btoa(binary);
          
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          try {
            const { data, error } = await supabase.functions.invoke('classify-image', {
              body: {
                imageBase64: base64Image,
                groqApiKey: settings.groqApiKey
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!error && data?.success) {
              image.classification = data.classification;
              console.log(`Classified image: ${image.filename}`);
            } else {
              console.warn(`Failed to classify ${image.filename}:`, error?.message || 'Unknown error');
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`Timeout or error processing image ${image.filename}:`, error.message);
          }
        } catch (error) {
          console.warn(`Error processing image ${image.filename}:`, error.message);
        }
      }));
      
      // Wait between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
  }
}

// Export singleton instance
export const instagramParserService = InstagramParserService.getInstance();