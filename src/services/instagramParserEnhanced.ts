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
   * Parse Meta Business Record HTML content with specialized parser
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record parsing...');
      
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

      // Extract different sections with Meta Business Record specific structure
      console.log('📋 Extracting profile information...');
      processedData.profile = this.extractMetaProfile(doc);
      
      console.log('💬 Extracting unified messages...');
      processedData.conversations = this.extractUnifiedMessages(doc, mediaFiles);
      
      console.log('👥 Extracting users...');
      processedData.users = this.extractUsersFromData(processedData);
      
      console.log('📱 Extracting devices...');
      processedData.devices = this.extractMetaDevices(doc);
      
      console.log('🔐 Extracting logins...');
      processedData.logins = this.extractMetaLogins(doc);
      
      console.log('📸 Processing media files...');
      processedData.media = this.processMediaFiles(mediaFiles);
      
      console.log('👥 Extracting following/followers...');
      processedData.following = this.extractMetaFollowing(doc);
      
      console.log('✅ Meta Business Record parsing completed:', {
        profile: processedData.profile ? 'Found' : 'Not found',
        conversations: processedData.conversations.length,
        users: processedData.users.length,
        media: processedData.media.length,
        devices: processedData.devices.length,
        logins: processedData.logins.length
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Erro no parsing Meta Business Record:', error);
      throw new Error(`Falha no parsing: ${error.message}`);
    }
  }

  /**
   * Extract profile from Meta Business Record specific sections
   */
  private static extractMetaProfile(doc: Document): InstagramProfile | null {
    try {
      console.log('🔍 Looking for Meta profile sections...');
      
      // Look for name property
      const nameElement = doc.getElementById('property-name');
      const emailsElement = doc.getElementById('property-emails');
      const phoneElement = doc.getElementById('property-phone_numbers');
      const profilePictureElement = doc.getElementById('property-profile_picture');
      const registrationElement = doc.getElementById('property-registration_date');
      const registrationIPElement = doc.getElementById('property-registration_ip');
      
      if (!nameElement && !emailsElement) {
        console.warn('⚠️ No Meta profile sections found');
        return null;
      }
      
      let displayName = '';
      let username = '';
      let emails: string[] = [];
      let phones: string[] = [];
      let profilePicture = '';
      let registrationDate: Date | undefined;
      let registrationIP = '';
      
      // Extract name
      if (nameElement) {
        const nameText = this.extractTextContent(nameElement);
        console.log('📝 Name found:', nameText);
        displayName = nameText;
        // Generate username from display name
        username = nameText.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'user';
      }
      
      // Extract emails
      if (emailsElement) {
        const emailTexts = this.extractAllTextContent(emailsElement);
        emails = emailTexts.filter(text => text.includes('@'));
        console.log('📧 Emails found:', emails);
      }
      
      // Extract phones
      if (phoneElement) {
        const phoneTexts = this.extractAllTextContent(phoneElement);
        phones = phoneTexts.filter(text => /[\d\s\-\(\)\+]+/.test(text));
        console.log('📱 Phones found:', phones);
      }
      
      // Extract profile picture
      if (profilePictureElement) {
        const img = profilePictureElement.querySelector('img');
        if (img) {
          profilePicture = img.src || '';
        }
      }
      
      // Extract registration date
      if (registrationElement) {
        const dateText = this.extractTextContent(registrationElement);
        registrationDate = this.parseTimestamp(dateText);
      }
      
      // Extract registration IP
      if (registrationIPElement) {
        registrationIP = this.extractTextContent(registrationIPElement);
      }
      
      const profile: InstagramProfile = {
        username: username || 'unknown_user',
        displayName: displayName || '',
        email: emails,
        phone: phones,
        profilePicture: profilePicture || undefined,
        accountStatus: 'active',
        verificationStatus: 'unverified',
        registrationDate,
        registrationIP: registrationIP || undefined
      };
      
      console.log('✅ Meta profile extracted:', profile);
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Error extracting Meta profile:', error);
      return null;
    }
  }

  /**
   * Extract unified messages from Meta Business Record
   */
  private static extractUnifiedMessages(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    try {
      console.log('🔍 Looking for unified messages section...');
      
      const unifiedMessagesElement = doc.getElementById('property-unified_messages');
      if (!unifiedMessagesElement) {
        console.warn('⚠️ No unified messages section found');
        return [];
      }
      
      const conversations: InstagramConversation[] = [];
      
      // Look for table structures within the unified messages
      const tables = unifiedMessagesElement.querySelectorAll('table');
      console.log(`📊 Found ${tables.length} message tables`);
      
      if (tables.length === 0) {
        // Try div-based structure
        const conversations_divs = unifiedMessagesElement.querySelectorAll('div.o');
        console.log(`📦 Found ${conversations_divs.length} conversation divs`);
        
        conversations_divs.forEach((div, index) => {
          const conversation = this.parseMetaConversationDiv(div, mediaFiles, index);
          if (conversation) {
            conversations.push(conversation);
          }
        });
      } else {
        // Process each table as a potential conversation
        tables.forEach((table, index) => {
          const conversation = this.parseMetaConversationTable(table, mediaFiles, index);
          if (conversation) {
            conversations.push(conversation);
          }
        });
      }
      
      console.log(`✅ Extracted ${conversations.length} conversations`);
      return conversations;
      
    } catch (error) {
      console.warn('⚠️ Error extracting unified messages:', error);
      return [];
    }
  }

  /**
   * Parse a Meta conversation table
   */
  private static parseMetaConversationTable(table: Element, mediaFiles: Map<string, Blob>, index: number): InstagramConversation | null {
    try {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return null; // Need at least header + 1 message
      
      const messages: InstagramMessage[] = [];
      const participants: Set<string> = new Set();
      
      // Skip header row and process message rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        
        if (cells.length === 0) continue;
        
        const message = this.parseMetaMessageRow(cells, mediaFiles, `conv_${index}_msg_${i}`);
        if (message) {
          messages.push(message);
          participants.add(message.sender);
        }
      }
      
      if (messages.length === 0) return null;
      
      const conversationId = `meta_conversation_${index}`;
      const participantList = Array.from(participants);
      
      const conversation: InstagramConversation = {
        id: conversationId,
        participants: participantList,
        messages: messages.map(msg => ({ ...msg, conversationId })),
        title: participantList.length > 1 ? `Chat: ${participantList.join(', ')}` : `Chat pessoal`,
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
      return conversation;
      
    } catch (error) {
      console.warn('⚠️ Error parsing Meta conversation table:', error);
      return null;
    }
  }

  /**
   * Parse a Meta conversation div
   */
  private static parseMetaConversationDiv(div: Element, mediaFiles: Map<string, Blob>, index: number): InstagramConversation | null {
    try {
      const messageDivs = div.querySelectorAll('div.i, div.m');
      const messages: InstagramMessage[] = [];
      const participants: Set<string> = new Set();
      
      messageDivs.forEach((messageDiv, msgIndex) => {
        const message = this.parseMetaMessageDiv(messageDiv, mediaFiles, `conv_${index}_msg_${msgIndex}`);
        if (message) {
          messages.push(message);
          participants.add(message.sender);
        }
      });
      
      if (messages.length === 0) return null;
      
      const conversationId = `meta_conversation_${index}`;
      const participantList = Array.from(participants);
      
      const conversation: InstagramConversation = {
        id: conversationId,
        participants: participantList,
        messages: messages.map(msg => ({ ...msg, conversationId })),
        title: participantList.length > 1 ? `Chat: ${participantList.join(', ')}` : `Chat pessoal`,
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
      return conversation;
      
    } catch (error) {
      console.warn('⚠️ Error parsing Meta conversation div:', error);
      return null;
    }
  }

  /**
   * Parse individual message row from Meta table
   */
  private static parseMetaMessageRow(cells: Element[], mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    try {
      if (cells.length === 0) return null;
      
      let timestamp = new Date();
      let sender = 'Usuário';
      let content = '';
      let mediaType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let mediaPath = '';
      
      // Extract data from cells based on common patterns
      cells.forEach((cell, cellIndex) => {
        const cellText = this.extractTextContent(cell);
        
        // Try to identify timestamp (usually first or last cell)
        if (this.isTimestamp(cellText)) {
          const parsedTime = this.parseTimestamp(cellText);
          if (parsedTime) timestamp = parsedTime;
        }
        
        // Try to identify sender (usually contains names or usernames)
        else if (cellIndex === 0 && cellText.length < 100 && !this.isTimestamp(cellText)) {
          sender = cellText || 'Usuário';
        }
        
        // Content is usually the largest text cell
        else if (cellText.length > content.length) {
          content = cellText;
        }
        
        // Check for media links
        const links = cell.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          if (href.includes('media') || href.includes('attachment') || href.includes('linked_media')) {
            mediaType = this.determineMediaTypeFromPath(href);
            mediaPath = this.findLinkedMedia(href, mediaFiles);
          }
        });
      });
      
      const message: InstagramMessage = {
        id: messageId,
        conversationId: '', // Will be set later
        sender: sender || 'Usuário',
        content: content || '',
        timestamp,
        type: mediaType,
        mediaPath: mediaPath || undefined,
        reactions: []
      };
      
      return message;
      
    } catch (error) {
      console.warn('⚠️ Error parsing Meta message row:', error);
      return null;
    }
  }

  /**
   * Parse individual message div from Meta structure
   */
  private static parseMetaMessageDiv(div: Element, mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    try {
      const text = this.extractTextContent(div);
      if (!text) return null;
      
      // Parse patterns like "TIMESTAMP SENDER: MESSAGE"
      const patterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4}.*?\d{1,2}:\d{2})\s+(.+?):\s+(.+)/,
        /(.+?):\s+(.+)/,
        /(\d{1,2}\/\d{1,2}\/\d{4}.*?\d{1,2}:\d{2})\s+(.+)/
      ];
      
      let timestamp = new Date();
      let sender = 'Usuário';
      let content = text;
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          if (match.length === 4) {
            // Full pattern with timestamp, sender, content
            timestamp = this.parseTimestamp(match[1]) || new Date();
            sender = match[2];
            content = match[3];
          } else if (match.length === 3) {
            if (this.isTimestamp(match[1])) {
              timestamp = this.parseTimestamp(match[1]) || new Date();
              content = match[2];
            } else {
              sender = match[1];
              content = match[2];
            }
          }
          break;
        }
      }
      
      // Check for media references
      let mediaType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let mediaPath = '';
      
      const links = div.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes('media') || href.includes('attachment') || href.includes('linked_media')) {
          mediaType = this.determineMediaTypeFromPath(href);
          mediaPath = this.findLinkedMedia(href, mediaFiles);
        }
      });
      
      const message: InstagramMessage = {
        id: messageId,
        conversationId: '', // Will be set later
        sender: sender || 'Usuário',
        content: content || '',
        timestamp,
        type: mediaType,
        mediaPath: mediaPath || undefined,
        reactions: []
      };
      
      return message;
      
    } catch (error) {
      console.warn('⚠️ Error parsing Meta message div:', error);
      return null;
    }
  }

  /**
   * Extract users from processed data
   */
  private static extractUsersFromData(data: ProcessedInstagramData): InstagramUser[] {
    const users: Map<string, InstagramUser> = new Map();
    
    // Add main profile user
    if (data.profile) {
      users.set(data.profile.username, {
        id: data.profile.username,
        username: data.profile.username,
        displayName: data.profile.displayName || data.profile.username,
        profilePicture: data.profile.profilePicture,
        conversations: [],
        posts: 0,
        followers: 0,
        following: 0
      });
    }
    
    // Extract users from conversations
    data.conversations.forEach(conversation => {
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
        
        // Update user's conversation list
        const user = users.get(participant)!;
        user.conversations.push(conversation.id);
      });
    });
    
    return Array.from(users.values());
  }

  /**
   * Extract devices from Meta Business Record
   */
  private static extractMetaDevices(doc: Document): InstagramDevice[] {
    try {
      const devices: InstagramDevice[] = [];
      const devicesElement = doc.getElementById('property-devices');
      
      if (!devicesElement) return devices;
      
      const tables = devicesElement.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length >= 2) {
            const device: InstagramDevice = {
              uuid: `meta_device_${i}`,
              type: this.extractTextContent(cells[0]) || 'Unknown',
              deviceModel: this.extractTextContent(cells[1]) || 'Unknown',
              os: cells[2] ? this.extractTextContent(cells[2]) : 'Unknown',
              status: 'active',
              lastSeen: cells[3] ? this.parseTimestamp(this.extractTextContent(cells[3])) || new Date() : new Date(),
              ipAddresses: cells[4] ? [this.extractTextContent(cells[4])] : []
            };
            devices.push(device);
          }
        }
      });
      
      return devices;
    } catch (error) {
      console.warn('⚠️ Error extracting Meta devices:', error);
      return [];
    }
  }

  /**
   * Extract logins from Meta Business Record
   */
  private static extractMetaLogins(doc: Document): InstagramLogin[] {
    try {
      const logins: InstagramLogin[] = [];
      const loginsElement = doc.getElementById('property-logins');
      
      if (!loginsElement) return logins;
      
      const tables = loginsElement.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length >= 3) {
            const login: InstagramLogin = {
              timestamp: this.parseTimestamp(this.extractTextContent(cells[0])) || new Date(),
              ip: this.extractTextContent(cells[1]) || '',
              location: this.extractTextContent(cells[2]) || 'Unknown',
              device: cells[3] ? this.extractTextContent(cells[3]) : 'Unknown',
              success: !this.extractTextContent(cells[4] || cells[0]).toLowerCase().includes('failed')
            };
            logins.push(login);
          }
        }
      });
      
      return logins;
    } catch (error) {
      console.warn('⚠️ Error extracting Meta logins:', error);
      return [];
    }
  }

  /**
   * Process media files and create media objects
   */
  private static processMediaFiles(mediaFiles: Map<string, Blob>): any[] {
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
        timestamp: new Date(),
        blob // Keep original blob for processing
      });
    });
    
    return media;
  }

  /**
   * Extract following/followers from Meta Business Record
   */
  private static extractMetaFollowing(doc: Document): InstagramFollowing[] {
    try {
      const following: InstagramFollowing[] = [];
      
      const followingElement = doc.getElementById('property-following');
      const followersElement = doc.getElementById('property-followers');
      
      if (followingElement) {
        const followingData = this.extractListFromElement(followingElement, 'following');
        following.push(...followingData);
      }
      
      if (followersElement) {
        const followersData = this.extractListFromElement(followersElement, 'follower');
        following.push(...followersData);
      }
      
      return following;
    } catch (error) {
      console.warn('⚠️ Error extracting Meta following:', error);
      return [];
    }
  }

  // Helper Methods
  private static extractTextContent(element: Element): string {
    return element.textContent?.trim() || '';
  }

  private static extractAllTextContent(element: Element): string[] {
    const texts: string[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) {
        texts.push(text);
      }
    }
    
    return texts;
  }

  private static extractListFromElement(element: Element, type: 'following' | 'follower'): InstagramFollowing[] {
    const list: InstagramFollowing[] = [];
    const items = element.querySelectorAll('div.m, td, li');
    
    items.forEach((item, index) => {
      const text = this.extractTextContent(item);
      if (text && text.length > 0 && text.length < 100) {
        list.push({
          username: text,
          displayName: text,
          followDate: new Date(),
          followType: type as 'following' | 'follower'
        });
      }
    });
    
    return list;
  }

  private static findLinkedMedia(href: string, mediaFiles: Map<string, Blob>): string | undefined {
    // Extract filename from href
    const filename = href.split('/').pop() || '';
    
    // Look for exact match
    if (mediaFiles.has(filename)) {
      return filename;
    }
    
    // Look for partial matches
    for (const [mediaFilename] of mediaFiles) {
      if (mediaFilename.includes(filename) || filename.includes(mediaFilename)) {
        return mediaFilename;
      }
    }
    
    return undefined;
  }

  private static isTimestamp(text: string): boolean {
    // Check for various timestamp formats
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}.*?\d{1,2}:\d{2}/,
      /\d{4}-\d{2}-\d{2}.*?\d{2}:\d{2}/,
      /\d{1,2}:\d{2}/
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  private static parseTimestamp(text: string): Date | null {
    if (!text) return null;
    
    try {
      // Try different date formats
      const formats = [
        // MM/DD/YYYY HH:mm
        /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/,
        // YYYY-MM-DD HH:mm
        /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,
        // DD/MM/YYYY HH:mm
        /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/
      ];
      
      for (const format of formats) {
        const match = text.match(format);
        if (match) {
          if (format === formats[0] || format === formats[2]) {
            // MM/DD/YYYY or DD/MM/YYYY
            const [, month, day, year, hour, minute] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
          } else {
            // YYYY-MM-DD
            const [, year, month, day, hour, minute] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
          }
        }
      }
      
      // Fallback to Date.parse
      return new Date(text);
    } catch (error) {
      console.warn('⚠️ Error parsing timestamp:', text, error);
      return null;
    }
  }

  private static determineMediaTypeFromPath(path: string): 'text' | 'image' | 'video' | 'audio' | 'link' {
    const ext = path.toLowerCase().split('.').pop() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      return 'audio';
    } else if (path.includes('http')) {
      return 'link';
    }
    
    return 'text';
  }
}