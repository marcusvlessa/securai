import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import { InstagramParserMethods } from './instagramParserMethods';
import { 
  ProcessedInstagramData, 
  InstagramConversation, 
  InstagramMessage, 
  InstagramUser,
  InstagramMedia 
} from './instagramParserService';

/**
 * Enhanced Instagram Parser with robust error handling and improved parsing
 */
export class InstagramParserEnhanced {
  
  /**
   * Enhanced HTML parsing with multiple fallback strategies
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      console.log('🔍 [InstagramParserEnhanced] Iniciando parsing robusto do HTML');
      console.log('📄 Tamanho do HTML:', htmlContent.length);
      console.log('📁 Arquivos de mídia:', mediaFiles.size);
      
      // Estratégias múltiplas para encontrar conversas
      let conversations: InstagramConversation[] = [];
      let users: InstagramUser[] = [];
      
      // Estratégia 1: Buscar seções de mensagens
      const unifiedSection = this.findSectionByKeywords(doc, [
        'unified messages', 'mensagens unificadas', 'direct messages', 
        'mensagens diretas', 'instagram messages', 'conversations',
        'message', 'conversa', 'chat', 'dm'
      ]);
      
      if (unifiedSection) {
        console.log('✅ Encontrada seção de mensagens unificadas');
        conversations = this.parseUnifiedMessagesEnhanced(unifiedSection, mediaFiles);
      }
      
      // Estratégia 2: Buscar tabelas se não encontrou
      if (conversations.length === 0) {
        console.log('🔄 Estratégia 2: Analisando tabelas...');
        const tables = doc.querySelectorAll('table');
        for (let i = 0; i < tables.length; i++) {
          const tableConversations = this.parseTableAsConversation(tables[i], mediaFiles, i);
          conversations.push(...tableConversations);
        }
      }
      
      // Extrair usuários das conversas
      users = this.extractUsersFromConversations(conversations);
      
      console.log(`✅ Parsing concluído: ${conversations.length} conversas, ${users.length} usuários`);
      
      // Dados processados
      const processedData: ProcessedInstagramData = {
        id: crypto.randomUUID(),
        conversations,
        users,
        profile: {
          username: 'unknown',
          displayName: 'Usuario',
          bio: '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isVerified: false,
          isPrivate: false,
          profilePictureUrl: '',
          externalUrl: '',
          category: '',
        },
        devices: [],
        logins: [],
        media: Array.from(mediaFiles.entries()).map(([filename, blob]) => ({
          id: crypto.randomUUID(),
          filename,
          type: this.determineMediaTypeFromPath(filename),
          blob,
          conversations: [],
        })),
        following: [],
        threads: [],
        ncmecReports: [],
        requestParams: [],
        metadata: {
          originalFilename: 'instagram_data.zip',
          processedAt: new Date(),
          totalSize: htmlContent.length,
          fileCount: mediaFiles.size,
        }
      };
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Erro no parsing do HTML:', error);
      throw new Error(`Falha no parsing: ${error.message}`);
    }
  }
    const cleanHtml = DOMPurify.sanitize(htmlContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    
    console.log('🔍 Starting enhanced Meta Business Record parsing...');
    
    const sectionsFound: string[] = [];
    let conversations: InstagramConversation[] = [];
    let users: InstagramUser[] = [];
    
    // Strategy 1: Look for Meta Business Record unified messages
    console.log('📋 Strategy 1: Searching for Unified Messages...');
    const unifiedSection = this.findSectionByKeywords(doc, [
      'Unified Messages', 'Messages', 'Mensagens', 'Conversas', 'Conversations'
    ]);
    
    if (unifiedSection) {
      console.log('✅ Found Unified Messages section');
      sectionsFound.push('Unified Messages');
      conversations = this.parseUnifiedMessagesEnhanced(unifiedSection, mediaFiles);
    }
    
    // Strategy 2: Look for conversation tables
    if (conversations.length === 0) {
      console.log('📋 Strategy 2: Searching for conversation tables...');
      const tables = doc.querySelectorAll('table');
      console.log(`Found ${tables.length} tables to analyze`);
      
      tables.forEach((table, index) => {
        const tableConversations = this.parseTableAsConversation(table, mediaFiles, index);
        conversations.push(...tableConversations);
      });
      
      if (conversations.length > 0) {
        sectionsFound.push('Table-based Messages');
      }
    }
    
    // Strategy 3: Generic text-based parsing
    if (conversations.length === 0) {
      console.log('📋 Strategy 3: Generic text parsing...');
      conversations = this.parseGenericTextConversations(doc, mediaFiles);
      if (conversations.length > 0) {
        sectionsFound.push('Generic Text Messages');
      }
    }
    
    // Extract users from conversations
    users = this.extractUsersFromConversations(conversations);
    
    // Parse other Meta Business Record sections
    const profile = InstagramParserMethods.parseProfileSection(doc);
    if (profile) sectionsFound.push('Profile');
    
    const devices = InstagramParserMethods.parseDevices(doc);
    if (devices.length > 0) sectionsFound.push('Devices');
    
    const logins = InstagramParserMethods.parseLogins(doc);
    if (logins.length > 0) sectionsFound.push('Logins');
    
    const following = InstagramParserMethods.parseFollowing(doc);
    if (following.length > 0) sectionsFound.push('Following');
    
    const threadsPosts = InstagramParserMethods.parseThreadsPosts(doc);
    if (threadsPosts.length > 0) sectionsFound.push('Threads Posts');
    
    const ncmecReports = InstagramParserMethods.parseNCMECReports(doc);
    if (ncmecReports.length > 0) sectionsFound.push('NCMEC Reports');
    
    const requestParameters = InstagramParserMethods.parseRequestParameters(doc);
    if (requestParameters.length > 0) sectionsFound.push('Request Parameters');
    
    const caseMetadata = InstagramParserMethods.extractCaseMetadata(doc);
    
    console.log(`✅ Parsing complete: ${conversations.length} conversations, ${users.length} users`);
    console.log(`📊 Sections found: ${sectionsFound.join(', ')}`);
    
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
  
  /**
   * Find sections by keywords with flexible matching
   */
  private static findSectionByKeywords(doc: Document, keywords: string[]): Element | null {
    // Look in headers first
    const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, th, .header');
    
    for (const header of headers) {
      const text = header.textContent?.toLowerCase().trim() || '';
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          console.log(`🎯 Found section header: "${text}" matches "${keyword}"`);
          
          // Try to find the containing section
          let section = header.closest('section, div, article');
          if (!section) {
            // Look for next sibling that contains content
            section = header.nextElementSibling;
            while (section && !this.hasMessageContent(section)) {
              section = section.nextElementSibling;
            }
          }
          
          if (section && this.hasMessageContent(section)) {
            return section;
          }
        }
      }
    }
    
    // Fallback: look for divs with message-like content
    const allDivs = doc.querySelectorAll('div');
    for (const div of allDivs) {
      if (this.hasMessageContent(div)) {
        return div;
      }
    }
    
    return null;
  }
  
  /**
   * Check if element contains message-like content
   */
  private static hasMessageContent(element: Element): boolean {
    // Look for tables, message patterns, or unified_message references
    const hasTable = element.querySelector('table') !== null;
    const hasMessages = element.textContent?.includes('unified_message') || false;
    const hasTimestamps = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(element.textContent || '');
    
    return hasTable || hasMessages || hasTimestamps;
  }
  
  /**
   * Enhanced unified messages parsing
   */
  private static parseUnifiedMessagesEnhanced(
    section: Element, 
    mediaFiles: Map<string, Blob>
  ): InstagramConversation[] {
    console.log('🔍 Parsing unified messages section...');
    
    const conversations: InstagramConversation[] = [];
    
    // Look for tables within the section
    const tables = section.querySelectorAll('table');
    console.log(`Found ${tables.length} tables in unified messages section`);
    
    tables.forEach((table, index) => {
      const tableConversations = this.parseTableAsConversation(table, mediaFiles, index);
      conversations.push(...tableConversations);
    });
    
    return conversations;
  }
  
  /**
   * Parse a table as a conversation with enhanced logic
   */
  private static parseTableAsConversation(
    table: Element, 
    mediaFiles: Map<string, Blob>, 
    index: number
  ): InstagramConversation[] {
    const messages: InstagramMessage[] = [];
    const participants = new Set<string>();
    
    // Analyze table structure
    const headers = Array.from(table.querySelectorAll('th')).map(th => 
      th.textContent?.trim().toLowerCase() || ''
    );
    
    const rows = table.querySelectorAll('tbody tr, tr');
    
    console.log(`📊 Analyzing table ${index} with ${rows.length} rows, headers: [${headers.join(', ')}]`);
    
    let messageCount = 0;
    
    rows.forEach((row, rowIndex) => {
      // Skip header rows
      if (row.querySelector('th')) return;
      
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 2) return;
      
      const message = this.parseTableRowAsMessage(row, cells, headers, mediaFiles, `table_${index}_msg_${rowIndex}`);
      
      if (message && message.content.trim()) {
        messages.push(message);
        participants.add(message.sender);
        messageCount++;
      }
    });
    
    console.log(`✅ Parsed table ${index}: ${messageCount} messages, ${participants.size} participants`);
    
    if (messages.length === 0) {
      return [];
    }
    
    const conversationId = `table_conversation_${index}`;
    
    // Update message conversation IDs
    messages.forEach(msg => {
      msg.conversationId = conversationId;
    });
    
    return [{
      id: conversationId,
      participants: Array.from(participants),
      title: `Conversa ${index + 1} (${participants.size} participantes)`,
      messages: messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      createdAt: messages[0]?.timestamp || new Date(),
      lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
      messageCount: messages.length,
      mediaCount: messages.filter(m => m.type !== 'text').length
    }];
  }
  
  /**
   * Parse table row as message with intelligent column detection
   */
  private static parseTableRowAsMessage(
    row: Element,
    cells: Element[],
    headers: string[],
    mediaFiles: Map<string, Blob>,
    messageId: string
  ): InstagramMessage | null {
    
    let timestamp = new Date();
    let sender = 'Unknown';
    let content = '';
    let mediaPath: string | undefined;
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
    
    // Strategy: Map cells based on headers or position
    cells.forEach((cell, index) => {
      const cellText = cell.textContent?.trim() || '';
      const header = headers[index] || '';
      
      // Timestamp detection
      if (this.isTimestamp(cellText) || header.includes('time') || header.includes('date') || index === 0) {
        const parsedTime = this.parseTimestamp(cellText);
        if (parsedTime.getTime() > new Date('2010-01-01').getTime()) {
          timestamp = parsedTime;
        }
      }
      
      // Sender detection
      if (header.includes('sender') || header.includes('from') || header.includes('user') || 
          (index === 1 && !this.isTimestamp(cellText))) {
        sender = cellText || 'Unknown';
      }
      
      // Content detection
      if (header.includes('content') || header.includes('message') || header.includes('text') ||
          (index >= 2 && cellText.length > 0)) {
        if (!content || cellText.length > content.length) {
          content = cellText;
        }
      }
      
      // Media detection
      const links = cell.querySelectorAll('a[href*="unified_message"], img[src*="unified_message"]');
      if (links.length > 0) {
        const href = links[0].getAttribute('href') || links[0].getAttribute('src');
        if (href) {
          mediaPath = this.extractMediaFileName(href);
          messageType = this.determineMediaTypeFromPath(href);
        }
      }
    });
    
    // Validate message has meaningful content
    if (!content.trim() && !mediaPath) {
      return null;
    }
    
    // If no sender found, try to extract from content patterns
    if (sender === 'Unknown') {
      const senderMatch = content.match(/^([^:]+):/);
      if (senderMatch) {
        sender = senderMatch[1].trim();
        content = content.replace(/^[^:]+:\s*/, '');
      }
    }
    
    return {
      id: messageId,
      conversationId: '', // Will be set by caller
      sender,
      content,
      timestamp,
      type: messageType,
      mediaPath,
      mediaId: mediaPath ? this.extractMediaId(mediaPath) : undefined
    };
  }
  
  /**
   * Generic text-based conversation parsing
   */
  private static parseGenericTextConversations(
    doc: Document, 
    mediaFiles: Map<string, Blob>
  ): InstagramConversation[] {
    console.log('🔍 Attempting generic text parsing...');
    
    const conversations: InstagramConversation[] = [];
    const allText = doc.body.textContent || '';
    
    // Look for timestamp patterns to identify message blocks
    const timestampRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
    const matches = [...allText.matchAll(timestampRegex)];
    
    console.log(`Found ${matches.length} potential timestamp matches`);
    
    if (matches.length > 5) { // Only proceed if we have enough potential messages
      const messages: InstagramMessage[] = [];
      
      matches.forEach((match, index) => {
        const timestamp = this.parseTimestamp(match[1]);
        
        // Extract surrounding text as potential message content
        const startIndex = Math.max(0, match.index! - 200);
        const endIndex = Math.min(allText.length, match.index! + 500);
        const context = allText.substring(startIndex, endIndex);
        
        // Simple heuristic to extract sender and content
        const lines = context.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let sender = 'User';
        let content = '';
        
        for (const line of lines) {
          if (line.includes(match[1])) {
            // This line contains the timestamp, look for adjacent content
            const lineIndex = lines.indexOf(line);
            if (lineIndex > 0) {
              content = lines[lineIndex - 1] || lines[lineIndex + 1] || '';
            }
            break;
          }
        }
        
        if (content.trim()) {
          messages.push({
            id: `generic_msg_${index}`,
            conversationId: 'generic_conversation',
            sender,
            content: content.substring(0, 500), // Limit content length
            timestamp,
            type: 'text'
          });
        }
      });
      
      if (messages.length > 0) {
        conversations.push({
          id: 'generic_conversation',
          participants: ['User'],
          title: 'Conversa Extraída',
          messages: messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
          createdAt: messages[0].timestamp,
          lastActivity: messages[messages.length - 1].timestamp,
          messageCount: messages.length,
          mediaCount: 0
        });
        
        console.log(`✅ Created generic conversation with ${messages.length} messages`);
      }
    }
    
    return conversations;
  }
  
  /**
   * Extract users from parsed conversations
   */
  private static extractUsersFromConversations(conversations: InstagramConversation[]): InstagramUser[] {
    const usersMap = new Map<string, InstagramUser>();
    
    conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (!usersMap.has(participant)) {
          usersMap.set(participant, {
            id: uuidv4(),
            username: participant,
            displayName: participant,
            conversations: [conv.id],
            posts: conv.messages.filter(m => m.sender === participant).length
          });
        } else {
          const user = usersMap.get(participant)!;
          if (!user.conversations.includes(conv.id)) {
            user.conversations.push(conv.id);
          }
          user.posts += conv.messages.filter(m => m.sender === participant).length;
        }
      });
    });
    
    return Array.from(usersMap.values());
  }
  
  // Utility methods
  private static isTimestamp(text: string): boolean {
    return /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/.test(text);
  }
  
  private static parseTimestamp(timestampStr: string): Date {
    if (!timestampStr) return new Date();
    
    // Try different formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/     // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = timestampStr.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        const date = new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    const parsed = Date.parse(timestampStr);
    return isNaN(parsed) ? new Date() : new Date(parsed);
  }
  
  private static extractMediaFileName(href: string): string {
    const parts = href.split('/');
    return parts[parts.length - 1];
  }
  
  private static extractMediaId(mediaPath: string): string | undefined {
    const match = mediaPath.match(/unified_message_(\d+)/);
    return match ? match[0] : undefined;
  }
  
  private static determineMediaTypeFromPath(href: string): 'text' | 'image' | 'video' | 'audio' | 'link' {
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
}