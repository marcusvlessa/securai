import { v4 as uuidv4 } from 'uuid';

// ============ INTERFACES ESPECIALIZADAS ============

export interface MetaRequestParameters {
  service: string;
  internalTicketNumber: string;
  target: string;
  accountIdentifier: string;
  accountType: string;
  generated: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface MetaParticipant {
  username: string;
  instagramId: string;
}

export interface MetaAttachment {
  type: string;
  size?: number;
  url?: string;
  photoId?: string;
  filename?: string;
  blob?: Blob;
  blobUrl?: string;
}

export interface MetaShare {
  dateCreated?: Date;
  text?: string;
  url?: string;
}

export interface MetaCallRecord {
  type: string;
  missed: boolean;
  duration: number;
}

export interface MetaMessage {
  id: string;
  threadId: string;
  conversationId: string;
  author: MetaParticipant | null;
  sent: Date;
  body: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'share' | 'call';
  removedBySender: boolean;
  attachments: MetaAttachment[];
  share?: MetaShare;
  callRecord?: MetaCallRecord;
}

export interface MetaConversation {
  id: string;
  threadId: string;
  participants: MetaParticipant[];
  participantsUpdatedAt: Date;
  messages: MetaMessage[];
  messageCount: number;
  attachmentsCount: number;
  sharesCount: number;
  callsCount: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface MetaDisappearingMessage {
  id: string;
  participants: string[];
  reporter: string;
  timeReported: Date;
  threadId: string;
  sender: string;
  sent: Date;
  message: string;
  attachments: MetaAttachment[];
}

export interface MetaNCMECReport {
  id: string;
  cyberTipId?: string;
  time?: Date;
  responsibleId?: string;
  mediaUploaded: Array<{
    id: string;
    uploadTime?: Date;
    ncmecFileId?: string;
  }>;
  recipients: string[];
}

export interface MetaThreadsPost {
  id: string;
  postAuthorId?: string;
  postContentId?: string;
  timestamp?: Date;
  postSetting?: string;
  replyToAuthor?: string;
  replyToPostId?: string;
  quotingPostAuthor?: string;
  quotingId?: string;
  repostingAuthorId?: string;
  repostingId?: string;
}

export interface MetaProfilePicture {
  path: string;
  blob: Blob | null;
  filename: string;
}

// ============ PARSER PRINCIPAL ============

export class InstagramMetaBusinessParser {
  
  /**
   * Parse completo do Meta Business Record HTML
   */
  static parseMetaBusinessRecord(
    doc: Document,
    mediaFiles: Map<string, Blob>
  ): {
    requestParameters: MetaRequestParameters | null;
    conversations: MetaConversation[];
    profilePicture: MetaProfilePicture | null;
    ncmecReports: MetaNCMECReport[];
    threadsPosts: MetaThreadsPost[];
    disappearingMessages: MetaDisappearingMessage[];
    photos: Array<{id: string, path: string, blob: Blob | null, timestamp?: Date}>;
  } {
    console.log('🔍 [MetaBusinessParser] Iniciando parse completo...');
    
    const requestParameters = this.parseRequestParameters(doc);
    const conversations = this.parseUnifiedMessagesComplete(doc, mediaFiles);
    const profilePicture = this.parseProfilePicture(doc, mediaFiles);
    const ncmecReports = this.parseNCMECReports(doc);
    const threadsPosts = this.parseThreadsPostsComplete(doc);
    const disappearingMessages = this.parseDisappearingMessages(doc);
    const photos = this.parsePhotos(doc, mediaFiles);
    
    console.log(`✅ [MetaBusinessParser] Parse concluído:`, {
      hasRequestParams: !!requestParameters,
      conversationsCount: conversations.length,
      hasProfilePicture: !!profilePicture,
      ncmecReportsCount: ncmecReports.length,
      threadsPostsCount: threadsPosts.length,
      disappearingMessagesCount: disappearingMessages.length,
      photosCount: photos.length
    });
    
    return {
      requestParameters,
      conversations,
      profilePicture,
      ncmecReports,
      threadsPosts,
      disappearingMessages,
      photos
    };
  }
  
  /**
   * Parse de Request Parameters
   */
  static parseRequestParameters(doc: Document): MetaRequestParameters | null {
    console.log('🔍 [RequestParams] Parsing Request Parameters...');
    
    const section = doc.querySelector('#property-request_parameters');
    if (!section) {
      console.warn('⚠️ [RequestParams] Seção não encontrada');
      return null;
    }
    
    const getValue = (label: string): string => {
      const elements = Array.from(section.querySelectorAll('.o'));
      const element = elements.find(el => {
        const innerText = el.querySelector('.i')?.textContent?.trim();
        return innerText?.startsWith(label);
      });
      return element?.querySelector('.m')?.textContent?.trim() || '';
    };
    
    const service = getValue('Service');
    const ticketNumber = getValue('Internal Ticket Number');
    const target = getValue('Target');
    const accountIdentifier = getValue('Account Identifier');
    const accountType = getValue('Account Type');
    const generatedStr = getValue('Generated');
    const dateRangeStr = getValue('Date Range');
    
    // Parse date range "2024-01-01 00:00:00 UTC to 2024-05-07 23:59:59 UTC"
    const dateRangeMatch = dateRangeStr.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC) to (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)/);
    
    console.log(`✅ [RequestParams] Extraído:`, {
      service,
      ticketNumber,
      target,
      accountType
    });
    
    return {
      service,
      internalTicketNumber: ticketNumber,
      target,
      accountIdentifier,
      accountType,
      generated: this.parseTimestamp(generatedStr) || new Date(),
      dateRange: {
        start: dateRangeMatch ? this.parseTimestamp(dateRangeMatch[1]) || new Date() : new Date(),
        end: dateRangeMatch ? this.parseTimestamp(dateRangeMatch[2]) || new Date() : new Date()
      }
    };
  }
  
  /**
   * Parse completo de Unified Messages com threading
   */
  static parseUnifiedMessagesComplete(
    doc: Document,
    mediaFiles: Map<string, Blob>
  ): MetaConversation[] {
    console.log('🔍 [UnifiedMessages] Parsing mensagens unificadas...');
    
    const section = doc.querySelector('#property-unified_messages');
    if (!section) {
      console.warn('⚠️ [UnifiedMessages] Seção não encontrada');
      return [];
    }
    
    const conversations: MetaConversation[] = [];
    
    // Pegar TODO o conteúdo HTML da seção e dividir por "Thread"
    const content = section.innerHTML;
    const threadBlocks = content.split(/<div class="t o"><div class="t i">Thread<div class="m"><div>/);
    
    console.log(`📊 [UnifiedMessages] Encontrados ${threadBlocks.length - 1} threads no HTML`);
    
    // Pular o primeiro bloco (é o texto antes do primeiro Thread)
    for (let i = 1; i < threadBlocks.length; i++) {
      try {
        const threadHtml = threadBlocks[i];
        
        // Extrair Thread ID - formato: " (123456789)"
        const threadIdMatch = threadHtml.match(/^\s*\((\d+)\)/);
        if (!threadIdMatch) continue;
        
        const threadId = threadIdMatch[1];
        console.log(`🧵 [Thread ${threadId}] Processando...`);
        
        // Criar um documento temporário para parsear este thread
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = threadHtml;
        
        // Extrair participantes
        const participants = this.extractParticipantsFromHtml(tempDiv);
        const participantsUpdatedAt = this.extractParticipantsTimestampFromHtml(tempDiv);
        
        // Extrair todas as mensagens
        const messages = this.extractAllMessagesFromThread(tempDiv, threadId, mediaFiles);
        
        if (messages.length > 0 || participants.length > 0) {
          const attachmentsCount = messages.reduce((sum, m) => sum + m.attachments.length, 0);
          const sharesCount = messages.filter(m => m.share && Object.keys(m.share).length > 0).length;
          const callsCount = messages.filter(m => m.callRecord).length;
          
          conversations.push({
            id: uuidv4(),
            threadId,
            participants,
            participantsUpdatedAt,
            messages,
            messageCount: messages.length,
            attachmentsCount,
            sharesCount,
            callsCount,
            createdAt: messages.length > 0 ? messages[messages.length - 1].sent : new Date(),
            lastActivity: messages.length > 0 ? messages[0].sent : new Date()
          });
          
          console.log(`✅ [Thread ${threadId}] ${messages.length} mensagens, ${participants.length} participantes`);
        }
      } catch (error) {
        console.error(`❌ [Thread] Erro ao processar:`, error);
      }
    }
    
    console.log(`✅ [UnifiedMessages] ${conversations.length} conversas processadas`);
    return conversations;
  }
  
  /**
   * Extrai TODAS as mensagens de um thread
   */
  private static extractAllMessagesFromThread(
    threadDiv: HTMLDivElement,
    threadId: string,
    mediaFiles: Map<string, Blob>
  ): MetaMessage[] {
    const messages: MetaMessage[] = [];
    
    // Dividir o HTML por "Author"
    const html = threadDiv.innerHTML;
    const authorBlocks = html.split(/<div class="t o"><div class="t i">Author<div class="m"><div>/);
    
    // Pular o primeiro bloco (antes do primeiro Author)
    for (let i = 1; i < authorBlocks.length; i++) {
      try {
        const messageHtml = authorBlocks[i];
        
        // Criar elemento temporário
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = '<div class="t o"><div class="t i">Author<div class="m"><div>' + messageHtml;
        
        const author = this.extractAuthorFromHtml(tempDiv);
        const sent = this.extractSentFromHtml(tempDiv);
        const body = this.extractBodyFromHtml(tempDiv);
        const removedBySender = messageHtml.includes('Removed by Sender');
        const attachments = this.extractAttachmentsFromHtml(tempDiv, mediaFiles);
        const share = this.extractShareFromHtml(tempDiv);
        const callRecord = this.extractCallRecordFromHtml(tempDiv);
        
        if (sent) {
          const type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'share' | 'call' = 
            callRecord ? 'call' 
            : share && share.url ? 'share'
            : attachments.length > 0 ? (attachments[0].type.includes('image') ? 'image' : attachments[0].type.includes('video') ? 'video' : 'audio')
            : 'text';
          
          messages.push({
            id: uuidv4(),
            threadId,
            conversationId: threadId,
            author,
            sent,
            body: body || '',
            type,
            removedBySender,
            attachments,
            share: share && Object.keys(share).length > 0 ? share : undefined,
            callRecord
          });
        }
      } catch (error) {
        console.error('Erro ao extrair mensagem:', error);
      }
    }
    
    return messages;
  }
  
  /**
   * Extrai Thread ID do formato "Thread (123456789)"
   */
  private static extractThreadId(element: Element): string | null {
    const text = element.textContent || '';
    const match = text.match(/Thread[^\(]*\((\d+)\)/);
    return match ? match[1] : null;
  }
  
  /**
   * Extrai participantes do HTML
   */
  private static extractParticipantsFromHtml(threadDiv: HTMLDivElement): MetaParticipant[] {
    const participants: MetaParticipant[] = [];
    
    // Procurar por "Current Participants"
    const text = threadDiv.textContent || '';
    const lines = text.split('\n');
    
    let capturing = false;
    for (const line of lines) {
      if (line.includes('Current Participants')) {
        capturing = true;
        continue;
      }
      
      if (capturing) {
        const match = line.match(/^(.+?)\s*\(Instagram:\s*(\d+)\)/);
        if (match) {
          participants.push({
            username: match[1].trim(),
            instagramId: match[2].trim()
          });
        } else if (line.trim() && !line.includes('UTC') && !line.includes('Author')) {
          // Se encontrou uma linha que não é participante, parar
          break;
        }
      }
    }
    
    return participants;
  }
  
  /**
   * Extrai timestamp dos participantes
   */
  private static extractParticipantsTimestampFromHtml(threadDiv: HTMLDivElement): Date {
    const text = threadDiv.textContent || '';
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('Current Participants')) {
        // A próxima linha é o timestamp
        const nextIndex = lines.indexOf(line) + 1;
        if (nextIndex < lines.length) {
          const timestamp = this.parseTimestamp(lines[nextIndex]);
          if (timestamp) return timestamp;
        }
      }
    }
    
    return new Date();
  }
  
  /**
   * Extrai Author do HTML
   */
  private static extractAuthorFromHtml(messageDiv: HTMLDivElement): MetaParticipant | null {
    const text = messageDiv.textContent || '';
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Author')) {
        // A próxima linha não-vazia contém o author
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (line && !line.includes('Sent')) {
            const match = line.match(/^(.+?)\s*\(Instagram:\s*(\d+)\)/);
            if (match) {
              return {
                username: match[1].trim(),
                instagramId: match[2].trim()
              };
            }
            break;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extrai timestamp Sent do HTML
   */
  private static extractSentFromHtml(messageDiv: HTMLDivElement): Date | null {
    const text = messageDiv.textContent || '';
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Sent')) {
        // A próxima linha não-vazia contém o timestamp
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (line) {
            const timestamp = this.parseTimestamp(line);
            if (timestamp) return timestamp;
            break;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extrai Body da mensagem do HTML
   */
  private static extractBodyFromHtml(messageDiv: HTMLDivElement): string | null {
    const text = messageDiv.textContent || '';
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Body') {
        // A próxima linha não-vazia contém o body
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (line && !line.includes('Share') && !line.includes('Attachments')) {
            return line;
          }
          if (line.includes('Share') || line.includes('Attachments') || line.includes('Author')) {
            break;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extrai Attachments do HTML com busca de blobs locais
   */
  private static extractAttachmentsFromHtml(
    messageDiv: HTMLDivElement,
    mediaFiles: Map<string, Blob>
  ): MetaAttachment[] {
    const attachments: MetaAttachment[] = [];
    
    // ETAPA 1: Buscar elementos de mídia no DOM (imagens, vídeos, áudios)
    const mediaElements = messageDiv.querySelectorAll('img[src*="linked_media"], video[src*="linked_media"], audio[src*="linked_media"]');
    
    console.log(`🔍 [Attachments] Encontrados ${mediaElements.length} elementos de mídia no DOM`);
    
    mediaElements.forEach((el, idx) => {
      const src = el.getAttribute('src') || '';
      const filename = src.split('/').pop() || '';
      
      console.log(`  📎 [${idx + 1}] Processando: ${src}`);
      
      // Buscar blob com múltiplas variações
      const blob = mediaFiles.get(src) || 
                   mediaFiles.get(`linked_media/${filename}`) || 
                   mediaFiles.get(filename);
      
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const mediaType = this.getMediaTypeFromElement(el) || this.getMediaTypeFromFilename(filename);
        
        attachments.push({
          type: mediaType,
          size: blob.size,
          url: blobUrl,
          blobUrl: blobUrl,
          photoId: this.extractPhotoIdFromFilename(filename),
          filename,
          blob
        });
        
        console.log(`  ✅ Blob encontrado: ${filename} (${blob.size} bytes)`);
      } else {
        console.warn(`  ⚠️ Blob não encontrado para: ${filename}`);
      }
    });
    
    // FALLBACK: Se não encontrou via DOM, tentar via texto
    if (attachments.length === 0) {
      const text = messageDiv.textContent || '';
      const lines = text.split('\n');
      
      let capturing = false;
      let currentAttachment: Partial<MetaAttachment> = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === 'Attachments') {
          capturing = true;
          continue;
        }
        
        if (capturing) {
          if (trimmed === 'Type') {
            continue;
          } else if (trimmed.includes('/')) {
            currentAttachment.type = trimmed;
          } else if (trimmed === 'Size') {
            continue;
          } else if (trimmed.match(/^\d+$/)) {
            currentAttachment.size = parseInt(trimmed);
          } else if (trimmed === 'URL') {
            continue;
          } else if (trimmed.startsWith('http')) {
            currentAttachment.url = trimmed;
          } else if (trimmed.startsWith('Photo ID') || trimmed.match(/^\d{15,}$/)) {
            if (trimmed.match(/^\d{15,}$/)) {
              currentAttachment.photoId = trimmed;
            }
          } else if ((trimmed.includes('Author') || trimmed.includes('Share') || !trimmed) && Object.keys(currentAttachment).length > 0) {
            attachments.push({ 
              type: currentAttachment.type || '', 
              size: currentAttachment.size, 
              url: currentAttachment.url, 
              photoId: currentAttachment.photoId 
            });
            currentAttachment = {};
            if (trimmed.includes('Author') || trimmed.includes('Share')) {
              break;
            }
          }
        }
      }
      
      if (Object.keys(currentAttachment).length > 0) {
        attachments.push({ 
          type: currentAttachment.type || '', 
          size: currentAttachment.size, 
          url: currentAttachment.url, 
          photoId: currentAttachment.photoId 
        });
      }
    }
    
    console.log(`✅ [Attachments] Total de ${attachments.length} attachments extraídos`);
    return attachments;
  }
  
  /**
   * Determina o tipo de mídia a partir do elemento HTML
   */
  private static getMediaTypeFromElement(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'img') return 'image/jpeg';
    if (tagName === 'video') return 'video/mp4';
    if (tagName === 'audio') return 'audio/mpeg';
    return 'application/octet-stream';
  }
  
  /**
   * Determina o tipo de mídia a partir do filename
   */
  private static getMediaTypeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image/jpeg';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video/mp4';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio/mpeg';
    return 'application/octet-stream';
  }
  
  /**
   * Extrai Photo ID do filename
   */
  private static extractPhotoIdFromFilename(filename: string): string | undefined {
    const match = filename.match(/\d{15,}/);
    return match ? match[0] : undefined;
  }
  
  /**
   * Extrai Share do HTML
   */
  private static extractShareFromHtml(messageDiv: HTMLDivElement): MetaShare | undefined {
    const text = messageDiv.textContent || '';
    
    if (!text.includes('Share')) return undefined;
    
    const lines = text.split('\n');
    const share: Partial<MetaShare> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      if (trimmed === 'Date Created') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine !== 'Unknown') {
          share.dateCreated = this.parseTimestamp(nextLine) || undefined;
        }
      } else if (trimmed === 'Text') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine !== 'Url') {
          share.text = nextLine;
        }
      } else if (trimmed === 'Url') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.startsWith('http')) {
          share.url = nextLine;
        }
      }
    }
    
    return Object.keys(share).length > 0 ? share as MetaShare : undefined;
  }
  
  /**
   * Extrai Call Record do HTML
   */
  private static extractCallRecordFromHtml(messageDiv: HTMLDivElement): MetaCallRecord | undefined {
    const text = messageDiv.textContent || '';
    
    if (!text.includes('Call Record')) return undefined;
    
    const lines = text.split('\n');
    const callRecord: Partial<MetaCallRecord> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      if (trimmed === 'Type') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && (nextLine === 'audio' || nextLine === 'video')) {
          callRecord.type = nextLine;
        }
      } else if (trimmed === 'Missed') {
        const nextLine = lines[i + 1]?.trim();
        callRecord.missed = nextLine === 'true';
      } else if (trimmed === 'Duration') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.match(/^\d+$/)) {
          callRecord.duration = parseInt(nextLine);
        }
      }
    }
    
    return Object.keys(callRecord).length > 0 ? callRecord as MetaCallRecord : undefined;
  }
  
  /**
   * Parse de Profile Picture
   */
  static parseProfilePicture(
    doc: Document,
    mediaFiles: Map<string, Blob>
  ): MetaProfilePicture | null {
    console.log('🔍 [ProfilePicture] Parsing profile picture...');
    
    const section = doc.querySelector('#property-profile_picture');
    if (!section) {
      console.warn('⚠️ [ProfilePicture] Seção não encontrada');
      return null;
    }
    
    const imgEl = section.querySelector('img[src*="profile_picture"]');
    if (!imgEl) {
      console.warn('⚠️ [ProfilePicture] Imagem não encontrada');
      return null;
    }
    
    const src = imgEl.getAttribute('src') || '';
    const filename = src.split('/').pop() || '';
    
    // Tentar encontrar o blob correspondente
    const blob = mediaFiles.get(src) || mediaFiles.get(`linked_media/${filename}`) || null;
    
    console.log(`✅ [ProfilePicture] Encontrado: ${filename}`, { hasBlob: !!blob });
    
    return {
      path: src,
      blob,
      filename
    };
  }
  
  /**
   * ETAPA 2: Parse de Photos (seção separada de fotos)
   */
  static parsePhotos(
    doc: Document,
    mediaFiles: Map<string, Blob>
  ): Array<{id: string, path: string, blob: Blob | null, timestamp?: Date}> {
    console.log('🔍 [Photos] Parsing photos section...');
    
    const section = doc.querySelector('#property-photos');
    if (!section || section.textContent?.includes('No responsive records located')) {
      console.log('ℹ️ [Photos] Nenhum registro encontrado');
      return [];
    }
    
    const photos: Array<{id: string, path: string, blob: Blob | null, timestamp?: Date}> = [];
    const imgElements = section.querySelectorAll('img[src*="linked_media"]');
    
    console.log(`📊 [Photos] Encontradas ${imgElements.length} imagens na seção`);
    
    imgElements.forEach((img, idx) => {
      const src = img.getAttribute('src') || '';
      const filename = src.split('/').pop() || '';
      const photoId = filename.match(/\d{15,}/)?.[0] || `photo_${idx}`;
      
      const blob = mediaFiles.get(src) || mediaFiles.get(`linked_media/${filename}`) || mediaFiles.get(filename);
      
      if (blob) {
        photos.push({
          id: photoId,
          path: src,
          blob,
          timestamp: undefined // Extrair se disponível no HTML
        });
        console.log(`  ✅ [${idx + 1}] ${filename} (${blob.size} bytes)`);
      } else {
        console.warn(`  ⚠️ [${idx + 1}] Blob não encontrado para ${filename}`);
      }
    });
    
    console.log(`✅ [Photos] ${photos.length} fotos extraídas com sucesso`);
    return photos;
  }
  
  /**
   * Parse de NCMEC Reports
   */
  static parseNCMECReports(doc: Document): MetaNCMECReport[] {
    console.log('🔍 [NCMEC] Parsing NCMEC reports...');
    
    const section = doc.querySelector('#property-ncmec_reports');
    if (!section) {
      console.warn('⚠️ [NCMEC] Seção não encontrada');
      return [];
    }
    
    // Verificar se há "No responsive records located"
    if (section.textContent?.includes('No responsive records located')) {
      console.log('ℹ️ [NCMEC] Nenhum registro encontrado');
      return [];
    }
    
    // TODO: Implementar parsing de NCMEC reports quando houver dados
    return [];
  }
  
  /**
   * Parse de Threads Posts
   */
  static parseThreadsPostsComplete(doc: Document): MetaThreadsPost[] {
    console.log('🔍 [ThreadsPosts] Parsing threads posts...');
    
    const section = doc.querySelector('#property-threads_posts_and_replies');
    if (!section) {
      console.warn('⚠️ [ThreadsPosts] Seção não encontrada');
      return [];
    }
    
    // Verificar se há "No responsive records located"
    if (section.textContent?.includes('No responsive records located')) {
      console.log('ℹ️ [ThreadsPosts] Nenhum registro encontrado');
      return [];
    }
    
    // TODO: Implementar parsing de threads posts quando houver dados
    return [];
  }
  
  /**
   * Parse de Disappearing Messages
   */
  static parseDisappearingMessages(doc: Document): MetaDisappearingMessage[] {
    console.log('🔍 [DisappearingMessages] Parsing disappearing messages...');
    
    const section = doc.querySelector('#property-reported_disappearing_messages');
    if (!section) {
      console.warn('⚠️ [DisappearingMessages] Seção não encontrada');
      return [];
    }
    
    // Verificar se há "No responsive records located"
    if (section.textContent?.includes('No responsive records located')) {
      console.log('ℹ️ [DisappearingMessages] Nenhum registro encontrado');
      return [];
    }
    
    // TODO: Implementar parsing de disappearing messages quando houver dados
    return [];
  }
  
  /**
   * Parse de timestamp UTC
   */
  private static parseTimestamp(text: string): Date | null {
    if (!text || text === 'Unknown') return null;
    
    // Format: "2024-05-03 13:39:45 UTC"
    const match = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+UTC/);
    if (match) {
      return new Date(match[1] + 'Z');
    }
    
    return null;
  }
}
