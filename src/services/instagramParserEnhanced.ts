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
 * Handles the real HTML structure with classes: .t (table), .o (outer), .i (inner), .m (most inner)
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
      processedData.metadata!.sectionsFound = sectionsFound;
      console.log('📄 Sections found:', sectionsFound);

      // Extract main user profile
      processedData.profile = this.extractMainUserProfile(doc);
      
      // Extract conversations and messages
      processedData.conversations = this.extractUnifiedMessagesAdvanced(doc, mediaFiles);
      
      // Extract devices information
      processedData.devices = this.extractDevicesInfo(doc);
      
      // Extract login history  
      processedData.logins = this.extractLoginHistory(doc);
      
      // Extract social connections
      const socialConnections = this.extractSocialConnections(doc);
      processedData.following = socialConnections.following;
      processedData.followers = socialConnections.followers;
      
      // Extract all users from conversations and profile
      processedData.users = this.extractUsersFromData(processedData);
      
      // Process media files
      processedData.media = this.processMediaFiles(mediaFiles);
      
      console.log('✅ Meta Business Record parsing completed');
      console.log(`📊 Stats: ${processedData.users.length} users, ${processedData.conversations.length} conversations, ${processedData.media.length} media files`);
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Error in Meta Business Record parsing:', error);
      throw new Error(`Enhanced parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect which property sections are available in the document
   */
  private static detectAvailableSections(doc: Document): string[] {
    const sections: string[] = [];
    
    Object.entries(this.META_PROPERTIES).forEach(([key, propertyId]) => {
      const element = doc.getElementById(propertyId);
      if (element) {
        sections.push(key);
      }
    });
    
    console.log(`🔍 Found ${sections.length} available sections`);
    return sections;
  }

  /**
   * Extract main user profile from Meta Business Record
   */
  private static extractMainUserProfile(doc: Document): InstagramProfile | null {
    try {
      console.log('🔍 Extracting main user profile...');
      
      // Extract from property-name section
      const nameElement = doc.getElementById(this.META_PROPERTIES.NAME);
      let nameText = '';
      if (nameElement) {
        const nameContent = this.extractTextContent(nameElement);
        // Clean the name - remove extra text and get only the actual name
        nameText = this.cleanNameText(nameContent);
      }
      console.log('👤 Name found:', nameText);
      
      // Extract from property-vanity section (username)
      const vanityElement = doc.getElementById(this.META_PROPERTIES.VANITY);
      let vanityText = '';
      if (vanityElement) {
        const vanityContent = this.extractTextContent(vanityElement);
        vanityText = this.cleanVanityText(vanityContent);
      }
      console.log('🏷️ Vanity found:', vanityText);
      
      // Extract emails
      const emailsElement = doc.getElementById(this.META_PROPERTIES.EMAILS);
      const emails = emailsElement ? this.extractEmailsList(emailsElement) : [];
      
      // Extract phone numbers  
      const phoneElement = doc.getElementById(this.META_PROPERTIES.PHONE_NUMBERS);
      const phones = phoneElement ? this.extractPhonesList(phoneElement) : [];
      
      // Extract registration info
      const regDateElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_DATE);
      const regIPElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_IP);
      
      const registrationDate = regDateElement ? this.parseRegistrationDate(regDateElement) : undefined;
      const registrationIP = regIPElement ? this.extractIPFromElement(regIPElement) : undefined;
      
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
        phones: profile.phone.length,
        registrationIP: profile.registrationIP
      });
      
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Error extracting main user profile:', error);
      return null;
    }
  }

  /**
   * Extract text content from Meta Business Record hierarchical structure
   * The structure uses classes: .t (table), .o (outer), .i (inner), .m (most inner)
   */
  private static extractTextContent(element: Element): string {
    if (!element) return '';
    
    // Look for .m elements (most inner layer) which contain the actual data
    const mElements = element.querySelectorAll('.m');
    if (mElements.length > 0) {
      return Array.from(mElements)
        .map(el => el.textContent?.trim() || '')
        .filter(text => text && 
          !text.includes('Definition') && 
          !text.includes('The name of the user') &&
          !text.includes('This is the') &&
          text.length > 2
        )
        .join(' ');
    }
    
    // Fallback: get all text but filter out definitions
    const allText = element.textContent?.trim() || '';
    const lines = allText.split('\n').map(line => line.trim()).filter(line => 
      line && 
      !line.includes('Definition') && 
      !line.includes('The name of the user') &&
      !line.includes('This is the') &&
      line.length > 2
    );
    
    return lines.join(' ');
  }

  /**
   * Clean name text to extract only the actual name
   */
  private static cleanNameText(text: string): string {
    if (!text) return '';
    
    // Split by common separators and find the actual name
    const parts = text.split(/[\n\r]+/).map(part => part.trim()).filter(part => part);
    
    // Look for a part that looks like a name (contains letters and possibly spaces)
    const namePart = parts.find(part => 
      /^[A-Za-zÀ-ÿ\s]+$/.test(part) && 
      part.length > 2 &&
      !part.includes('Definition') &&
      !part.includes('The name') &&
      !part.includes('This is')
    );
    
    return namePart || parts[0] || '';
  }

  /**
   * Clean vanity text to extract only the username
   */
  private static cleanVanityText(text: string): string {
    if (!text) return '';
    
    // Split and find the actual username
    const parts = text.split(/[\n\r]+/).map(part => part.trim()).filter(part => part);
    
    // Look for a part that looks like a username
    const usernamePart = parts.find(part => 
      part.length > 2 &&
      !part.includes('Definition') &&
      !part.includes('This is') &&
      !part.includes('vanity')
    );
    
    return usernamePart || parts[0] || '';
  }

  /**
   * Extract emails from the emails element
   */
  private static extractEmailsList(element: Element): string[] {
    const emails: string[] = [];
    const content = this.extractTextContent(element);
    
    // Use regex to find email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex);
    
    if (matches) {
      emails.push(...matches);
    }
    
    return emails;
  }

  /**
   * Extract phone numbers from the phones element
   */
  private static extractPhonesList(element: Element): string[] {
    const phones: string[] = [];
    const content = this.extractTextContent(element);
    
    // Use regex to find phone numbers
    const phoneRegex = /[\+]?[\d\s\-\(\)]{10,}/g;
    const matches = content.match(phoneRegex);
    
    if (matches) {
      phones.push(...matches.map(phone => phone.trim()));
    }
    
    return phones;
  }

  /**
   * Parse registration date from element
   */
  private static parseRegistrationDate(element: Element): Date | undefined {
    const dateText = this.extractTextContent(element);
    if (!dateText) return undefined;
    
    try {
      return new Date(dateText);
    } catch {
      return undefined;
    }
  }

  /**
   * Extract IP address from element
   */
  private static extractIPFromElement(element: Element): string | undefined {
    const content = this.extractTextContent(element);
    
    // Use regex to find IP addresses
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    const match = content.match(ipRegex);
    
    return match ? match[0] : undefined;
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
      
      // Extract conversations from the .m elements
      const conversationEntries = this.extractConversationEntries(unifiedElement);
      
      conversationEntries.forEach((convData, index) => {
        const conversation: InstagramConversation = {
          id: `conv_${index}`,
          participants: convData.participants || [],
          messages: convData.messages || [],
          lastActivity: convData.lastActivity || new Date(),
          messageCount: convData.messages?.length || 0,
          createdAt: new Date(),
          mediaCount: 0
        };
        conversations.push(conversation);
      });
      
      console.log(`✅ Extracted ${conversations.length} conversations`);
      return conversations;
      
    } catch (error) {
      console.warn('⚠️ Error extracting unified messages:', error);
      return [];
    }
  }

  /**
   * Extract conversation entries from unified messages
   */
  private static extractConversationEntries(element: Element): any[] {
    const conversations: any[] = [];
    
    // Look for conversation patterns in the structure
    const mElements = element.querySelectorAll('.m');
    
    // Group elements by conversation
    let currentConv: any = null;
    
    Array.from(mElements).forEach(mEl => {
      const text = mEl.textContent?.trim() || '';
      
      if (text.includes('Thread') && !text.includes('Current Participants')) {
        // Start of new conversation
        if (currentConv) {
          conversations.push(currentConv);
        }
        currentConv = {
          name: text,
          participants: [],
          messages: [],
          lastActivity: new Date()
        };
      } else if (currentConv && text) {
        // Add content to current conversation
        if (text.includes('@')) {
          // Likely a participant
          currentConv.participants.push(text);
        } else if (text.length > 10) {
          // Likely a message
          currentConv.messages.push({
            id: `msg_${currentConv.messages.length}`,
            content: text,
            timestamp: new Date(),
            sender: 'Unknown',
            type: 'text'
          });
        }
      }
    });
    
    if (currentConv) {
      conversations.push(currentConv);
    }
    
    return conversations;
  }

  /**
   * Extract devices information from Meta Business Record
   */
  private static extractDevicesInfo(doc: Document): InstagramDevice[] {
    try {
      console.log('🔍 Extracting devices information...');
      
      const devicesElement = doc.getElementById(this.META_PROPERTIES.DEVICES);
      if (!devicesElement) {
        console.warn('⚠️ No devices section found');
        return [];
      }
      
      const devices: InstagramDevice[] = [];
      
      // Parse device information from the .m elements
      const deviceEntries = this.extractDeviceEntries(devicesElement);
      
      deviceEntries.forEach((deviceData, index) => {
        const device: InstagramDevice = {
          id: `device_${index}`,
          uuid: `uuid_${index}`,
          deviceType: deviceData.type || 'Unknown',
          deviceName: deviceData.name || `Device ${index + 1}`,
          status: 'active' as const,
          lastSeen: deviceData.lastSeen,
          ipAddress: deviceData.ip
        };
        devices.push(device);
      });
      
      console.log(`✅ Extracted ${devices.length} devices`);
      return devices;
      
    } catch (error) {
      console.warn('⚠️ Error extracting devices:', error);
      return [];
    }
  }

  /**
   * Extract device entries from devices element
   */
  private static extractDeviceEntries(element: Element): any[] {
    const devices: any[] = [];
    const mElements = element.querySelectorAll('.m');
    
    Array.from(mElements).forEach(mEl => {
      const text = mEl.textContent?.trim() || '';
      if (text && text.length > 5) {
        devices.push({
          type: this.guessDeviceType(text),
          name: text,
          lastSeen: new Date(),
          ip: this.extractIPFromText(text),
          userAgent: text
        });
      }
    });
    
    return devices;
  }

  /**
   * Guess device type from text
   */
  private static guessDeviceType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('iphone') || lower.includes('ios')) return 'Mobile';
    if (lower.includes('android')) return 'Mobile';
    if (lower.includes('windows')) return 'Desktop';
    if (lower.includes('mac')) return 'Desktop';
    if (lower.includes('chrome') || lower.includes('firefox') || lower.includes('safari')) return 'Browser';
    return 'Unknown';
  }

  /**
   * Extract IP from text
   */
  private static extractIPFromText(text: string): string | undefined {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    const match = text.match(ipRegex);
    return match ? match[0] : undefined;
  }

  /**
   * Extract login history from Meta Business Record
   */
  private static extractLoginHistory(doc: Document): InstagramLogin[] {
    try {
      console.log('🔍 Extracting login history...');
      
      const loginsElement = doc.getElementById(this.META_PROPERTIES.LOGINS);
      if (!loginsElement) {
        console.warn('⚠️ No logins section found');
        return [];
      }
      
      const logins: InstagramLogin[] = [];
      
      // Parse login entries from the .m elements
      const loginEntries = this.extractLoginEntries(loginsElement);
      
      loginEntries.forEach((loginData, index) => {
        const login: InstagramLogin = {
          id: `login_${index}`,
          timestamp: loginData.timestamp || new Date(),
          ip: loginData.ip || 'Unknown',
          location: loginData.location || 'Unknown',
          device: loginData.device || 'Unknown',
          success: loginData.success !== false
        };
        logins.push(login);
      });
      
      console.log(`✅ Extracted ${logins.length} login records`);
      return logins;
      
    } catch (error) {
      console.warn('⚠️ Error extracting login history:', error);
      return [];
    }
  }

  /**
   * Extract login entries from logins element
   */
  private static extractLoginEntries(element: Element): any[] {
    const logins: any[] = [];
    const mElements = element.querySelectorAll('.m');
    
    Array.from(mElements).forEach(mEl => {
      const text = mEl.textContent?.trim() || '';
      if (text && text.length > 5) {
        logins.push({
          timestamp: this.extractDateFromText(text) || new Date(),
          ip: this.extractIPFromText(text) || 'Unknown',
          location: this.extractLocationFromText(text) || 'Unknown',
          device: text,
          success: !text.toLowerCase().includes('failed')
        });
      }
    });
    
    return logins;
  }

  /**
   * Extract date from text
   */
  private static extractDateFromText(text: string): Date | undefined {
    // Try to find date patterns
    const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/;
    const match = text.match(dateRegex);
    
    if (match) {
      try {
        return new Date(match[0]);
      } catch {
        return undefined;
      }
    }
    
    return undefined;
  }

  /**
   * Extract location from text
   */
  private static extractLocationFromText(text: string): string | undefined {
    // Look for location patterns
    const parts = text.split(/[,;\n]/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 2 && 
          !trimmed.includes(':') && 
          !this.extractIPFromText(trimmed) &&
          !/\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed;
      }
    }
    
    return undefined;
  }

  /**
   * Extract social connections (following/followers)
   */
  private static extractSocialConnections(doc: Document): { following: InstagramFollowing[], followers: InstagramFollowing[] } {
    try {
      console.log('🔍 Extracting social connections...');
      
      const followingElement = doc.getElementById(this.META_PROPERTIES.FOLLOWING);
      const followersElement = doc.getElementById(this.META_PROPERTIES.FOLLOWERS);
      
      const following: InstagramFollowing[] = [];
      const followers: InstagramFollowing[] = [];
      
      if (followingElement) {
        const followingEntries = this.extractFollowingEntries(followingElement);
        followingEntries.forEach((entry, index) => {
          following.push({
            id: `following_${index}`,
            username: entry.username || `user_${index}`,
            displayName: entry.displayName,
            timestamp: entry.timestamp || new Date(),
            type: 'following'
          });
        });
      }
      
      if (followersElement) {
        const followerEntries = this.extractFollowingEntries(followersElement);
        followerEntries.forEach((entry, index) => {
          followers.push({
            id: `follower_${index}`,
            username: entry.username || `user_${index}`,
            displayName: entry.displayName,
            timestamp: entry.timestamp || new Date(),
            type: 'follower'
          });
        });
      }
      
      console.log(`✅ Extracted ${following.length} following, ${followers.length} followers`);
      return { following, followers };
      
    } catch (error) {
      console.warn('⚠️ Error extracting social connections:', error);
      return { following: [], followers: [] };
    }
  }

  /**
   * Extract following/follower entries from element
   */
  private static extractFollowingEntries(element: Element): any[] {
    const entries: any[] = [];
    const mElements = element.querySelectorAll('.m');
    
    Array.from(mElements).forEach(mEl => {
      const text = mEl.textContent?.trim() || '';
      if (text && text.length > 2 && !text.includes('Definition')) {
        entries.push({
          username: text,
          displayName: text,
          timestamp: new Date()
        });
      }
    });
    
    return entries;
  }

  /**
   * Extract users from processed data
   */
  private static extractUsersFromData(data: ProcessedInstagramData): InstagramUser[] {
    const users: InstagramUser[] = [];
    const userMap = new Map<string, InstagramUser>();
    
    // Add main profile user
    if (data.profile) {
      const mainUser: InstagramUser = {
        id: uuidv4(),
        username: data.profile.username,
        displayName: data.profile.displayName || data.profile.username,
        profilePicture: data.profile.profilePicture,
        conversations: [],
        posts: 0,
        isMainUser: true
      };
      userMap.set(mainUser.username, mainUser);
    }
    
    // Add users from conversations
    data.conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (!userMap.has(participant)) {
          userMap.set(participant, {
            id: uuidv4(),
            username: participant,
            displayName: participant,
            conversations: [],
            posts: 0,
            isMainUser: false
          });
        }
      });
    });
    
    // Add users from following/followers
    [...data.following, ...data.followers].forEach(follow => {
      if (!userMap.has(follow.username)) {
        userMap.set(follow.username, {
          id: uuidv4(),
          username: follow.username,
          displayName: follow.displayName || follow.username,
          conversations: [],
          posts: 0,
          isMainUser: false
        });
      }
    });
    
    return Array.from(userMap.values());
  }

  /**
   * Process media files
   */
  private static processMediaFiles(mediaFiles: Map<string, Blob>): any[] {
    const media: any[] = [];
    
    mediaFiles.forEach((blob, filename) => {
      const url = URL.createObjectURL(blob);
      const mediaType = this.determineMediaTypeFromPath(filename);
      
      media.push({
        id: uuidv4(),
        filename,
        url,
        type: mediaType,
        size: blob.size,
        processedAt: new Date()
      });
    });
    
    return media;
  }

  /**
   * Determine media type from file path
   */
  private static determineMediaTypeFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'webm':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
        return 'audio';
      default:
        return 'unknown';
    }
  }

  /**
   * Generate username from name
   */
  private static generateUsernameFromName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Parse timestamp from text
   */
  private static parseTimestamp(text: string): Date | undefined {
    if (!text) return undefined;
    
    try {
      return new Date(text);
    } catch {
      return undefined;
    }
  }
}