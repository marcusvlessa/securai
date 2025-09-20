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
 * Parser específico para Meta Business Record baseado no modelo Python fornecido
 * Implementa extração universal para todas as categorias do HTML
 */
export class InstagramParserEnhanced {
  
  // Lista completa de categorias do Meta Business Record
  private static readonly CATEGORIAS = [
    'request_parameters', 'ncmec_reports', 'name', 'emails', 'vanity', 'registration_date',
    'registration_ip', 'phone_numbers', 'logins', 'ip_addresses', 'devices',
    'following', 'followers', 'last_location', 'photos', 'profile_picture', 'comments',
    'videos', 'live_videos', 'archived_live_videos', 'notes', 'unified_messages', 'reported_conversations',
    'reported_disappearing_messages', 'archived_stories', 'encrypted_groups_info', 'threads_profile_picture',
    'threads_following', 'threads_followers', 'threads_registration_date', 'threads_posts_and_replies',
    'threads_archived_stories', 'community_notes', 'threads_community_notes', 'archived_quicksnap',
    'threads_unified_messages', 'shared_access', 'last_location_area', 'account_owner_shared_access',
    'unarchived_stories'
  ];

  /**
   * Entrada principal - implementação completa baseada no modelo Python
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record Enhanced Parsing v5.0 - Modelo Python...');
      console.log('📄 HTML Content length:', htmlContent.length);
      console.log('🎬 Media files count:', mediaFiles.size);
      
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
          originalFilename: 'meta-business-record.html',
          totalFiles: mediaFiles.size,
          sectionsFound: []
        }
      };

      // Coletar dados de todas as categorias usando os métodos específicos do modelo Python
      const allSections = new Map<string, string[]>();
      
      // Parse genérico para todas as categorias
      this.CATEGORIAS.forEach(categoria => {
        const dados = this.parseCategoriaGenerica(doc, categoria);
        if (dados.length > 0) {
          allSections.set(categoria, dados);
          processedData.metadata.sectionsFound.push(categoria);
          console.log(`✅ Categoria '${categoria}': ${dados.length} registros encontrados`);
        }
      });

      // Extrair entidades universais (todos os usernames/IDs Instagram no HTML)
      const entidades = this.parseEntidades(doc);
      console.log(`👥 Entidades identificadas: ${entidades.length}`);

      // Parse específico para Following/Followers usando padrão do modelo Python
      const followingData = this.parseFollowingFollowers(doc, 'following');
      const followersData = this.parseFollowingFollowers(doc, 'followers');
      console.log(`👥 Following: ${followingData.length}, Followers: ${followersData.length}`);

      // Parse específico para mídia
      const photosData = this.parseMedia(doc, 'photos');
      const videosData = this.parseMedia(doc, 'videos');
      console.log(`🎬 Photos: ${photosData.length}, Videos: ${videosData.length}`);

      // Parse específico para mensagens unificadas
      const unifiedMessagesData = this.parseUnifiedMessages(doc);
      console.log(`💬 Unified Messages: ${unifiedMessagesData.length}`);

      // Parse específico para comentários
      const commentsData = this.parseComments(doc);
      console.log(`💭 Comments: ${commentsData.length}`);

      // Parse específico para IPs
      const ipAddressesData = this.parseIPAddresses(doc);
      console.log(`🌐 IP Addresses: ${ipAddressesData.length}`);

      // Parse específico para logins/devices
      const loginsData = this.parseLogins(doc);
      const devicesData = this.parseDevices(doc);
      console.log(`🔐 Logins: ${loginsData.length}, Devices: ${devicesData.length}`);

      // Identificar perfil principal
      const profile = this.identifyMainProfile(doc, entidades, allSections);
      console.log(`👤 Profile identificado: ${profile?.displayName || profile?.username || 'Não identificado'}`);

      // Processar conversas a partir das mensagens unificadas
      const conversationsData = this.processUnifiedMessagesToConversations(unifiedMessagesData, entidades);
      console.log(`💬 Conversas processadas: ${conversationsData.conversations.length}`);

      // Preencher dados processados
      processedData.profile = profile;
      processedData.users = entidades;
      processedData.following = followingData;
      processedData.followers = followersData;
      processedData.conversations = conversationsData.conversations;
      processedData.devices = devicesData;
      processedData.logins = loginsData;
      
      // Processar arquivos de mídia
      processedData.media = this.processMediaFiles(mediaFiles);
      console.log('🎬 Mídia processada:', processedData.media.length);

      // Associar mídias às conversas
      this.associateMediaToConversations(processedData.conversations, processedData.media);

      console.log('✅ Meta Business Record parsing completed successfully v5.0');
      console.log(`📊 Resultados: ${processedData.conversations.length} conversas, ${processedData.users.length} usuários, ${processedData.following.length} following, ${processedData.followers.length} followers`);
      
      return processedData;

    } catch (error) {
      console.error('❌ Erro durante parsing Meta Business Record:', error);
      throw error;
    }
  }

  /**
   * Parse genérico para qualquer categoria - implementação exata do modelo Python
   */
  private static parseCategoriaGenerica(doc: Document, categoria: string): string[] {
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      return [];
    }
    
    const dados: string[] = [];
    const linhas = bloco.querySelectorAll('div.classpdiv');
    
    linhas.forEach(linha => {
      const texto = linha.textContent?.trim();
      if (texto) {
        dados.push(texto);
      }
    });
    
    return dados;
  }

  /**
   * Extrair todas as entidades (usernames + IDs Instagram) do HTML
   */
  private static parseEntidades(doc: Document): InstagramUser[] {
    const entidades: InstagramUser[] = [];
    const regex = /([\w\.\-]+) Instagram (\d+) ?(.*)/g;
    
    const allDivs = doc.querySelectorAll('div.classpdiv');
    allDivs.forEach(div => {
      const texto = div.textContent?.trim() || '';
      let match;
      while ((match = regex.exec(texto)) !== null) {
        const [, username, instagramId, nome] = match;
        entidades.push({
          id: instagramId,
          username,
          displayName: nome.trim() || username,
          conversations: [],
          posts: 0,
          isMainUser: false
        });
      }
    });
    
    return entidades;
  }

  /**
   * Parse específico para Following/Followers - padrão do modelo Python
   */
  private static parseFollowingFollowers(doc: Document, categoria: string): InstagramFollowing[] {
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      return [];
    }
    
    const seguidores: InstagramFollowing[] = [];
    const regex = /([\w\.\-]+) \(Instagram: (\d+)\) \[?(.*?)\]?/g;
    
    const linhas = bloco.querySelectorAll('div.classpdiv');
    linhas.forEach((linha, index) => {
      const texto = linha.textContent?.trim() || '';
      let match;
      while ((match = regex.exec(texto)) !== null) {
        const [, username, instagramId, nome] = match;
        seguidores.push({
          id: `${categoria}_${index}_${instagramId}`,
          username,
          displayName: nome || username,
          instagramId,
          timestamp: new Date(),
          type: categoria === 'following' ? 'following' : 'follower'
        });
      }
    });
    
    return seguidores;
  }

  /**
   * Parse específico para mídia (photos, videos) - padrão do modelo Python
   */
  private static parseMedia(doc: Document, categoria: string): any[] {
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      return [];
    }
    
    const items: any[] = [];
    const campos = ['ID', 'Taken', 'Status', 'URL', 'Source', 'Filter', 'Is Published', 'Shared to Platform', 'Like Count', 'Carousel ID', 'Upload IP', 'Owner', 'Author', 'Bytes', 'Caption', 'Date Created', 'Text', 'Deleted by Instagram', 'Privacy Setting'];
    
    const linhas = bloco.querySelectorAll('div.classmdiv');
    linhas.forEach(linha => {
      const texto = linha.textContent || '';
      const pieces = texto.split('||');
      const item: any = { categoria, tipo: categoria };
      
      pieces.forEach((value, index) => {
        if (index < campos.length) {
          item[campos[index]] = value;
        }
      });
      
      if (item.ID || item.URL) {
        items.push(item);
      }
    });
    
    return items;
  }

  /**
   * Parse específico para mensagens unificadas - padrão do modelo Python
   */
  private static parseUnifiedMessages(doc: Document): string[] {
    const bloco = doc.querySelector('div[id="property-unified_messages"]');
    if (!bloco) {
      return [];
    }
    
    const messages: string[] = [];
    const divs = bloco.querySelectorAll('div.classmdiv');
    
    divs.forEach(div => {
      const texto = div.textContent?.trim();
      if (texto) {
        messages.push(texto);
      }
    });
    
    return messages;
  }

  /**
   * Parse específico para comentários - padrão do modelo Python
   */
  private static parseComments(doc: Document): string[] {
    const bloco = doc.querySelector('div[id="property-comments"]');
    if (!bloco) {
      return [];
    }
    
    const comentarios: string[] = [];
    const divs = bloco.querySelectorAll('div.classmdiv');
    
    divs.forEach(div => {
      const texto = div.textContent?.trim();
      if (texto) {
        comentarios.push(texto);
      }
    });
    
    return comentarios;
  }

  /**
   * Parse específico para endereços IP - padrão do modelo Python
   */
  private static parseIPAddresses(doc: Document): string[] {
    const bloco = doc.querySelector('div[id="property-ip_addresses"]');
    if (!bloco) {
      return [];
    }
    
    const registros: string[] = [];
    const linhas = bloco.querySelectorAll('div.classpdiv');
    
    linhas.forEach(linha => {
      const texto = linha.textContent?.trim() || '';
      // Regex para IPv4 e IPv6
      if (/^\d{1,3}\.\d+\.\d+\.\d+|\[?[\da-fA-F\:]+\]?/.test(texto)) {
        registros.push(texto);
      }
    });
    
    return registros;
  }

  /**
   * Parse específico para logins
   */
  private static parseLogins(doc: Document): InstagramLogin[] {
    const bloco = doc.querySelector('div[id="property-logins"]');
    if (!bloco) {
      return [];
    }
    
    const logins: InstagramLogin[] = [];
    const linhas = bloco.querySelectorAll('div.classpdiv, div.classmdiv');
    
    linhas.forEach((linha, index) => {
      const texto = linha.textContent?.trim() || '';
      
      // Tentar extrair informações básicas de login
      const timestampMatch = texto.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      const ipMatch = texto.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      
      if (timestampMatch || ipMatch) {
        logins.push({
          id: `login_${index}`,
          timestamp: timestampMatch ? new Date(timestampMatch[1]) : new Date(),
          ip: ipMatch ? ipMatch[1] : 'IP não identificado',
          success: !texto.toLowerCase().includes('failed') && !texto.toLowerCase().includes('erro'),
          device: texto.includes('Mobile') ? 'Mobile' : texto.includes('Desktop') ? 'Desktop' : undefined,
          location: undefined, // Não disponível neste formato
          method: 'Instagram Login'
        });
      }
    });
    
    return logins;
  }

  /**
   * Parse específico para dispositivos
   */
  private static parseDevices(doc: Document): InstagramDevice[] {
    const bloco = doc.querySelector('div[id="property-devices"]');
    if (!bloco) {
      return [];
    }
    
    const devices: InstagramDevice[] = [];
    const linhas = bloco.querySelectorAll('div.classpdiv, div.classmdiv');
    
    linhas.forEach((linha, index) => {
      const texto = linha.textContent?.trim() || '';
      
      if (texto && texto.length > 10) { // Filtrar linhas muito curtas
        // Tentar extrair informações básicas do dispositivo
        const isMobile = /mobile|phone|android|ios|iphone/i.test(texto);
        const isTablet = /tablet|ipad/i.test(texto);
        const isDesktop = /desktop|computer|mac|pc|windows/i.test(texto);
        
        let deviceType = 'unknown';
        if (isMobile) deviceType = 'mobile';
        else if (isTablet) deviceType = 'tablet';
        else if (isDesktop) deviceType = 'desktop';
        
        devices.push({
          id: `device_${index}`,
          uuid: `device_${index}`,
          deviceName: texto.substring(0, 50), // Primeiros 50 caracteres como nome
          deviceType,
          deviceModel: undefined,
          os: undefined,
          appVersion: undefined,
          status: 'active', // Assumir ativo por padrão
          lastSeen: new Date(),
          firstSeen: new Date(),
          ipAddresses: []
        });
      }
    });
    
    return devices;
  }

  /**
   * Identificar o perfil principal a partir dos dados extraídos
   */
  private static identifyMainProfile(doc: Document, entidades: InstagramUser[], allSections: Map<string, string[]>): InstagramProfile | null {
    // Tentar identificar a partir da seção 'name'
    const nameSection = allSections.get('name');
    const emailSection = allSections.get('emails');
    const phoneSection = allSections.get('phone_numbers');
    const vanitySection = allSections.get('vanity');
    
    // Procurar usuário principal nos dados
    let mainUsername = '';
    let mainDisplayName = '';
    
    // Se há uma seção vanity, é provavelmente o username principal
    if (vanitySection && vanitySection.length > 0) {
      mainUsername = vanitySection[0];
    }
    
    // Se há uma seção name, é provavelmente o nome real
    if (nameSection && nameSection.length > 0) {
      mainDisplayName = nameSection[0];
    }
    
    // Se não encontrou nos metadados, procurar nos usuários mais ativos
    if (!mainUsername && entidades.length > 0) {
      // Assumir que o primeiro usuário ou mais ativo é o principal
      const primeiroUsuario = entidades[0];
      mainUsername = primeiroUsuario.username;
      mainDisplayName = primeiroUsuario.displayName || primeiroUsuario.username;
    }
    
    if (!mainUsername) {
      return null;
    }
    
    return {
      username: mainUsername,
      displayName: mainDisplayName || mainUsername,
      email: emailSection || [],
      phone: phoneSection || [],
      accountStatus: 'active',
      verificationStatus: 'unverified',
      businessAccount: false,
      registrationDate: undefined,
      registrationIP: allSections.get('registration_ip')?.[0],
      profilePicture: undefined,
      privacySettings: undefined
    };
  }

  /**
   * Processar mensagens unificadas em conversas estruturadas
   */
  private static processUnifiedMessagesToConversations(messages: string[], users: InstagramUser[]): { conversations: InstagramConversation[] } {
    const conversations: InstagramConversation[] = [];
    
    if (messages.length === 0) {
      return { conversations };
    }
    
    // Agrupar mensagens por padrões de conversa
    // Esta é uma implementação simplificada - pode ser expandida conforme a estrutura real
    const conversationMap = new Map<string, InstagramMessage[]>();
    
    messages.forEach((messageText, index) => {
      // Tentar extrair informações da mensagem
      const lines = messageText.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        // Usar o primeiro elemento como ID da conversa (simplificado)
        const conversationId = `unified_conversation_${Math.floor(index / 10)}`; // Agrupar de 10 em 10
        
        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, []);
        }
        
        // Criar mensagem básica
        const message: InstagramMessage = {
          id: `msg_${index}`,
          conversationId,
          sender: 'unknown', // Seria extraído da estrutura real
          content: messageText.substring(0, 200), // Primeiros 200 caracteres
          timestamp: new Date(),
          type: 'text'
        };
        
        conversationMap.get(conversationId)!.push(message);
      }
    });
    
    // Converter mapa em conversas
    conversationMap.forEach((messages, conversationId) => {
      if (messages.length > 0) {
        conversations.push({
          id: conversationId,
          title: `Conversa ${conversations.length + 1}`,
          participants: ['unknown'], // Seria extraído da estrutura real
          messages,
          createdAt: messages[0].timestamp,
          messageCount: messages.length,
          mediaCount: 0,
          lastActivity: messages[messages.length - 1].timestamp
        });
      }
    });
    
    return { conversations };
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