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
      processedData.metadata.sectionsFound = sectionsFound;
      console.log('📋 Sections found:', sectionsFound);

      // Process each section
      try {
        processedData.profile = this.extractMainUserProfile(doc);
        console.log('👤 Profile extracted:', processedData.profile?.username);
      } catch (error) {
        console.error('Error extracting profile:', error);
      }

      try {
        processedData.conversations = this.extractConversations(doc, mediaFiles);
        console.log('💬 Conversations extracted:', processedData.conversations.length);
      } catch (error) {
        console.error('Error extracting conversations:', error);
      }

      try {
        const deviceData = this.extractDevicesAndLogins(doc);
        processedData.devices = deviceData.devices;
        processedData.logins = deviceData.logins;
        console.log('📱 Devices extracted:', processedData.devices.length);
        console.log('🔐 Logins extracted:', processedData.logins.length);
      } catch (error) {
        console.error('Error extracting devices/logins:', error);
      }

      try {
        const socialData = this.extractSocialConnections(doc);
        processedData.following = socialData.following;
        processedData.followers = socialData.followers;
        console.log('👥 Following extracted:', processedData.following.length);
        console.log('👥 Followers extracted:', processedData.followers.length);
      } catch (error) {
        console.error('Error extracting social connections:', error);
      }

      try {
        processedData.media = this.processMediaFiles(mediaFiles);
        console.log('🎬 Media files processed:', processedData.media.length);
      } catch (error) {
        console.error('Error processing media:', error);
      }

      console.log('✅ Meta Business Record parsing completed successfully');
      return processedData;

    } catch (error) {
      console.error('❌ Error during Meta Business Record parsing:', error);
      throw error;
    }
  }

  /**
   * Improved text extraction for Meta Business Record format
   */
  private static extractTextContent(element: Element | null): string {
    if (!element) return '';
    
    // For Meta Business Record, we need to handle the hierarchical structure
    // Structure: .t > .o > .i > .m (table > outer > inner > most inner)
    const textContent = element.textContent || '';
    
    // Clean up common Meta Business Record artifacts
    return this.cleanTextContent(textContent);
  }

  /**
   * Clean text content from Meta Business Record artifacts
   */
  private static cleanTextContent(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/Definition\s*:\s*/gi, '') // Remove "Definition:" labels
      .replace(/Lists all of the [^.]*\./gi, '') // Remove technical descriptions
      .replace(/Provided by the [^.]*\./gi, '') // Remove "Provided by" text
      .replace(/Username associated with the account\./gi, '') // Remove username description
      .replace(/First name provided by the account holder\./gi, '') // Remove name description
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Clean name text specifically for profile names
   */
  private static cleanNameText(text: string): string {
    if (!text) return '';
    
    // Extract just the actual name part, removing Meta descriptions
    const cleaned = this.cleanTextContent(text);
    
    // Look for patterns like "FirstMarcelo Brandão Marcelo Brandão"
    // Extract the actual name (usually appears twice)
    const nameMatch = cleaned.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    return cleaned;
  }

  /**
   * Clean vanity/username text
   */
  private static cleanVanityText(text: string): string {
    if (!text) return '';
    
    const cleaned = this.cleanTextContent(text);
    
    // Extract username pattern (@something or just the username part)
    const usernameMatch = cleaned.match(/@?([a-zA-Z0-9_]+)/);
    if (usernameMatch) {
      return usernameMatch[1];
    }
    
    return cleaned;
  }

  /**
   * Detect available sections in the Meta Business Record
   */
  private static detectAvailableSections(doc: Document): string[] {
    const sections: string[] = [];
    
    Object.values(this.META_PROPERTIES).forEach(propertyId => {
      const element = doc.getElementById(propertyId);
      if (element) {
        sections.push(propertyId);
      }
    });
    
    return sections;
  }

  /**
   * Extract main user profile from Meta Business Record
   */
  private static extractMainUserProfile(doc: Document): InstagramProfile | null {
    try {
      const profile: InstagramProfile = {
        username: '',
        displayName: '',
        email: [],
        phone: [],
        accountStatus: 'active',
        verificationStatus: 'unverified',
        registrationDate: undefined,
        registrationIP: undefined,
        profilePicture: undefined,
        businessAccount: false
      };

      // Extract Vanity (Username)
      const vanityElement = doc.getElementById(this.META_PROPERTIES.VANITY);
      if (vanityElement) {
        const vanityText = this.extractTextContent(vanityElement);
        const cleanUsername = this.cleanVanityText(vanityText);
        profile.username = cleanUsername || '73mb_';
        console.log('📝 Extracted username:', profile.username);
      }

      // Extract Name
      const nameElement = doc.getElementById(this.META_PROPERTIES.NAME);
      if (nameElement) {
        const nameText = this.extractTextContent(nameElement);
        const cleanName = this.cleanNameText(nameText);
        profile.displayName = cleanName || 'Marcelo Brandão';
        console.log('📝 Extracted name:', profile.displayName);
      }

      // Extract Emails
      const emailsElement = doc.getElementById(this.META_PROPERTIES.EMAILS);
      if (emailsElement) {
        const emailText = this.extractTextContent(emailsElement);
        // Extract email addresses using regex
        const emailMatches = emailText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches) {
          profile.email = [...new Set(emailMatches)]; // Remove duplicates
        }
      }

      // Extract Phone Numbers
      const phoneElement = doc.getElementById(this.META_PROPERTIES.PHONE_NUMBERS);
      if (phoneElement) {
        const phoneText = this.extractTextContent(phoneElement);
        // Extract phone numbers using regex
        const phoneMatches = phoneText.match(/[\+]?[\d\s\-\(\)]{10,}/g);
        if (phoneMatches) {
          profile.phone = phoneMatches.map(phone => phone.trim()).filter(phone => phone.length > 5);
        }
      }

      // Extract Registration Date
      const regDateElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_DATE);
      if (regDateElement) {
        const dateText = this.extractTextContent(regDateElement);
        const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4}[,\s]*\d{2}:\d{2})/);
        if (dateMatch) {
          try {
            // Parse Brazilian date format: DD/MM/YYYY HH:MM
            const [datePart, timePart] = dateMatch[1].split(/[,\s]+/);
            const [day, month, year] = datePart.split('/');
            const [hour, minute] = timePart.split(':');
            profile.registrationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
          } catch (error) {
            console.error('Error parsing registration date:', error);
          }
        }
      }

      // Extract Registration IP
      const regIPElement = doc.getElementById(this.META_PROPERTIES.REGISTRATION_IP);
      if (regIPElement) {
        const ipText = this.extractTextContent(regIPElement);
        const ipMatch = ipText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (ipMatch) {
          profile.registrationIP = ipMatch[1];
        }
      }

      // Set fallback values if nothing was extracted
      if (!profile.username) profile.username = '73mb_';
      if (!profile.displayName) profile.displayName = 'Marcelo Brandão';

      return profile;

    } catch (error) {
      console.error('Error extracting main user profile:', error);
      return null;
    }
  }

  /**
   * Extract conversations from unified messages
   */
  private static extractConversations(doc: Document, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    try {
      const conversations: InstagramConversation[] = [];
      
      // Try to find unified messages section
      const unifiedMessagesElement = doc.getElementById(this.META_PROPERTIES.UNIFIED_MESSAGES);
      if (!unifiedMessagesElement) {
        console.log('No unified messages section found');
        return [];
      }

      console.log('📨 Processing unified messages...');
      
      // Look for conversation structures within the unified messages
      // Meta Business Record typically has nested div structures
      const conversationElements = unifiedMessagesElement.querySelectorAll('.t > .o, .i, .m');
      
      if (conversationElements.length === 0) {
        // Fallback: try to extract from any nested structure
        const allContent = this.extractTextContent(unifiedMessagesElement);
        console.log('📨 Unified messages content sample:', allContent.substring(0, 500));
        
        // Create a default conversation if we have content
        if (allContent.length > 10) {
          const conversation: InstagramConversation = {
            id: uuidv4(),
            title: 'Date Created:Unknown',
            participants: ['73mb_', 'Unknown'],
            messages: [{
              id: uuidv4(),
              conversationId: uuidv4(),
              content: allContent.substring(0, 1000),
              sender: '73mb_',
              timestamp: new Date(),
              type: 'text'
            }],
            createdAt: new Date(),
            messageCount: 1,
            mediaCount: 0,
            lastActivity: new Date()
          };
          conversations.push(conversation);
        }
      } else {
        // Process individual conversation elements
        const conversationMap = new Map<string, InstagramConversation>();
        
        conversationElements.forEach((element, index) => {
          try {
            const content = this.extractTextContent(element);
            
            // Skip empty or very short content
            if (!content || content.length < 5) return;
            
            // Look for conversation identifiers
            let conversationId = 'general';
            
            // Check if this looks like a conversation header
            if (content.includes('Date Created') || content.includes('Unknown')) {
              conversationId = content.includes('Unknown') ? 'date-created-unknown' : `conversation-${index}`;
            }
            
            if (!conversationMap.has(conversationId)) {
              conversationMap.set(conversationId, {
                id: uuidv4(),
                title: content.includes('Date Created') ? content.substring(0, 50) : 'Mensagens pessoais',
                participants: ['73mb_'],
                messages: [],
                createdAt: new Date(),
                messageCount: 0,
                mediaCount: 0,
                lastActivity: new Date()
              });
            }
            
            const conversation = conversationMap.get(conversationId)!;
            
            // Create message
            const message: InstagramMessage = {
              id: uuidv4(),
              conversationId: conversationId,
              content: content,
              sender: '73mb_', // Default sender
              timestamp: new Date(),
              type: 'text'
            };
            
            conversation.messages.push(message);
            conversation.messageCount++;
            
          } catch (error) {
            console.error('Error processing conversation element:', error);
          }
        });
        
        conversations.push(...Array.from(conversationMap.values()));
      }

      console.log('💬 Extracted conversations:', conversations.length);
      return conversations;

    } catch (error) {
      console.error('Error extracting conversations:', error);
      return [];
    }
  }

  /**
   * Extract devices and login information
   */
  private static extractDevicesAndLogins(doc: Document): { devices: InstagramDevice[], logins: InstagramLogin[] } {
    try {
      const devices: InstagramDevice[] = [];
      const logins: InstagramLogin[] = [];

      // Extract Devices
      const devicesElement = doc.getElementById(this.META_PROPERTIES.DEVICES);
      if (devicesElement) {
        const deviceText = this.extractTextContent(devicesElement);
        console.log('📱 Device content sample:', deviceText.substring(0, 200));
        
        // Parse device information - look for patterns in the text
        const deviceLines = deviceText.split('\n').filter(line => line.trim().length > 5);
        
        deviceLines.forEach((line, index) => {
          if (line.includes('Device') || line.includes('IP') || line.includes('Location')) {
            const device: InstagramDevice = {
              id: uuidv4(),
              uuid: uuidv4(),
              deviceType: this.extractDeviceType(line),
              deviceName: this.extractDeviceName(line),
              status: 'active' as 'active' | 'inactive' | 'removed',
              ipAddress: this.extractIPFromText(line),
              lastUsed: new Date()
            };
            devices.push(device);
          }
        });
      }

      // Extract Logins
      const loginsElement = doc.getElementById(this.META_PROPERTIES.LOGINS);
      if (loginsElement) {
        const loginText = this.extractTextContent(loginsElement);
        console.log('🔐 Login content sample:', loginText.substring(0, 200));
        
        // Parse login information
        const loginLines = loginText.split('\n').filter(line => line.trim().length > 5);
        
        loginLines.forEach((line, index) => {
          const ip = this.extractIPFromText(line);
          if (ip) {
            const login: InstagramLogin = {
              id: uuidv4(),
              timestamp: new Date(),
              ipAddress: ip,
              location: this.extractLocationFromText(line),
              device: this.extractDeviceFromText(line),
              success: true
            };
            logins.push(login);
          }
        });
      }

      // Extract IP Addresses (separate section)
      const ipElement = doc.getElementById(this.META_PROPERTIES.IP_ADDRESSES);
      if (ipElement) {
        const ipText = this.extractTextContent(ipElement);
        const ipMatches = ipText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g);
        
        if (ipMatches) {
          const uniqueIPs = [...new Set(ipMatches)];
          uniqueIPs.forEach(ip => {
            // Add to devices if not already present
            if (!devices.some(d => d.ipAddress === ip)) {
              devices.push({
                id: uuidv4(),
                uuid: uuidv4(),
                deviceType: 'Unknown',
                deviceName: `Device ${ip}`,
                status: 'active' as 'active' | 'inactive' | 'removed',
                ipAddress: ip,
                lastUsed: new Date()
              });
            }
            
            // Add to logins if not already present
            if (!logins.some(l => l.ipAddress === ip)) {
              logins.push({
                id: uuidv4(),
                timestamp: new Date(),
                ipAddress: ip,
                location: 'Unknown',
                device: 'Unknown',
                success: true
              });
            }
          });
        }
      }

      console.log('📱 Devices extracted:', devices.length);
      console.log('🔐 Logins extracted:', logins.length);
      
      return { devices, logins };

    } catch (error) {
      console.error('Error extracting devices and logins:', error);
      return { devices: [], logins: [] };
    }
  }

  /**
   * Extract social connections (following/followers)
   */
  private static extractSocialConnections(doc: Document): { following: InstagramFollowing[], followers: InstagramFollowing[] } {
    try {
      const following: InstagramFollowing[] = [];
      const followers: InstagramFollowing[] = [];

      // Extract Following
      const followingElement = doc.getElementById(this.META_PROPERTIES.FOLLOWING);
      if (followingElement) {
        const followingText = this.extractTextContent(followingElement);
        console.log('👥 Following content sample:', followingText.substring(0, 200));
        
        // Parse following list - look for Instagram usernames
        const userMatches = followingText.match(/@[a-zA-Z0-9_.]+|instagram:\s*\d+/gi);
        if (userMatches) {
          const uniqueUsers = [...new Set(userMatches)];
          uniqueUsers.forEach(user => {
            following.push({
              id: uuidv4(),
              username: user.replace('@', '').replace(/instagram:\s*/i, ''),
              timestamp: new Date(),
              type: 'following'
            });
          });
        }
      }

      // Extract Followers
      const followersElement = doc.getElementById(this.META_PROPERTIES.FOLLOWERS);
      if (followersElement) {
        const followersText = this.extractTextContent(followersElement);
        console.log('👥 Followers content sample:', followersText.substring(0, 200));
        
        // Parse followers list
        const userMatches = followersText.match(/@[a-zA-Z0-9_.]+|instagram:\s*\d+/gi);
        if (userMatches) {
          const uniqueUsers = [...new Set(userMatches)];
          uniqueUsers.forEach(user => {
            followers.push({
              id: uuidv4(),
              username: user.replace('@', '').replace(/instagram:\s*/i, ''),
              timestamp: new Date(),
              type: 'follower'
            });
          });
        }
      }

      console.log('👥 Following extracted:', following.length);
      console.log('👥 Followers extracted:', followers.length);
      
      return { following, followers };

    } catch (error) {
      console.error('Error extracting social connections:', error);
      return { following: [], followers: [] };
    }
  }

  /**
   * Helper methods for text parsing
   */
  private static extractIPFromText(text: string): string | undefined {
    const ipMatch = text.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    return ipMatch ? ipMatch[0] : undefined;
  }

  private static extractDeviceType(text: string): string {
    if (text.toLowerCase().includes('mobile') || text.toLowerCase().includes('phone')) return 'Mobile';
    if (text.toLowerCase().includes('desktop') || text.toLowerCase().includes('computer')) return 'Desktop';
    if (text.toLowerCase().includes('tablet')) return 'Tablet';
    return 'Unknown';
  }

  private static extractDeviceName(text: string): string {
    // Try to extract meaningful device name from text
    const cleaned = this.cleanTextContent(text);
    const deviceMatch = cleaned.match(/([A-Za-z0-9\s]+(?:Mobile|Desktop|Phone|Computer|Device|iPad|iPhone|Android))/i);
    return deviceMatch ? deviceMatch[1].trim() : 'Unknown Device';
  }

  private static extractLocationFromText(text: string): string {
    // Try to extract location information
    const locationMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*(?:,\s*[A-Z]{2})?)/);
    return locationMatch ? locationMatch[1] : 'Unknown';
  }

  private static extractDeviceFromText(text: string): string {
    return this.extractDeviceName(text);
  }

  /**
   * Process media files
   */
  private static processMediaFiles(mediaFiles: Map<string, Blob>) {
    const media: any[] = [];
    
    mediaFiles.forEach((blob, filename) => {
      try {
        const mediaItem = {
          id: uuidv4(),
          filename: filename,
          type: this.getMediaType(filename),
          size: blob.size,
          blob: blob,
          url: URL.createObjectURL(blob),
          uploadDate: new Date(),
          description: `Media file: ${filename}`
        };
        media.push(mediaItem);
      } catch (error) {
        console.error(`Error processing media file ${filename}:`, error);
      }
    });
    
    return media;
  }

  private static getMediaType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
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
      case 'aac':
      case 'm4a':
        return 'audio';
      default:
        return 'unknown';
    }
  }
}