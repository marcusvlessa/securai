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

// Tipos para categorias extraídas
interface CategoryData {
  [key: string]: string[];
}

interface ParsedEntity {
  username: string;
  id_instagram: string;
  nome: string;
  categoria: string;
}

/**
 * Parser Enhanced v6.0 - Baseado EXATAMENTE no modelo Python fornecido
 * Implementa extração correta usando CSS classes .t .o .i .m e property IDs
 */
export class InstagramParserEnhanced {
  
  // Lista completa de categorias do Meta Business Record (40+ categorias)
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
   * Entrada principal - implementação EXATA do modelo Python v6.0
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record Enhanced Parsing v6.0 - Modelo Python EXATO...');
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

      // ===== EXTRAÇÃO BASEADA NO MODELO PYTHON =====
      
      // 1. Parse de TODAS as categorias usando método genérico
      const allSections: CategoryData = {};
      this.CATEGORIAS.forEach(categoria => {
        const dados = this.parseCategoriaGenerica(doc, categoria);
        if (dados.length > 0) {
          allSections[categoria] = dados;
          processedData.metadata.sectionsFound.push(categoria);
          console.log(`✅ Categoria '${categoria}': ${dados.length} registros encontrados`);
        } else {
          console.log(`❌ Categoria '${categoria}': 0 registros encontrados`);
        }
      });

      // 2. Extração de entidades universais
      const entidades = this.parseEntidades(doc);
      console.log(`👥 Entidades universais identificadas: ${entidades.length}`);

      // 3. Parse específico para Following/Followers
      const followingData = this.parseFollowingFollowers(doc, 'following');
      const followersData = this.parseFollowingFollowers(doc, 'followers');
      console.log(`👥 Following: ${followingData.length}, Followers: ${followersData.length}`);

      // 4. Parse específico para mídia (photos, videos)
      const photosData = this.parseMedia(doc, 'photos');
      const videosData = this.parseMedia(doc, 'videos');
      console.log(`🎬 Photos: ${photosData.length}, Videos: ${videosData.length}`);

      // 5. Parse específico para unified messages
      const unifiedMessagesData = this.parseUnifiedMessages(doc);
      console.log(`💬 Unified Messages: ${unifiedMessagesData.length}`);

      // 6. Parse específico para comentários
      const commentsData = this.parseComments(doc);
      console.log(`💭 Comments: ${commentsData.length}`);

      // 7. Parse específico para IP addresses
      const ipAddressesData = this.parseIPAddresses(doc);
      console.log(`🌐 IP Addresses: ${ipAddressesData.length}`);

      // 8. Identificar perfil principal
      const profile = this.identifyMainProfile(doc, entidades, allSections);
      console.log(`👤 Profile identificado: ${profile?.displayName || profile?.username || 'Não identificado'}`);

      // 9. Converter entidades para usuários
      const users = this.convertEntitiesToUsers(entidades);

      // 10. Processar unified messages em conversas
      const conversationsData = this.processUnifiedMessagesToConversations(unifiedMessagesData, users);
      console.log(`💬 Conversas processadas: ${conversationsData.conversations.length}`);

      // 11. Mapear dados para estrutura final
      processedData.profile = profile;
      processedData.users = users;
      processedData.following = followingData;
      processedData.followers = followersData;
      processedData.conversations = conversationsData.conversations;
      processedData.devices = this.parseDevices(doc);
      processedData.logins = this.parseLogins(doc);
      
      // 11. Processar arquivos de mídia
      processedData.media = this.processMediaFiles(mediaFiles);
      console.log('🎬 Mídia processada:', processedData.media.length);

      // 12. Associar mídias às conversas
      this.associateMediaToConversations(processedData.conversations, processedData.media);

      console.log('✅ Meta Business Record parsing completed successfully v6.0');
      console.log(`📊 RESULTADOS FINAIS:`);
      console.log(`   - ${processedData.conversations.length} conversas`);
      console.log(`   - ${processedData.users.length} usuários`);
      console.log(`   - ${processedData.following.length} following`);
      console.log(`   - ${processedData.followers.length} followers`);
      console.log(`   - ${processedData.devices.length} devices`);
      console.log(`   - ${processedData.logins.length} logins`);
      console.log(`   - ${processedData.media.length} arquivos de mídia`);
      console.log(`   - ${processedData.metadata.sectionsFound.length} categorias encontradas`);
      
      return processedData;

    } catch (error) {
      console.error('❌ Erro durante parsing Meta Business Record v6.0:', error);
      throw error;
    }
  }

  /**
   * Parse genérico para qualquer categoria - IMPLEMENTAÇÃO EXATA do modelo Python
   */
  private static parseCategoriaGenerica(doc: Document, categoria: string): string[] {
    console.log(`🔍 Buscando categoria: property-${categoria}`);
    
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      console.log(`❌ Bloco não encontrado para categoria: ${categoria}`);
      return [];
    }
    
    console.log(`✅ Bloco encontrado para categoria: ${categoria}`);
    
    const dados: string[] = [];
    // CORREÇÃO: Usar .m ao invés de .classpdiv (que não existe)
    const elementos = bloco.querySelectorAll('div.m');
    
    console.log(`📄 Elementos .m encontrados: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent?.trim();
      if (texto && texto.length > 0) {
        dados.push(texto);
        console.log(`   [${index}]: ${texto.substring(0, 100)}...`);
      }
    });
    
    console.log(`📊 Dados extraídos para ${categoria}: ${dados.length} registros`);
    return dados;
  }

  /**
   * Extrair todas as entidades (usernames + IDs Instagram) do HTML - MODELO PYTHON EXATO
   */
  private static parseEntidades(doc: Document): ParsedEntity[] {
    console.log('🔍 Extraindo entidades universais...');
    
    const entidades: ParsedEntity[] = [];
    const regex = /([\w\.\-]+) Instagram (\d+) ?(.*)/g;
    
    // CORREÇÃO: Buscar em TODOS os elementos .m, não .classpdiv
    const allElements = doc.querySelectorAll('div.m');
    console.log(`📄 Elementos .m para busca de entidades: ${allElements.length}`);
    
    allElements.forEach((div, index) => {
      const texto = div.textContent?.trim() || '';
      let match;
      // Reset regex para evitar problemas com lastIndex
      regex.lastIndex = 0;
      
      while ((match = regex.exec(texto)) !== null) {
        const [, username, instagramId, nome] = match;
        entidades.push({
          username,
          id_instagram: instagramId,
          nome: nome.trim(),
          categoria: 'entidade'
        });
        
        console.log(`👤 Entidade encontrada: ${username} (${instagramId}) - ${nome.trim()}`);
      }
    });
    
    // Remover duplicatas baseado no ID do Instagram
    const entidadesUnicas = entidades.filter((entidade, index, self) => 
      index === self.findIndex(e => e.id_instagram === entidade.id_instagram)
    );
    
    console.log(`👥 Total de entidades únicas: ${entidadesUnicas.length}`);
    return entidadesUnicas;
  }

  /**
   * Converter entidades para formato InstagramUser
   */
  private static convertEntitiesToUsers(entidades: ParsedEntity[]): InstagramUser[] {
    return entidades.map(entidade => ({
      id: entidade.id_instagram,
      username: entidade.username,
      displayName: entidade.nome || entidade.username,
      conversations: [],
      posts: 0,
      isMainUser: false
    }));
  }

  /**
   * Parse específico para Following/Followers - PADRÃO MODELO PYTHON EXATO
   */
  private static parseFollowingFollowers(doc: Document, categoria: string): InstagramFollowing[] {
    console.log(`🔍 Parsing ${categoria}...`);
    
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      console.log(`❌ Bloco property-${categoria} não encontrado`);
      return [];
    }
    
    console.log(`✅ Bloco property-${categoria} encontrado`);
    
    const seguidores: InstagramFollowing[] = [];
    const regex = /([\w\.\-]+) \(Instagram: (\d+)\) \[?(.*?)\]?/g;
    
    // CORREÇÃO: Usar .m ao invés de .classpdiv
    const elementos = bloco.querySelectorAll('div.m');
    console.log(`📄 Elementos .m encontrados em ${categoria}: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent?.trim() || '';
      
      // Reset regex para evitar problemas
      regex.lastIndex = 0;
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
        
        console.log(`👤 ${categoria}: ${username} (${instagramId}) - ${nome}`);
      }
    });
    
    console.log(`📊 Total ${categoria}: ${seguidores.length}`);
    return seguidores;
  }

  /**
   * Parse específico para mídia (photos, videos) - PADRÃO MODELO PYTHON EXATO
   */
  private static parseMedia(doc: Document, categoria: string): any[] {
    console.log(`🔍 Parsing mídia: ${categoria}...`);
    
    const bloco = doc.querySelector(`div[id="property-${categoria}"]`);
    if (!bloco) {
      console.log(`❌ Bloco property-${categoria} não encontrado`);
      return [];
    }
    
    console.log(`✅ Bloco property-${categoria} encontrado`);
    
    const items: any[] = [];
    const campos = ['ID', 'Taken', 'Status', 'URL', 'Source', 'Filter', 'Is Published', 'Shared to Platform', 'Like Count', 'Carousel ID', 'Upload IP', 'Owner', 'Author', 'Bytes', 'Caption', 'Date Created', 'Text', 'Deleted by Instagram', 'Privacy Setting'];
    
    // CORREÇÃO: Buscar por elementos .m que contêm dados separados por ||
    const elementos = bloco.querySelectorAll('div.m');
    console.log(`📄 Elementos .m encontrados em ${categoria}: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent || '';
      
      // Verificar se contém dados estruturados (separados por ||)
      if (texto.includes('||')) {
        const pieces = texto.split('||');
        const item: any = { categoria, tipo: categoria, _index: index };
        
        pieces.forEach((value, pieceIndex) => {
          if (pieceIndex < campos.length) {
            item[campos[pieceIndex]] = value.trim();
          }
        });
        
        if (item.ID || item.URL) {
          items.push(item);
          console.log(`🎬 Mídia ${categoria}: ID=${item.ID}, URL=${item.URL?.substring(0, 50)}...`);
        }
      }
    });
    
    console.log(`📊 Total mídia ${categoria}: ${items.length}`);
    return items;
  }

  /**
   * Parse específico para mensagens unificadas - PADRÃO MODELO PYTHON EXATO
   */
  private static parseUnifiedMessages(doc: Document): string[] {
    console.log('🔍 Parsing unified messages...');
    
    const bloco = doc.querySelector('div[id="property-unified_messages"]');
    if (!bloco) {
      console.log('❌ Bloco property-unified_messages não encontrado');
      return [];
    }
    
    console.log('✅ Bloco property-unified_messages encontrado');
    
    const messages: string[] = [];
    
    // CORREÇÃO: Buscar por elementos .m ao invés de .classmdiv
    const elementos = bloco.querySelectorAll('div.m');
    console.log(`📄 Elementos .m encontrados em unified_messages: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent?.trim();
      if (texto && texto.length > 0) {
        messages.push(texto);
        console.log(`💬 Message [${index}]: ${texto.substring(0, 100)}...`);
      }
    });
    
    console.log(`📊 Total unified messages: ${messages.length}`);
    return messages;
  }

  /**
   * Parse específico para comentários - PADRÃO MODELO PYTHON EXATO
   */
  private static parseComments(doc: Document): string[] {
    console.log('🔍 Parsing comments...');
    
    const bloco = doc.querySelector('div[id="property-comments"]');
    if (!bloco) {
      console.log('❌ Bloco property-comments não encontrado');
      return [];
    }
    
    console.log('✅ Bloco property-comments encontrado');
    
    const comentarios: string[] = [];
    
    // CORREÇÃO: Usar .m ao invés de .classmdiv
    const elementos = bloco.querySelectorAll('div.m');
    console.log(`📄 Elementos .m encontrados em comments: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent?.trim();
      if (texto && texto.length > 0) {
        comentarios.push(texto);
        console.log(`💭 Comment [${index}]: ${texto.substring(0, 100)}...`);
      }
    });
    
    console.log(`📊 Total comments: ${comentarios.length}`);
    return comentarios;
  }

  /**
   * Parse específico para endereços IP - PADRÃO MODELO PYTHON EXATO
   */
  private static parseIPAddresses(doc: Document): string[] {
    console.log('🔍 Parsing IP addresses...');
    
    const bloco = doc.querySelector('div[id="property-ip_addresses"]');
    if (!bloco) {
      console.log('❌ Bloco property-ip_addresses não encontrado');
      return [];
    }
    
    console.log('✅ Bloco property-ip_addresses encontrado');
    
    const registros: string[] = [];
    
    // CORREÇÃO: Usar .m ao invés de .classpdiv
    const elementos = bloco.querySelectorAll('div.m');
    console.log(`📄 Elementos .m encontrados em ip_addresses: ${elementos.length}`);
    
    elementos.forEach((elemento, index) => {
      const texto = elemento.textContent?.trim() || '';
      
      // Regex para IPv4 e IPv6 conforme modelo Python
      if (/^\d{1,3}\.\d+\.\d+\.\d+|\[?[\da-fA-F\:]+\]?/.test(texto)) {
        registros.push(texto);
        console.log(`🌐 IP [${index}]: ${texto}`);
      }
    });
    
    console.log(`📊 Total IP addresses: ${registros.length}`);
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
   * Identificar o perfil principal a partir dos dados extraídos - MODELO PYTHON
   */
  private static identifyMainProfile(doc: Document, entidades: ParsedEntity[], allSections: CategoryData): InstagramProfile | null {
    console.log('🔍 Identificando perfil principal...');
    
    // Tentar identificar a partir das seções específicas
    const nameSection = allSections['name'];
    const emailSection = allSections['emails'];
    const phoneSection = allSections['phone_numbers'];
    const vanitySection = allSections['vanity'];
    
    console.log('📄 Seções de perfil:');
    console.log(`   - name: ${nameSection?.length || 0} registros`);
    console.log(`   - emails: ${emailSection?.length || 0} registros`);
    console.log(`   - phone_numbers: ${phoneSection?.length || 0} registros`);
    console.log(`   - vanity: ${vanitySection?.length || 0} registros`);
    
    // Procurar usuário principal nos dados
    let mainUsername = '';
    let mainDisplayName = '';
    
    // Se há uma seção vanity, é provavelmente o username principal
    if (vanitySection && vanitySection.length > 0) {
      mainUsername = vanitySection[0];
      console.log(`👤 Username do vanity: ${mainUsername}`);
    }
    
    // Se há uma seção name, é provavelmente o nome real
    if (nameSection && nameSection.length > 0) {
      mainDisplayName = nameSection[0];
      console.log(`👤 Nome real: ${mainDisplayName}`);
    }
    
    // Se não encontrou nos metadados, procurar nos usuários mais ativos
    if (!mainUsername && entidades.length > 0) {
      // Assumir que o primeiro usuário é o principal (owner do account)
      const primeiroUsuario = entidades[0];
      mainUsername = primeiroUsuario.username;
      mainDisplayName = primeiroUsuario.nome || primeiroUsuario.username;
      console.log(`👤 Username da primeira entidade: ${mainUsername}`);
    }
    
    if (!mainUsername) {
      console.log('❌ Não foi possível identificar o perfil principal');
      return null;
    }
    
    const profile: InstagramProfile = {
      username: mainUsername,
      displayName: mainDisplayName || mainUsername,
      email: emailSection || [],
      phone: phoneSection || [],
      accountStatus: 'active',
      verificationStatus: 'unverified',
      businessAccount: false,
      registrationDate: undefined,
      registrationIP: allSections['registration_ip']?.[0],
      profilePicture: undefined,
      privacySettings: undefined
    };
    
    console.log(`✅ Perfil principal identificado: ${profile.displayName} (@${profile.username})`);
    return profile;
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