import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import type { 
  InstagramConversation, 
  InstagramUser, 
  InstagramMessage, 
  InstagramDevice, 
  InstagramLogin, 
  InstagramProfile,
  ProcessedInstagramData,
  InstagramFollowing,
  ThreadsPost,
  NCMECReport,
  RequestParameter
} from './instagramParserService';

export class InstagramParserEnhanced {
  /**
   * Parse Instagram/Meta Business Record HTML content with robust strategies
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting enhanced Meta Business Record parsing...');
      
      const cleanHtml = DOMPurify.sanitize(htmlContent);
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanHtml, 'text/html');
      
      const processedData: ProcessedInstagramData = {
        id: uuidv4(),
        conversations: [],
        users: [],
        media: [],
        devices: [],
        logins: [],
        following: [],
        profile: null,
        threadsPosts: [],
        ncmecReports: [],
        requestParameters: [],
        metadata: {
          processedAt: new Date(),
          originalFilename: 'records.html',
          totalFiles: mediaFiles.size,
          sectionsFound: []
        }
      };

      // Extract different sections of Meta Business Record
      console.log('📋 Extracting profile information...');
      processedData.profile = this.extractProfile(doc);
      
      console.log('💬 Extracting conversations and messages...');
      processedData.conversations = this.extractConversations(doc, mediaFiles);
      
      console.log('👥 Extracting users...');
      processedData.users = this.extractUsers(doc, processedData.conversations);
      
      console.log('📱 Extracting devices...');
      processedData.devices = this.extractDevices(doc);
      
      console.log('🔐 Extracting logins...');
      processedData.logins = this.extractLogins(doc);
      
      console.log('📸 Extracting media...');
      processedData.media = this.extractMedia(doc, mediaFiles);
      
      console.log('👥 Extracting following/followers...');
      processedData.following = this.extractFollowing(doc);
      
      console.log('🧵 Extracting Threads data...');
      processedData.threadsPosts = this.extractThreadsData(doc);
      
      console.log('📊 Extracting reports and parameters...');
      processedData.ncmecReports = this.extractNCMECReports(doc);
      processedData.requestParameters = this.extractRequestParameters(doc);
      
      console.log('✅ Parsing completed successfully:', {
        conversations: processedData.conversations.length,
        users: processedData.users.length,
        media: processedData.media.length,
        devices: processedData.devices.length,
        logins: processedData.logins.length
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Erro no parsing do HTML:', error);
      throw new Error(`Falha no parsing: ${error.message}`);
    }
  }

  /**
   * Extract profile information from Meta Business Record
   */
  private static extractProfile(doc: Document): InstagramProfile | null {
    try {
      // Look for profile section with different patterns
      const profileSection = this.findSectionByKeywords(doc, [
        'property-name', 'property-emails', 'property-phone_numbers',
        'Profile', 'Account', 'User Information'
      ]);
      
      if (!profileSection) return null;
      
      const profile: InstagramProfile = {
        username: this.extractTextFromSection(profileSection, 'username', 'name'),
        displayName: this.extractTextFromSection(profileSection, 'display_name', 'full_name'),
        email: [this.extractTextFromSection(profileSection, 'email')],
        phone: [this.extractTextFromSection(profileSection, 'phone', 'telephone')],
        profilePicture: this.extractImageFromSection(profileSection),
        accountStatus: 'active',
        verificationStatus: 'unverified'
      };
      
      return profile;
    } catch (error) {
      console.warn('⚠️ Error extracting profile:', error);
      return null;
    }
  }

  /**
   * Extract conversations from unified messages section
   */
  private static extractConversations(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    try {
      const conversations: InstagramConversation[] = [];
      
      // Look for unified messages section
      const messagesSection = this.findSectionByKeywords(doc, [
        'property-unified_messages', 'unified_messages', 'Messages', 'Conversations'
      ]);
      
      if (!messagesSection) {
        console.warn('⚠️ No unified messages section found');
        return conversations;
      }
      
      // Extract tables or structured message data
      const tables = messagesSection.querySelectorAll('table');
      const messageDivs = messagesSection.querySelectorAll('div.i, div.m');
      
      if (tables.length > 0) {
        // Process table-based messages
        tables.forEach((table, index) => {
          const conversation = this.parseTableAsConversation(table, mediaFiles, index);
          if (conversation) {
            conversations.push(conversation);
          }
        });
      } else if (messageDivs.length > 0) {
        // Process div-based messages
        const conversation = this.parseDivAsConversation(messagesSection, mediaFiles);
        if (conversation) {
          conversations.push(conversation);
        }
      }
      
      return conversations;
    } catch (error) {
      console.warn('⚠️ Error extracting conversations:', error);
      return [];
    }
  }

  /**
   * Parse a table as a conversation
   */
  private static parseTableAsConversation(table: Element, mediaFiles: Map<string, Blob>, index: number): InstagramConversation | null {
    try {
      const rows = table.querySelectorAll('tr');
      if (rows.length === 0) return null;
      
      const messages: InstagramMessage[] = [];
      let participants: string[] = [];
      
      // Extract header to understand column structure
      const headerRow = rows[0];
      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => 
        cell.textContent?.trim().toLowerCase() || ''
      );
      
      // Process each row as a message
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        
        if (cells.length === 0) continue;
        
        const message = this.parseTableRowAsMessage(row, cells, headers, mediaFiles, `msg_${index}_${i}`);
        if (message) {
          messages.push(message);
          if (message.sender && !participants.includes(message.sender)) {
            participants.push(message.sender);
          }
        }
      }
      
      if (messages.length === 0) return null;
      
      const conversation: InstagramConversation = {
        id: `conversation_${index}`,
        participants,
        messages,
        title: participants.length > 1 ? `Chat with ${participants.join(', ')}` : 'Personal Chat',
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
      return conversation;
    } catch (error) {
      console.warn('⚠️ Error parsing table as conversation:', error);
      return null;
    }
  }

  /**
   * Parse a table row as a message
   */
  private static parseTableRowAsMessage(
    row: Element, 
    cells: Element[], 
    headers: string[], 
    mediaFiles: Map<string, Blob>, 
    messageId: string
  ): InstagramMessage | null {
    try {
      if (cells.length === 0) return null;
      
      let timestamp = new Date();
      let sender = '';
      let content = '';
      let mediaType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let mediaUrl = '';
      
      // Map cells to message properties based on headers or position
      cells.forEach((cell, cellIndex) => {
        const cellText = cell.textContent?.trim() || '';
        const header = headers[cellIndex] || '';
        
        // Try to identify timestamp
        if (this.isTimestamp(cellText) || header.includes('time') || header.includes('date')) {
          const parsedTime = this.parseTimestamp(cellText);
          if (parsedTime) timestamp = parsedTime;
        }
        
        // Try to identify sender
        else if (header.includes('sender') || header.includes('from') || header.includes('author')) {
          sender = cellText;
        }
        
        // Try to identify content
        else if (header.includes('content') || header.includes('message') || header.includes('text')) {
          content = cellText;
        }
        
        // Check for media links
        const links = cell.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          if (href.includes('media') || href.includes('attachment')) {
            mediaType = this.determineMediaTypeFromPath(href);
            mediaUrl = this.processMediaUrl(href, mediaFiles);
          }
        });
        
        // If no specific header match, try to infer from content
        if (!sender && !content) {
          if (cellIndex === 0 && cellText.length < 50) {
            sender = cellText;
          } else if (cellIndex === 1 || (cellIndex === 0 && !sender)) {
            content = cellText;
          }
        }
      });
      
      // Fallback: if no sender identified, use a generic one
      if (!sender) {
        sender = 'User';
      }
      
      const message: InstagramMessage = {
        id: messageId,
        conversationId: `conversation_${Math.random()}`,
        sender,
        content: content || '',
        timestamp,
        type: mediaType,
        mediaPath: mediaUrl || undefined,
        reactions: []
      };
      
      return message;
    } catch (error) {
      console.warn('⚠️ Error parsing table row as message:', error);
      return null;
    }
  }

  /**
   * Parse div-based conversation structure
   */
  private static parseDivAsConversation(section: Element, mediaFiles: Map<string, Blob>): InstagramConversation | null {
    try {
      const messageDivs = section.querySelectorAll('div.i, div.m');
      const messages: InstagramMessage[] = [];
      const participants: Set<string> = new Set();
      
      messageDivs.forEach((div, index) => {
        const text = div.textContent?.trim() || '';
        if (text.length === 0) return;
        
        // Try to extract sender and content from text patterns
        const timeMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}.*?\d{1,2}:\d{2})/);
        const timestamp = timeMatch ? this.parseTimestamp(timeMatch[1]) : new Date();
        
        // Simple pattern: look for "Sender: Message" or similar
        let sender = 'User';
        let content = text;
        
        const colonIndex = text.indexOf(':');
        if (colonIndex > 0 && colonIndex < 50) {
          const potentialSender = text.substring(0, colonIndex).trim();
          if (potentialSender.length > 0 && potentialSender.length < 30) {
            sender = potentialSender;
            content = text.substring(colonIndex + 1).trim();
          }
        }
        
        participants.add(sender);
        
        const message: InstagramMessage = {
          id: `div_msg_${index}`,
          conversationId: 'conversation_div',
          sender,
          content,
          timestamp: timestamp || new Date(),
          type: 'text',
          reactions: []
        };
        
        messages.push(message);
      });
      
      if (messages.length === 0) return null;
      
      const conversation: InstagramConversation = {
        id: 'conversation_div',
        participants: Array.from(participants),
        messages,
        title: `Chat with ${Array.from(participants).join(', ')}`,
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
      return conversation;
    } catch (error) {
      console.warn('⚠️ Error parsing div as conversation:', error);
      return null;
    }
  }

  /**
   * Extract users from conversations and other sections
   */
  private static extractUsers(doc: Document, conversations: InstagramConversation[]): InstagramUser[] {
    const users: Map<string, InstagramUser> = new Map();
    
    // Extract users from conversations
    conversations.forEach(conversation => {
      conversation.participants.forEach(participant => {
        if (!users.has(participant)) {
          users.set(participant, {
            id: participant.toLowerCase().replace(/\s+/g, '_'),
            username: participant,
            displayName: participant,
            profilePicture: undefined,
            conversations: [],
            posts: 0,
            followers: 0,
            following: 0
          });
        }
      });
    });
    
    return Array.from(users.values());
  }

  /**
   * Extract device information
   */
  private static extractDevices(doc: Document): InstagramDevice[] {
    try {
      const devices: InstagramDevice[] = [];
      const deviceSection = this.findSectionByKeywords(doc, [
        'property-devices', 'devices', 'Device Information'
      ]);
      
      if (!deviceSection) return devices;
      
      const tables = deviceSection.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length >= 2) {
            const device: InstagramDevice = {
              uuid: `device_${i}`,
              type: cells[0]?.textContent?.trim() || 'Unknown',
              deviceModel: cells[1]?.textContent?.trim() || 'Unknown',
              os: cells[2]?.textContent?.trim() || 'Unknown',
              status: 'active',
              lastSeen: cells[3] ? this.parseTimestamp(cells[3].textContent?.trim() || '') || new Date() : new Date(),
              ipAddresses: cells[4] ? [cells[4].textContent?.trim() || ''] : []
            };
            devices.push(device);
          }
        }
      });
      
      return devices;
    } catch (error) {
      console.warn('⚠️ Error extracting devices:', error);
      return [];
    }
  }

  /**
   * Extract login information
   */
  private static extractLogins(doc: Document): InstagramLogin[] {
    try {
      const logins: InstagramLogin[] = [];
      const loginSection = this.findSectionByKeywords(doc, [
        'property-logins', 'logins', 'Login History'
      ]);
      
      if (!loginSection) return logins;
      
      const tables = loginSection.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length >= 3) {
            const login: InstagramLogin = {
              timestamp: this.parseTimestamp(cells[0]?.textContent?.trim() || '') || new Date(),
              ip: cells[1]?.textContent?.trim() || '',
              location: cells[2]?.textContent?.trim() || 'Unknown',
              device: cells[3]?.textContent?.trim() || 'Unknown',
              success: !cells[4]?.textContent?.toLowerCase().includes('failed')
            };
            logins.push(login);
          }
        }
      });
      
      return logins;
    } catch (error) {
      console.warn('⚠️ Error extracting logins:', error);
      return [];
    }
  }

  /**
   * Extract media files and link with messages
   */
  private static extractMedia(doc: Document, mediaFiles: Map<string, Blob>): any[] {
    const media: any[] = [];
    
    mediaFiles.forEach((blob, filename) => {
      const mediaType = this.determineMediaTypeFromPath(filename);
      const url = URL.createObjectURL(blob);
      
      media.push({
        id: filename,
        type: mediaType,
        url,
        filename,
        size: blob.size,
        timestamp: new Date()
      });
    });
    
    return media;
  }

  /**
   * Extract following/followers information
   */
  private static extractFollowing(doc: Document): InstagramFollowing[] {
    try {
      const following: InstagramFollowing[] = [];
      const followingSection = this.findSectionByKeywords(doc, [
        'property-following', 'following', 'Following List'
      ]);
      
      if (!followingSection) return following;
      
      const tables = followingSection.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length >= 1) {
            const followingItem: InstagramFollowing = {
              username: cells[0]?.textContent?.trim() || '',
              displayName: cells[1]?.textContent?.trim() || '',
              followDate: cells[2] ? this.parseTimestamp(cells[2].textContent?.trim() || '') : new Date(),
              followType: 'following'
            };
            following.push(followingItem);
          }
        }
      });
      
      return following;
    } catch (error) {
      console.warn('⚠️ Error extracting following:', error);
      return [];
    }
  }

  /**
   * Extract Threads data
   */
  private static extractThreadsData(doc: Document): ThreadsPost[] {
    return [];
  }

  /**
   * Extract NCMEC reports
   */
  private static extractNCMECReports(doc: Document): NCMECReport[] {
    return [];
  }

  /**
   * Extract request parameters
   */
  private static extractRequestParameters(doc: Document): RequestParameter[] {
    return [];
  }

  // Helper methods
  private static findSectionByKeywords(doc: Document, keywords: string[]): Element | null {
    for (const keyword of keywords) {
      const element = doc.querySelector(`#${keyword}`) || 
                     doc.querySelector(`[id*="${keyword}"]`) ||
                     Array.from(doc.querySelectorAll('*')).find(el => 
                       el.textContent?.toLowerCase().includes(keyword.toLowerCase())
                     );
      if (element) return element;
    }
    return null;
  }

  private static extractTextFromSection(section: Element, ...keys: string[]): string {
    for (const key of keys) {
      const element = section.querySelector(`[data-key="${key}"]`) ||
                     Array.from(section.querySelectorAll('*')).find(el => 
                       el.textContent?.toLowerCase().includes(key)
                     );
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  private static extractImageFromSection(section: Element): string | undefined {
    const img = section.querySelector('img');
    return img?.src;
  }

  private static isTimestamp(text: string): boolean {
    const timestampPatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}:\d{2}/,
      /\d{1,2}\/\d{1,2}\/\d{4}.*?\d{1,2}:\d{2}/
    ];
    return timestampPatterns.some(pattern => pattern.test(text));
  }

  private static parseTimestamp(timestampStr: string): Date | null {
    if (!timestampStr) return null;
    
    const date = new Date(timestampStr);
    if (!isNaN(date.getTime())) return date;
    
    // Try different formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/,
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/
    ];
    
    for (const format of formats) {
      const match = timestampStr.match(format);
      if (match) {
        if (format.source.includes('\/')) {
          // MM/DD/YYYY format
          const [, month, day, year, hour, minute] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        } else {
          // YYYY-MM-DD format
          const [, year, month, day, hour, minute] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        }
      }
    }
    
    return null;
  }

  private static processMediaUrl(href: string, mediaFiles: Map<string, Blob>): string {
    // Extract filename from href and find corresponding blob
    const filename = this.extractMediaFileName(href);
    const blob = mediaFiles.get(filename);
    return blob ? URL.createObjectURL(blob) : href;
  }

  private static extractMediaFileName(href: string): string {
    return href.split('/').pop() || href;
  }

  private static determineMediaTypeFromPath(href: string): 'text' | 'image' | 'video' | 'audio' | 'link' {
    const extension = href.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return 'audio';
    } else if (href.startsWith('http')) {
      return 'link';
    }
    
    return 'text';
  }

  private static calculateDateRange(conversations: InstagramConversation[]): { start: Date; end: Date } {
    const dates = conversations.flatMap(conv => 
      conv.messages.map(msg => msg.timestamp)
    ).filter(date => date);
    
    if (dates.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }
    
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1]
    };
  }

  private static extractPreservationId(doc: Document): string {
    const element = Array.from(doc.querySelectorAll('*')).find(el => 
      el.textContent?.includes('Preservation ID') || el.textContent?.includes('Record ID')
    );
    return element?.textContent?.match(/[A-Z0-9-]+/)?.[0] || '';
  }
}