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
 * Parser específico para Meta Business Record
 * Focado na estrutura real observada no HTML
 */
export class InstagramParserEnhanced {
  
  /**
   * Entrada principal para parsing do Meta Business Record
   */
  static parseHtmlContentRobust(htmlContent: string, mediaFiles: Map<string, Blob>): ProcessedInstagramData {
    try {
      console.log('🚀 Starting Meta Business Record Enhanced Parsing v4.0...');
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
          originalFilename: 'records-6.html',
          totalFiles: mediaFiles.size,
          sectionsFound: []
        }
      };

      // Extrair dados das mensagens unificadas
      const unifiedData = this.parseUnifiedMessagesFromHTML(doc);
      console.log(`💬 Conversas extraídas: ${unifiedData.conversations.length}`);
      console.log(`👤 Usuários identificados: ${unifiedData.users.length}`);
      
      // Preencher dados processados
      processedData.conversations = unifiedData.conversations;
      processedData.users = unifiedData.users;
      processedData.profile = unifiedData.profile;
      
      // Extrair following/followers dos participantes
      const socialData = this.extractSocialConnectionsFromUsers(unifiedData.users, unifiedData.profile);
      processedData.following = socialData.following;
      processedData.followers = socialData.followers;
      console.log(`👥 Following: ${processedData.following.length}, Followers: ${processedData.followers.length}`);

      // Processar arquivos de mídia
      processedData.media = this.processMediaFiles(mediaFiles);
      console.log('🎬 Mídia processada:', processedData.media.length);

      // Associar mídias às conversas
      this.associateMediaToConversations(processedData.conversations, processedData.media);

      console.log('✅ Meta Business Record parsing completed successfully v4.0');
      return processedData;

    } catch (error) {
      console.error('❌ Erro durante parsing Meta Business Record:', error);
      throw error;
    }
  }

  /**
   * Parse unified messages directly from HTML structure
   */
  private static parseUnifiedMessagesFromHTML(doc: Document): { conversations: InstagramConversation[], users: InstagramUser[], profile: InstagramProfile | null } {
    const conversations: InstagramConversation[] = [];
    const userMap = new Map<string, InstagramUser>();
    let mainUser: InstagramProfile | null = null;
    
    console.log('🔍 Parseando mensagens unificadas do HTML...');
    
    // Buscar por threads usando um approach mais robusto
    const bodyText = doc.body.textContent || '';
    const threadMatches = bodyText.match(/Thread.*?\(\s*(\d+)\s*\).*?Current Participants.*?(?=Thread|\s*$)/gs);
    
    console.log(`📊 Threads encontrados: ${threadMatches?.length || 0}`);
    
    if (threadMatches) {
      threadMatches.forEach((threadBlock, index) => {
        try {
          // Extrair ID do thread
          const threadIdMatch = threadBlock.match(/Thread.*?\(\s*(\d+)\s*\)/);
          if (!threadIdMatch) return;
          
          const threadId = threadIdMatch[1];
          console.log(`🧵 Processando Thread ${threadId}`);
          
          // Extrair participantes
          const participantMatches = threadBlock.match(/(\w+(?:\.\w+)*)\s*\(Instagram:\s*(\d+)\)/g);
          const participants: string[] = [];
          
          if (participantMatches) {
            participantMatches.forEach(match => {
              const userMatch = match.match(/(\w+(?:\.\w+)*)\s*\(Instagram:\s*(\d+)\)/);
              if (userMatch) {
                const username = userMatch[1];
                const instagramId = userMatch[2];
                participants.push(username);
                
                // Adicionar ao mapa de usuários
                if (!userMap.has(username)) {
                  userMap.set(username, {
                    id: instagramId,
                    username,
                    displayName: username,
                    conversations: [],
                    posts: 0,
                    isMainUser: username === '73mb_'
                  });
                  
                  // Identificar usuário principal
                  if (username === '73mb_') {
                    mainUser = {
                      username,
                      displayName: 'Marcelo Brandão',
                      email: [],
                      phone: [],
                      accountStatus: 'active',
                      verificationStatus: 'unverified',
                    };
                  }
                }
              }
            });
          }
          
          // Extrair mensagens do thread
          const messages = this.extractMessagesFromThreadBlock(threadBlock, threadId);
          
          if (participants.length > 0 && messages.length > 0) {
            // Criar título da conversa baseado nos participantes (excluindo usuário principal)
            const otherParticipants = participants.filter(p => p !== '73mb_');
            const title = otherParticipants.length > 0 ? otherParticipants.join(', ') : `Thread ${threadId}`;
            
            const conversation: InstagramConversation = {
              id: `thread_${threadId}`,
              title,
              participants,
              messages,
              createdAt: messages.length > 0 ? messages[0].timestamp : new Date(),
              messageCount: messages.length,
              mediaCount: messages.filter(m => m.type !== 'text').length,
              lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : new Date()
            };
            
            conversations.push(conversation);
            console.log(`✅ Thread ${threadId}: "${title}" - ${participants.length} participantes, ${messages.length} mensagens`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao processar thread ${index}:`, error);
        }
      });
    }
    
    const users = Array.from(userMap.values());
    console.log(`👥 Total de usuários únicos: ${users.length}`);
    
    return { conversations, users, profile: mainUser };
  }

  /**
   * Extrai mensagens de um bloco de thread
   */
  private static extractMessagesFromThreadBlock(threadBlock: string, threadId: string): InstagramMessage[] {
    const messages: InstagramMessage[] = [];
    
    // Buscar por padrões de mensagem: Author -> Sent -> Body
    const messageBlocks = threadBlock.split(/(?=Author)/);
    
    messageBlocks.forEach((block, index) => {
      if (!block.includes('Author')) return;
      
      try {
        // Extrair dados da mensagem
        const authorMatch = block.match(/(\w+(?:\.\w+)*)\s*\(Instagram:\s*(\d+)\)/);
        const sentMatch = block.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)/);
        const bodyMatch = block.match(/Body.*?<div class="m"><div>(.*?)(?:<div class="p">|$)/s);
        
        if (!authorMatch || !sentMatch) return;
        
        const sender = authorMatch[1];
        const timestamp = new Date(sentMatch[1]);
        const content = bodyMatch ? bodyMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        
        // Detectar tipo de mensagem
        let messageType: 'text' | 'image' | 'video' | 'audio' | 'link' = 'text';
        let mediaPath: string | undefined;
        
        if (block.includes('sent an attachment') || block.includes('Attachments')) {
          // Buscar por arquivo de mídia vinculado
          const mediaMatch = block.match(/linked_media\/([^<\s]+)/);
          if (mediaMatch) {
            mediaPath = mediaMatch[1];
            const extension = mediaPath.split('.').pop()?.toLowerCase();
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
              messageType = 'image';
            } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
              messageType = 'video';
            } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
              messageType = 'audio';
            }
          } else {
            messageType = 'link';
          }
        }
        
        // Filtrar mensagens válidas
        if (content && 
            content !== 'Liked a message' && 
            !content.includes('You are now connected on Messenger.') &&
            content.length > 0) {
          
          const message: InstagramMessage = {
            id: `msg_${threadId}_${index}`,
            conversationId: `thread_${threadId}`,
            sender,
            content,
            timestamp,
            type: messageType,
            mediaPath
          };
          
          messages.push(message);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar mensagem no thread ${threadId}:`, error);
      }
    });
    
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Extrai conexões sociais dos usuários identificados
   */
  private static extractSocialConnectionsFromUsers(users: InstagramUser[], mainProfile: InstagramProfile | null): { following: InstagramFollowing[], followers: InstagramFollowing[] } {
    const following: InstagramFollowing[] = [];
    const followers: InstagramFollowing[] = [];
    
    if (!mainProfile) return { following, followers };
    
    // Todos os outros usuários que conversaram com o usuário principal são considerados connections
    users.forEach((user, index) => {
      if (user.isMainUser) return;
      
      // Para simplificar, consideramos todos como followers (pessoas que interagiram)
      followers.push({
        id: `follower_${index}`,
        username: user.username,
        displayName: user.displayName || user.username,
        instagramId: user.id,
        timestamp: new Date(),
        type: 'follower'
      });
    });
    
    console.log(`🔗 Conexões sociais: ${following.length} following, ${followers.length} followers`);
    return { following, followers };
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