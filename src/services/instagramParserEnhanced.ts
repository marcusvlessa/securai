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

interface ParsedProperty {
  [key: string]: string;
}

/**
 * Parser completamente reescrito para Meta Business Record
 * Baseado na estrutura real do HTML com classes .t .o .i .m
 */
export class InstagramParserEnhanced {
  
  /**
   * Entrada principal para parsing do Meta Business Record
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record Enhanced Parsing v3.0...');
      
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
          originalFilename: 'records-6.html',
          totalFiles: mediaFiles.size,
          sectionsFound: []
        }
      };

      // 1. Extrair todas as propriedades do Meta Business Record
      const allProperties = this.extractAllMetaProperties(doc);
      console.log('📊 Propriedades encontradas:', Object.keys(allProperties).length);

      // 2. Extrair perfil principal
      processedData.profile = this.extractProfileFromProperties(allProperties);
      console.log('👤 Perfil principal:', processedData.profile?.displayName);

      // 3. Extrair Following/Followers
      processedData.following = this.extractFollowingFromProperties(allProperties);
      processedData.followers = this.extractFollowersFromProperties(allProperties);
      console.log('👥 Following:', processedData.following.length, 'Followers:', processedData.followers.length);

      // 4. Extrair conversas unificadas
      processedData.conversations = this.extractUnifiedMessagesFromProperties(allProperties, mediaFiles);
      console.log('💬 Conversas extraídas:', processedData.conversations.length);

      // 5. Extrair dispositivos e IPs
      processedData.devices = this.extractDevicesFromProperties(allProperties);
      processedData.logins = this.extractLoginsFromProperties(allProperties);
      console.log('📱 Dispositivos:', processedData.devices.length, 'Logins:', processedData.logins.length);

      // 6. Extrair usuários únicos
      processedData.users = this.extractAllUsers(processedData);

      // 7. Processar arquivos de mídia
      processedData.media = this.processMediaFiles(mediaFiles);
      console.log('🎬 Mídia processada:', processedData.media.length);

      // 8. Associar mídias às conversas
      this.associateMediaToConversations(processedData.conversations, processedData.media);

      console.log('✅ Meta Business Record parsing completed successfully v3.0');
      return processedData;

    } catch (error) {
      console.error('❌ Erro durante parsing Meta Business Record:', error);
      throw error;
    }
  }

  /**
   * Extrai todas as propriedades do Meta Business Record
   */
  private static extractAllMetaProperties(doc: Document): Record<string, ParsedProperty[]> {
    const properties: Record<string, ParsedProperty[]> = {};
    
    // Buscar por todos os elementos com id="property-*"
    const propertyElements = doc.querySelectorAll('[id^="property-"]');
    
    console.log(`🔍 Encontrados ${propertyElements.length} elementos property-*`);
    
    propertyElements.forEach(element => {
      const propertyId = element.id.replace('property-', '');
      const propertyData = this.parsePropertySection(element as HTMLElement);
      
      if (propertyData.length > 0) {
        properties[propertyId] = propertyData;
        console.log(`📋 ${propertyId}: ${propertyData.length} registros`);
      }
    });
    
    return properties;
  }

  /**
   * Parser genérico para seções property usando classes .t .o .i .m
   */
  private static parsePropertySection(element: HTMLElement): ParsedProperty[] {
    const data: ParsedProperty[] = [];
    
    try {
      // Buscar por estrutura .t > .o > .i > .m
      const tables = element.querySelectorAll('.t');
      
      tables.forEach(table => {
        const outerDivs = table.querySelectorAll('.o');
        
        outerDivs.forEach(outerDiv => {
          const innerDivs = outerDiv.querySelectorAll('.i');
          
          innerDivs.forEach(innerDiv => {
            const mostInnerDivs = innerDiv.querySelectorAll('.m');
            
            if (mostInnerDivs.length >= 2) {
              // Par campo-valor
              const field = mostInnerDivs[0].textContent?.trim() || '';
              const value = mostInnerDivs[1].textContent?.trim() || '';
              
              if (field && value) {
                // Procurar por registro existente ou criar novo
                let currentRecord = data[data.length - 1];
                
                if (!currentRecord || Object.keys(currentRecord).length >= 6) {
                  // Criar novo registro
                  currentRecord = {};
                  data.push(currentRecord);
                }
                
                currentRecord[field] = value;
              }
            }
          });
        });
      });
      
    } catch (error) {
      console.error('❌ Erro ao processar seção:', error);
    }
    
    return data;
  }

  /**
   * Extrai perfil principal das propriedades
   */
  private static extractProfileFromProperties(properties: Record<string, ParsedProperty[]>): InstagramProfile | null {
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

      // Extrair nome
      if (properties.name && properties.name.length > 0) {
        const nameData = properties.name[0];
        profile.displayName = nameData.Name || nameData.nome || '';
      }

      // Extrair vanity (username)
      if (properties.vanity && properties.vanity.length > 0) {
        const vanityData = properties.vanity[0];
        profile.username = vanityData.Vanity || vanityData.vanity || '';
      }

      // Extrair emails
      if (properties.emails && properties.emails.length > 0) {
        profile.email = properties.emails.map(item => 
          item.Email || item.email || Object.values(item)[0] || ''
        ).filter(email => email.includes('@'));
      }

      // Extrair telefones
      if (properties.phone_numbers && properties.phone_numbers.length > 0) {
        profile.phone = properties.phone_numbers.map(item => 
          item.Phone || item.phone || Object.values(item)[0] || ''
        ).filter(phone => phone.length > 0);
      }

      // Extrair data de registro
      if (properties.registration_date && properties.registration_date.length > 0) {
        const regData = properties.registration_date[0];
        const dateStr = regData['Registration Date'] || regData.date || Object.values(regData)[0];
        if (dateStr) {
          profile.registrationDate = new Date(dateStr);
        }
      }

      // Extrair IP de registro
      if (properties.registration_ip && properties.registration_ip.length > 0) {
        const ipData = properties.registration_ip[0];
        profile.registrationIP = ipData['Registration IP'] || ipData.ip || Object.values(ipData)[0] || '';
      }

      console.log('👤 Perfil extraído:', {
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.email.length,
        phones: profile.phone.length
      });

      return profile;
    } catch (error) {
      console.error('❌ Erro ao extrair perfil:', error);
      return null;
    }
  }

  /**
   * Extrai lista de following das propriedades
   */
  private static extractFollowingFromProperties(properties: Record<string, ParsedProperty[]>): InstagramFollowing[] {
    const following: InstagramFollowing[] = [];
    
    try {
      if (properties.following && properties.following.length > 0) {
        properties.following.forEach((item, index) => {
          const username = item.Username || item.username || Object.values(item)[0] || '';
          const displayName = item['Display Name'] || item.name || item.displayName || '';
          const instagramId = item['Instagram ID'] || item.id || '';
          const timestamp = item.Timestamp || item.timestamp || item.date;

          if (username) {
            following.push({
              id: `following_${index}`,
              username: username.trim(),
              displayName: displayName.trim() || username.trim(),
              instagramId: instagramId.trim(),
              timestamp: timestamp ? new Date(timestamp) : new Date(),
              type: 'following'
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao extrair following:', error);
    }

    console.log(`👥 Following extraídos: ${following.length}`);
    return following;
  }

  /**
   * Extrai lista de followers das propriedades
   */
  private static extractFollowersFromProperties(properties: Record<string, ParsedProperty[]>): InstagramFollowing[] {
    const followers: InstagramFollowing[] = [];
    
    try {
      if (properties.followers && properties.followers.length > 0) {
        properties.followers.forEach((item, index) => {
          const username = item.Username || item.username || Object.values(item)[0] || '';
          const displayName = item['Display Name'] || item.name || item.displayName || '';
          const instagramId = item['Instagram ID'] || item.id || '';
          const timestamp = item.Timestamp || item.timestamp || item.date;

          if (username) {
            followers.push({
              id: `follower_${index}`,
              username: username.trim(),
              displayName: displayName.trim() || username.trim(),
              instagramId: instagramId.trim(),
              timestamp: timestamp ? new Date(timestamp) : new Date(),
              type: 'follower'
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao extrair followers:', error);
    }

    console.log(`👥 Followers extraídos: ${followers.length}`);
    return followers;
  }

  /**
   * Extrai mensagens unificadas das propriedades
   */
  private static extractUnifiedMessagesFromProperties(properties: Record<string, ParsedProperty[]>, mediaFiles: Map<string, Blob>): InstagramConversation[] {
    const conversations: InstagramConversation[] = [];
    
    try {
      if (properties.unified_messages && properties.unified_messages.length > 0) {
        // Agrupar por Thread ID
        const threadGroups: Record<string, ParsedProperty[]> = {};
        
        properties.unified_messages.forEach(item => {
          const threadId = item.Thread || item.thread || 'unknown';
          if (!threadGroups[threadId]) {
            threadGroups[threadId] = [];
          }
          threadGroups[threadId].push(item);
        });

        Object.entries(threadGroups).forEach(([threadId, messages], index) => {
          const participants = this.extractParticipantsFromMessages(messages);
          const conversationMessages = this.extractMessagesFromParsedData(messages, threadId);
          
          if (participants.length > 0 && conversationMessages.length > 0) {
            const conversation: InstagramConversation = {
              id: `conversation_${index}`,
              title: participants.filter(p => p !== 'main_user').join(', ') || `Thread ${threadId}`,
              participants,
              messages: conversationMessages,
              createdAt: conversationMessages[0]?.timestamp || new Date(),
              messageCount: conversationMessages.length,
              mediaCount: conversationMessages.filter(m => m.type !== 'text').length,
              lastActivity: conversationMessages[conversationMessages.length - 1]?.timestamp || new Date()
            };

            conversations.push(conversation);
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao extrair conversas:', error);
    }

    console.log(`💬 Conversas extraídas: ${conversations.length}`);
    return conversations;
  }

  /**
   * Extrai dispositivos das propriedades
   */
  private static extractDevicesFromProperties(properties: Record<string, ParsedProperty[]>): InstagramDevice[] {
    const devices: InstagramDevice[] = [];
    
    try {
      if (properties.devices && properties.devices.length > 0) {
        properties.devices.forEach((item, index) => {
          const type = item.Type || item.type || '';
          const id = item.Id || item.id || item.ID || '';
          const active = item.Active || item.active || '';

          if (type || id) {
            devices.push({
              id: `device_${index}`,
              uuid: id.trim(),
              deviceType: type.trim(),
              deviceName: type.trim(),
              deviceModel: id.trim(),
              status: active.toLowerCase() === 'true' || active.toLowerCase() === 'yes' ? 'active' : 'inactive',
              lastSeen: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao extrair dispositivos:', error);
    }

    console.log(`📱 Dispositivos extraídos: ${devices.length}`);
    return devices;
  }

  /**
   * Extrai logins das propriedades
   */
  private static extractLoginsFromProperties(properties: Record<string, ParsedProperty[]>): InstagramLogin[] {
    const logins: InstagramLogin[] = [];
    
    try {
      // Combinar dados de logins e ip_addresses
      if (properties.logins && properties.logins.length > 0) {
        properties.logins.forEach((item, index) => {
          const ip = item.IP || item.ip || item['IP Address'] || '';
          const timestamp = item.Timestamp || item.timestamp || item.Time || item.time;
          const location = item.Location || item.location || '';

          if (ip) {
            logins.push({
              id: `login_${index}`,
              timestamp: timestamp ? new Date(timestamp) : new Date(),
              ipAddress: ip.trim(),
              location: location.trim(),
              device: '',
              success: true
            });
          }
        });
      }

      if (properties.ip_addresses && properties.ip_addresses.length > 0) {
        properties.ip_addresses.forEach((item, index) => {
          const ip = item.IP || item.ip || item['IP Address'] || Object.values(item)[0] || '';
          const timestamp = item.Timestamp || item.timestamp || item.Time || item.time;

          if (ip && !logins.find(l => l.ipAddress === ip)) {
            logins.push({
              id: `ip_login_${index}`,
              timestamp: timestamp ? new Date(timestamp) : new Date(),
              ipAddress: ip.trim(),
              location: '',
              device: '',
              success: true
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao extrair logins:', error);
    }

    console.log(`🔐 Logins extraídos: ${logins.length}`);
    return logins;
  }

  /**
   * Extrai todos os usuários únicos dos dados processados
   */
  private static extractAllUsers(data: ProcessedInstagramData): InstagramUser[] {
    const users: InstagramUser[] = [];
    const usernameSet = new Set<string>();

    // Adicionar usuário principal
    if (data.profile) {
      users.push({
        id: 'main_user',
        username: data.profile.username,
        displayName: data.profile.displayName,
        profilePicture: data.profile.profilePicture,
        conversations: [],
        posts: 0,
        isMainUser: true
      });
      usernameSet.add(data.profile.username);
    }

    // Adicionar usuários de following
    data.following.forEach(follow => {
      if (!usernameSet.has(follow.username)) {
        users.push({
          id: follow.id,
          username: follow.username,
          displayName: follow.displayName || follow.username,
          profilePicture: undefined,
          conversations: [],
          posts: 0,
          isMainUser: false
        });
        usernameSet.add(follow.username);
      }
    });

    // Adicionar usuários de followers
    data.followers.forEach(follower => {
      if (!usernameSet.has(follower.username)) {
        users.push({
          id: follower.id,
          username: follower.username,
          displayName: follower.displayName || follower.username,
          profilePicture: undefined,
          conversations: [],
          posts: 0,
          isMainUser: false
        });
        usernameSet.add(follower.username);
      }
    });

    // Adicionar participantes de conversas
    data.conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (!usernameSet.has(participant)) {
          users.push({
            id: `user_${participant}`,
            username: participant,
            displayName: participant,
            profilePicture: undefined,
            conversations: [],
            posts: 0,
            isMainUser: false
          });
          usernameSet.add(participant);
        }
      });
    });

    console.log(`👥 Total de usuários únicos: ${users.length}`);
    return users;
  }

  /**
   * Extrai participantes das mensagens
   */
  private static extractParticipantsFromMessages(messages: ParsedProperty[]): string[] {
    const participants = new Set<string>();
    
    messages.forEach(msg => {
      // Extrair de Current Participants
      const currentParticipants = msg['Current Participants'] || msg.participants;
      if (currentParticipants) {
        // Parse da string de participantes
        const userMatches = currentParticipants.match(/(\w+(?:\.\w+)*)\s*\(Instagram:\s*(\d+)\)/g);
        if (userMatches) {
          userMatches.forEach(match => {
            const usernameMatch = match.match(/(\w+(?:\.\w+)*)/);
            if (usernameMatch) {
              participants.add(usernameMatch[1]);
            }
          });
        }
      }

      // Extrair de Author
      const author = msg.Author || msg.author;
      if (author) {
        const authorMatch = author.match(/(\w+(?:\.\w+)*)/);
        if (authorMatch) {
          participants.add(authorMatch[1]);
        }
      }
    });

    return Array.from(participants);
  }

  /**
   * Extrai mensagens dos dados parseados
   */
  private static extractMessagesFromParsedData(messages: ParsedProperty[], threadId: string): InstagramMessage[] {
    const conversationMessages: InstagramMessage[] = [];
    
    messages.forEach((msg, index) => {
      const author = msg.Author || msg.author || '';
      const sent = msg.Sent || msg.sent || msg.timestamp || '';
      const body = msg.Body || msg.body || msg.content || '';
      const share = msg.Share || msg.share || '';

      // Extrair username do author
      const authorMatch = author.match(/(\w+(?:\.\w+)*)/);
      const sender = authorMatch ? authorMatch[1] : 'unknown';

      // Parse do timestamp
      const timestamp = sent ? new Date(sent) : new Date();

      // Determinar tipo da mensagem
      let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
      let content = body || share || '';

      if (share) {
        if (share.includes('.jpg') || share.includes('.png') || share.includes('.jpeg')) {
          messageType = 'image';
        } else if (share.includes('.mp4') || share.includes('.mov')) {
          messageType = 'video';
        } else if (share.includes('.mp3') || share.includes('.wav')) {
          messageType = 'audio';
        } else {
          messageType = 'link';
        }
      }

      if (content && content.length > 0) {
        conversationMessages.push({
          id: `msg_${threadId}_${index}`,
          conversationId: `conversation_${threadId}`,
          sender,
          content,
          timestamp,
          type: messageType,
          mediaPath: share || undefined
        });
      }
    });

    return conversationMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Processar arquivos de mídia
   */
  private static processMediaFiles(mediaFiles: Map<string, Blob>): any[] {
    const processedMedia: any[] = [];
    
    mediaFiles.forEach((blob, filename) => {
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      let type: 'image' | 'video' | 'audio' = 'image';
      
      if (['mp4', 'mov', 'avi'].includes(extension)) {
        type = 'video';
      } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
        type = 'audio';
      }
      
      processedMedia.push({
        id: uuidv4(),
        filename,
        type,
        blob,
        fileSize: blob.size,
        uploadDate: new Date()
      });
    });
    
    return processedMedia;
  }

  /**
   * Associar mídias às conversas
   */
  private static associateMediaToConversations(conversations: InstagramConversation[], mediaFiles: any[]): void {
    conversations.forEach(conversation => {
      conversation.messages.forEach(message => {
        if (message.mediaPath) {
          const associatedMedia = mediaFiles.find(media => 
            media.filename.includes(message.mediaPath) || 
            message.mediaPath.includes(media.filename)
          );
          
          if (associatedMedia) {
            message.mediaId = associatedMedia.id;
          }
        }
      });
    });
  }
}