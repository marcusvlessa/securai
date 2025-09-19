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

/**
 * Enhanced parser specifically for Meta Business Record HTML structure
 * Maps all 40+ property sections and extracts data correctly
 */
export class InstagramParserEnhanced {
  
  // Meta Business Record property mappings
  private static readonly META_PROPERTIES = {
    REQUEST_PARAMETERS: 'property-request_parameters',
    NCMEC_REPORTS: 'property-ncmec_reports', 
    NAME: 'property-name',
    EMAILS: 'property-emails',
    VANITY: 'property-vanity',
    REGISTRATION_DATE: 'property-registration_date',
    REGISTRATION_IP: 'property-registration_ip',
    PHONE_NUMBERS: 'property-phone_numbers',
    LOGINS: 'property-logins',
    IP_ADDRESSES: 'property-ip_addresses',
    DEVICES: 'property-devices',
    FOLLOWING: 'property-following',
    FOLLOWERS: 'property-followers',
    LAST_LOCATION: 'property-last_location',
    PHOTOS: 'property-photos',
    PROFILE_PICTURE: 'property-profile_picture',
    COMMENTS: 'property-comments',
    VIDEOS: 'property-videos',
    LIVE_VIDEOS: 'property-live_videos',
    ARCHIVED_LIVE_VIDEOS: 'property-archived_live_videos',
    NOTES: 'property-notes',
    UNIFIED_MESSAGES: 'property-unified_messages',
    REPORTED_CONVERSATIONS: 'property-reported_conversations',
    REPORTED_DISAPPEARING_MESSAGES: 'property-reported_disappearing_messages',
    ARCHIVED_STORIES: 'property-archived_stories',
    ENCRYPTED_GROUPS_INFO: 'property-encrypted_groups_info',
    THREADS_PROFILE_PICTURE: 'property-threads_profile_picture',
    THREADS_FOLLOWING: 'property-threads_following',
    THREADS_FOLLOWERS: 'property-threads_followers',
    THREADS_REGISTRATION_DATE: 'property-threads_registration_date',
    THREADS_POSTS_AND_REPLIES: 'property-threads_posts_and_replies',
    THREADS_ARCHIVED_STORIES: 'property-threads_archived_stories',
    COMMUNITY_NOTES: 'property-community_notes',
    THREADS_COMMUNITY_NOTES: 'property-threads_community_notes',
    ARCHIVED_QUICKSNAP: 'property-archived_quicksnap',
    THREADS_UNIFIED_MESSAGES: 'property-threads_unified_messages',
    SHARED_ACCESS: 'property-shared_access',
    LAST_LOCATION_AREA: 'property-last_location_area',
    ACCOUNT_OWNER_SHARED_ACCESS: 'property-account_owner_shared_access',
    UNARCHIVED_STORIES: 'property-unarchived_stories'
  };

  /**
   * Main parsing entry point for Meta Business Record
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record Enhanced Parsing...');
      
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
        followers: [],
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

      // Track which sections were found
      const sectionsFound = this.detectAvailableSections(doc);
      processedData.metadata.sectionsFound = sectionsFound;
      console.log('📋 Sections found:', sectionsFound);

      // Extract profile information (Name + Vanity + Emails + Phone)
      console.log('👤 Extracting user profile...');
      processedData.profile = this.extractMainUserProfile(doc);
      
      // Extract unified messages (conversations)
      console.log('💬 Extracting unified messages...');
      processedData.conversations = this.extractUnifiedMessagesAdvanced(doc, mediaFiles);
      
      // Extract devices information
      console.log('📱 Extracting devices...');
      processedData.devices = this.extractDevicesInfo(doc);
      
      // Extract login history
      console.log('🔐 Extracting login history...');
      processedData.logins = this.extractLoginHistory(doc);
      
      // Extract social connections
      console.log('👥 Extracting following/followers...');
      const socialConnections = this.extractSocialConnections(doc);
      processedData.following = socialConnections.following;
      processedData.followers = socialConnections.followers;
      
      // Process media files
      console.log('📸 Processing media files...');
      processedData.media = this.processMediaFiles(mediaFiles);
      
      // Extract users from conversations
      console.log('👥 Extracting users...');
      processedData.users = this.extractUsersFromData(processedData);
      
      console.log('✅ Meta Business Record Parsing Complete:', {
        profile: processedData.profile ? `${processedData.profile.displayName} (${processedData.profile.username})` : 'Not found',
        conversations: processedData.conversations.length,
        users: processedData.users.length,
        devices: processedData.devices.length,
        logins: processedData.logins.length,
        media: processedData.media.length,
        sectionsFound: sectionsFound.length
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Erro no parsing Meta Business Record:', error);
      throw new Error(`Falha no parsing: ${error.message}`);
    }
  }

  /**
   * Detect which Meta property sections are available in the document
   */
  private static detectAvailableSections(doc: Document): string[] {
    const sectionsFound: string[] = [];
    
    Object.entries(this.META_PROPERTIES).forEach(([key, propertyId]) => {
      const element = doc.getElementById(propertyId);
      if (element) {
        sectionsFound.push(key);
      }
    });
    
    return sectionsFound;
  }

  /**
   * Extract main user profile from Name, Vanity, Emails sections
   */
  private static extractMainUserProfile(doc: Document): InstagramProfile | null {
    try {
      console.log('🔍 Extracting main user profile...');
      
      // Extract from property-name section
      const nameElement = doc.getElementById(this.META_PROPERTIES.NAME);
      const nameText = nameElement ? this.extractTextContent(nameElement) : '';
      console.log('📝 Name found:', nameText);
      
      // Extract from property-vanity section (username)
      const vanityElement = doc.getElementById(this.META_PROPERTIES.VANITY);
      const vanityText = vanityElement ? this.extractTextContent(vanityElement) : '';
      console.log('🏷️ Vanity found:', vanityText);
      
      // Extract emails
      const emailsElement = doc.getElementById(this.META_PROPERTIES.EMAILS);
      const emails = emailsElement ? this.extractListContent(emailsElement) : [];
      
      // Extract phone numbers
      const phoneElement = doc.getElementById(this.META_PROPERTIES.PHONE_NUMBERS);
      const phones = phoneElement ? this.extractListContent(phoneElement) : [];
      
      // Extract registration info
      const regDateElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_DATE);
      const regIPElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_IP);
      
      const registrationDate = regDateElement ? this.parseTimestamp(this.extractTextContent(regDateElement)) : undefined;
      const registrationIP = regIPElement ? this.extractTextContent(regIPElement) : undefined;
      
      if (!nameText && !vanityText) {
        console.warn('⚠️ No profile data found');
        return null;
      }
      
      const profile: InstagramProfile = {
        username: vanityText || this.generateUsernameFromName(nameText),
        displayName: nameText || vanityText,
        email: emails,
        phone: phones,
        profilePicture: undefined,
        accountStatus: 'active',
        verificationStatus: 'unverified',
        registrationDate,
        registrationIP
      };
      
      console.log('✅ Main user profile extracted:', {
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.email.length,
        phones: profile.phone.length
      });
      
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Error extracting main user profile:', error);
      return null;
    }
  }

  /**
   * Advanced unified messages extraction - handles Thread structure
   */
  private static extractUnifiedMessagesAdvanced(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    try {
      console.log('🔍 Extracting unified messages...');
      
      const unifiedElement = doc.getElementById(this.META_PROPERTIES.UNIFIED_MESSAGES);
      if (!unifiedElement) {
        console.warn('⚠️ No unified messages section found');
        return [];
      }
      
      const conversations: InstagramConversation[] = [];
      
      // Look for Thread structures - Meta Business Records organize messages by Thread ID
      const threadElements = this.findThreadElements(unifiedElement);
      console.log(`📊 Found ${threadElements.length} thread elements`);
      
      threadElements.forEach((threadElement, index) => {
        const conversation = this.parseThreadElement(threadElement, mediaFiles, index);
        if (conversation) {
          conversations.push(conversation);
        }
      });
      
      // Fallback: try table-based extraction if no threads found
      if (conversations.length === 0) {
        console.log('🔄 Fallback: trying table-based extraction...');
        const tables = unifiedElement.querySelectorAll('table');
        
        tables.forEach((table, index) => {
          const conversation = this.parseMessageTable(table, mediaFiles, index);
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
   * Find Thread elements in the unified messages section
   */
  private static findThreadElements(unifiedElement: Element): Element[] {
    const threadElements: Element[] = [];
    
    // Look for elements containing "Thread" text
    const walker = document.createTreeWalker(
      unifiedElement,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Element) => {
          const text = node.textContent || '';
          if (text.includes('Thread') && !text.includes('Current Participants')) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      // Find the container that includes the full thread data
      let container = node as Element;
      while (container && !this.isThreadContainer(container)) {
        container = container.parentElement!;
      }
      
      if (container && !threadElements.includes(container)) {
        threadElements.push(container);
      }
    }
    
    return threadElements;
  }

  /**
   * Check if element is a thread container
   */
  private static isThreadContainer(element: Element): boolean {
    const text = element.textContent || '';
    return text.includes('Thread') && 
           text.includes('Current Participants') && 
           (text.includes('Author') || text.includes('Sent'));
  }

  /**
   * Parse individual thread element
   */
  private static parseThreadElement(threadElement: Element, mediaFiles: Map<string, Blob>, index: number): InstagramConversation | null {
    try {
      const text = threadElement.textContent || '';
      
      // Extract Thread ID
      const threadIdMatch = text.match(/Thread\s+([^\s]+)/);
      const threadId = threadIdMatch ? threadIdMatch[1] : `thread_${index}`;
      
      // Extract Current Participants
      const participantsMatch = text.match(/Current Participants\s*(.+?)(?=Thread|Author|$)/s);
      const participantsText = participantsMatch ? participantsMatch[1] : '';
      const participants = this.extractParticipants(participantsText);
      
      console.log(`📝 Thread ${threadId} participants:`, participants);
      
      // Extract messages from this thread
      const messages = this.extractMessagesFromThread(threadElement, mediaFiles, threadId);
      
      if (messages.length === 0) {
        console.warn(`⚠️ No messages found in thread ${threadId}`);
        return null;
      }
      
      const conversation: InstagramConversation = {
        id: threadId,
        participants,
        messages: messages.map(msg => ({ ...msg, conversationId: threadId })),
        title: participants.length > 1 ? participants.join(' • ') : 'Conversa pessoal',
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
      console.log(`✅ Thread ${threadId} parsed: ${messages.length} messages, ${participants.length} participants`);
      return conversation;
      
    } catch (error) {
      console.warn('⚠️ Error parsing thread element:', error);
      return null;
    }
  }

  /**
   * Extract participants from participants text
   */
  private static extractParticipants(participantsText: string): string[] {
    const participants: string[] = [];
    
    // Split by common separators and clean
    const parts = participantsText.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    
    parts.forEach(part => {
      // Remove common labels and extract names
      const cleaned = part.replace(/^(Name:|User:|Participant:)/i, '').trim();
      if (cleaned && cleaned.length > 0 && !cleaned.match(/^(Thread|Author|Sent|Current)/)) {
        participants.push(cleaned);
      }
    });
    
    // Fallback: if no participants found, try to extract from nearby context
    if (participants.length === 0) {
      const names = participantsText.match(/[A-Za-z][A-Za-z\s]{2,30}/g);
      if (names) {
        participants.push(...names.slice(0, 5)); // Limit to 5 names
      }
    }
    
    return [...new Set(participants)]; // Remove duplicates
  }

  /**
   * Extract messages from thread element
   */
  private static extractMessagesFromThread(threadElement: Element, mediaFiles: Map<string, Blob>, threadId: string): InstagramMessage[] {
    const messages: InstagramMessage[] = [];
    
    // Look for message patterns in tables or divs
    const tables = threadElement.querySelectorAll('table');
    
    tables.forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      
      rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length >= 2) {
          const message = this.parseMessageRow(cells, mediaFiles, `${threadId}_msg_${rowIndex}`);
          if (message) {
            messages.push(message);
          }
        }
      });
    });
    
    // If no table messages, try div-based extraction
    if (messages.length === 0) {
      const divs = threadElement.querySelectorAll('div.o, div.i, div.m');
      divs.forEach((div, divIndex) => {
        const message = this.parseMessageDiv(div, mediaFiles, `${threadId}_msg_${divIndex}`);
        if (message) {
          messages.push(message);
        }
      });
    }
    
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Parse message from table row
   */
  private static parseMessageRow(cells: Element[], mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    try {
      if (cells.length === 0) return null;
      
      let timestamp = new Date();
      let sender = 'Unknown';
      let content = '';
      let mediaType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let mediaPath = '';
      
      // Extract data from cells - Meta format usually has: Author, Sent, Content
      cells.forEach((cell, cellIndex) => {
        const cellText = this.extractTextContent(cell);
        
        // Header cells detection
        if (cellText.toLowerCase().includes('author') || 
            cellText.toLowerCase().includes('sent') || 
            cellText.toLowerCase().includes('content') ||
            cellText.toLowerCase().includes('share')) {
          return; // Skip header cells
        }
        
        // Timestamp detection (usually contains date/time patterns)
        if (this.isTimestamp(cellText)) {
          const parsedTime = this.parseTimestamp(cellText);
          if (parsedTime) timestamp = parsedTime;
        }
        // Author/Sender detection (first non-timestamp cell, usually short)
        else if (cellIndex <= 2 && cellText.length < 100 && cellText.length > 0 && !this.isTimestamp(cellText)) {
          sender = cellText;
        }
        // Content detection (usually longest text)
        else if (cellText.length > content.length) {
          content = cellText;
        }
        
        // Media detection
        const links = cell.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          if (href.includes('linked_media') || href.includes('media')) {
            mediaType = this.determineMediaTypeFromPath(href);
            mediaPath = this.findLinkedMedia(href, mediaFiles);
          }
        });
      });
      
      // Skip if no meaningful content
      if (!content && mediaType === 'text') return null;
      
      const message: InstagramMessage = {
        id: messageId,
        conversationId: '',
        sender: sender || 'Unknown',
        content: content || '',
        timestamp,
        type: mediaType,
        mediaPath: mediaPath || undefined,
        reactions: []
      };
      
      return message;
      
    } catch (error) {
      console.warn('⚠️ Error parsing message row:', error);
      return null;
    }
  }

  /**
   * Parse message from div element
   */
  private static parseMessageDiv(div: Element, mediaFiles: Map<string, Blob>, messageId: string): InstagramMessage | null {
    try {
      const text = this.extractTextContent(div);
      if (!text || text.length < 3) return null;
      
      // Pattern matching for different message formats
      const patterns = [
        /(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4}[^\s]*\s+\d{1,2}:\d{2}[^\s]*)\s+(.+)/,
        /(\d{1,2}\/\d{1,2}\/\d{4}[^\s]*\s+\d{1,2}:\d{2}[^\s]*)\s+(.+?)\s+(.+)/,
        /(.+?):\s+(.+)/
      ];
      
      let timestamp = new Date();
      let sender = 'Unknown';
      let content = text;
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          if (match.length === 4) {
            if (this.isTimestamp(match[2])) {
              sender = match[1];
              timestamp = this.parseTimestamp(match[2]) || new Date();
              content = match[3];
            } else if (this.isTimestamp(match[1])) {
              timestamp = this.parseTimestamp(match[1]) || new Date();
              sender = match[2];
              content = match[3];
            }
          } else if (match.length === 3) {
            sender = match[1];
            content = match[2];
          }
          break;
        }
      }
      
      // Media detection
      let mediaType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let mediaPath = '';
      
      const links = div.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes('linked_media') || href.includes('media')) {
          mediaType = this.determineMediaTypeFromPath(href);
          mediaPath = this.findLinkedMedia(href, mediaFiles);
        }
      });
      
      const message: InstagramMessage = {
        id: messageId,
        conversationId: '',
        sender: sender || 'Unknown',
        content: content || '',
        timestamp,
        type: mediaType,
        mediaPath: mediaPath || undefined,
        reactions: []
      };
      
      return message;
      
    } catch (error) {
      console.warn('⚠️ Error parsing message div:', error);
      return null;
    }
  }

  /**
   * Parse message table (fallback method)
   */
  private static parseMessageTable(table: Element, mediaFiles: Map<string, Blob>, index: number): InstagramConversation | null {
    try {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return null;
      
      const messages: InstagramMessage[] = [];
      const participants: Set<string> = new Set();
      
      Array.from(rows).forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // Skip header
        
        const cells = Array.from(row.querySelectorAll('td'));
        const message = this.parseMessageRow(cells, mediaFiles, `table_${index}_msg_${rowIndex}`);
        
        if (message) {
          messages.push(message);
          participants.add(message.sender);
        }
      });
      
      if (messages.length === 0) return null;
      
      const conversationId = `table_conversation_${index}`;
      const participantList = Array.from(participants);
      
      return {
        id: conversationId,
        participants: participantList,
        messages: messages.map(msg => ({ ...msg, conversationId })),
        title: participantList.join(' • '),
        createdAt: messages[0]?.timestamp || new Date(),
        lastActivity: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        mediaCount: messages.filter(m => m.type !== 'text').length
      };
      
    } catch (error) {
      console.warn('⚠️ Error parsing message table:', error);
      return null;
    }
  }

  /**
   * Extract devices information
   */
  private static extractDevicesInfo(doc: Document): InstagramDevice[] {
    try {
      const devicesElement = doc.getElementById(this.META_PROPERTIES.DEVICES);
      if (!devicesElement) return [];
      
      const devices: InstagramDevice[] = [];
      const deviceData = this.extractTableData(devicesElement);
      
      deviceData.forEach((row, index) => {
        if (row.length >= 2) {
        devices.push({
          id: uuidv4(),
          uuid: row[0] || `device_${index}`,
          deviceType: this.determineDeviceType(row.join(' ')),
          deviceName: row[1] || 'Unknown',
          deviceModel: row[1] || 'Unknown',
          os: row[2] || 'Unknown',
          lastSeen: this.parseTimestamp(row[row.length - 1]) || new Date(),
          lastUsed: this.parseTimestamp(row[row.length - 1]) || new Date(),
          ipAddress: this.extractIPFromText(row.join(' ')) || undefined,
          ipAddresses: this.extractIPFromText(row.join(' ')) ? [this.extractIPFromText(row.join(' '))!] : [],
          appVersion: 'Unknown',
          status: 'active' as const
        });
        }
      });
      
      return devices;
    } catch (error) {
      console.warn('⚠️ Error extracting devices info:', error);
      return [];
    }
  }

  /**
   * Extract login history
   */
  private static extractLoginHistory(doc: Document): InstagramLogin[] {
    try {
      const loginsElement = doc.getElementById(this.META_PROPERTIES.LOGINS);
      if (!loginsElement) return [];
      
      const logins: InstagramLogin[] = [];
      const loginData = this.extractTableData(loginsElement);
      
      loginData.forEach((row, index) => {
        if (row.length >= 2) {
          logins.push({
            id: uuidv4(),
            timestamp: this.parseTimestamp(row[0]) || new Date(),
            ipAddress: this.extractIPFromText(row.join(' ')) || 'Unknown',
            ip: this.extractIPFromText(row.join(' ')) || 'Unknown',
            location: this.extractLocationFromText(row.join(' ')) || 'Unknown',
            device: row[2] || 'Unknown',
            success: !row.join(' ').toLowerCase().includes('failed')
          });
        }
      });
      
      return logins;
    } catch (error) {
      console.warn('⚠️ Error extracting login history:', error);
      return [];
    }
  }

  /**
   * Extract social connections
   */
  private static extractSocialConnections(doc: Document): { following: InstagramFollowing[], followers: InstagramFollowing[] } {
    try {
      const following: InstagramFollowing[] = [];
      const followers: InstagramFollowing[] = [];
      
      // Extract following
      const followingElement = doc.getElementById(this.META_PROPERTIES.FOLLOWING);
      if (followingElement) {
        const followingData = this.extractTableData(followingElement);
        followingData.forEach((row, index) => {
          if (row.length >= 1) {
            following.push({
              id: `following-${row[0]}-${index}`,
              username: row[0] || `user_${index}`,
              displayName: row[1] || row[0] || `User ${index}`,
              timestamp: this.parseTimestamp(row[row.length - 1]) || new Date(),
              type: 'following' as const
            });
          }
        });
      }
      
      // Extract followers
      const followersElement = doc.getElementById(this.META_PROPERTIES.FOLLOWERS);
      if (followersElement) {
        const followersData = this.extractTableData(followersElement);
        followersData.forEach((row, index) => {
          if (row.length >= 1) {
            followers.push({
              id: `follower-${row[0]}-${index}`,
              username: row[0] || `user_${index}`,
              displayName: row[1] || row[0] || `User ${index}`,
              timestamp: this.parseTimestamp(row[row.length - 1]) || new Date(),
              type: 'follower' as const
            });
          }
        });
      }
      
      return { following, followers };
    } catch (error) {
      console.warn('⚠️ Error extracting social connections:', error);
      return { following: [], followers: [] };
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
        followers: data.followers?.filter(f => f.type === 'follower').length || 0,
        following: data.following?.filter(f => f.type === 'following').length || 0,
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
        
        const user = users.get(participant)!;
        if (!user.conversations.includes(conversation.id)) {
          user.conversations.push(conversation.id);
        }
      });
    });
    
    return Array.from(users.values());
  }

  /**
   * Process media files
   */
  private static processMediaFiles(mediaFiles: Map<string, Blob>): any[] {
    const media: any[] = [];
    
    mediaFiles.forEach((blob, filename) => {
      media.push({
        filename,
        blob,
        url: URL.createObjectURL(blob),
        type: this.determineMediaTypeFromPath(filename),
        size: blob.size,
        lastModified: new Date()
      });
    });
    
    return media;
  }

  // Helper methods
  private static extractTextContent(element: Element): string {
    return element.textContent?.trim() || '';
  }

  private static extractListContent(element: Element): string[] {
    const text = this.extractTextContent(element);
    return text.split(/[,\n]/).map(item => item.trim()).filter(item => item.length > 0);
  }

  private static extractTableData(element: Element): string[][] {
    const data: string[][] = [];
    const rows = element.querySelectorAll('tr');
    
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const rowData = cells.map(cell => this.extractTextContent(cell));
      if (rowData.some(cell => cell.length > 0)) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  private static generateUsernameFromName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'user';
  }

  private static isTimestamp(text: string): boolean {
    return /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/.test(text);
  }

  private static parseTimestamp(timestampStr: string): Date | null {
    try {
      // Try different timestamp formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/,
        /(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/
      ];
      
      for (const format of formats) {
        const match = timestampStr.match(format);
        if (match) {
          if (match.length === 6) {
            // Full datetime
            return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]), parseInt(match[4]), parseInt(match[5]));
          } else if (match.length === 4) {
            // Date only
            return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          }
        }
      }
      
      // Fallback to Date.parse
      const parsed = Date.parse(timestampStr);
      return isNaN(parsed) ? null : new Date(parsed);
    } catch {
      return null;
    }
  }

  private static determineMediaTypeFromPath(path: string): 'text' | 'image' | 'video' | 'audio' | 'link' {
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('.jpg') || lowerPath.includes('.png') || lowerPath.includes('.jpeg') || lowerPath.includes('.webp')) {
      return 'image';
    } else if (lowerPath.includes('.mp4') || lowerPath.includes('.mov') || lowerPath.includes('.avi')) {
      return 'video';
    } else if (lowerPath.includes('.mp3') || lowerPath.includes('.wav') || lowerPath.includes('.m4a')) {
      return 'audio';
    } else if (lowerPath.includes('http')) {
      return 'link';
    }
    return 'text';
  }

  private static findLinkedMedia(href: string, mediaFiles: Map<string, Blob>): string {
    // Try to match the href with available media files
    const filename = href.split('/').pop() || href;
    
    for (const [mediaFilename] of mediaFiles) {
      if (mediaFilename.includes(filename) || filename.includes(mediaFilename)) {
        return mediaFilename;
      }
    }
    
    return href;
  }

  private static determineDeviceType(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('iphone') || lowerText.includes('ios')) return 'iPhone';
    if (lowerText.includes('android')) return 'Android';
    if (lowerText.includes('web') || lowerText.includes('browser')) return 'Web';
    if (lowerText.includes('desktop')) return 'Desktop';
    return 'Unknown';
  }

  private static extractIPFromText(text: string): string | undefined {
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const match = text.match(ipPattern);
    return match ? match[0] : undefined;
  }

  private static extractLocationFromText(text: string): string | undefined {
    // Simple location extraction - can be enhanced
    const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
    const match = text.match(locationPattern);
    return match ? `${match[1]}, ${match[2]}` : undefined;
  }
}