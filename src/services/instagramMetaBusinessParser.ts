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
  } {
    console.log('🔍 [MetaBusinessParser] Iniciando parse completo...');
    
    const requestParameters = this.parseRequestParameters(doc);
    const conversations = this.parseUnifiedMessagesComplete(doc, mediaFiles);
    const profilePicture = this.parseProfilePicture(doc, mediaFiles);
    const ncmecReports = this.parseNCMECReports(doc);
    const threadsPosts = this.parseThreadsPostsComplete(doc);
    const disappearingMessages = this.parseDisappearingMessages(doc);
    
    console.log(`✅ [MetaBusinessParser] Parse concluído:`, {
      hasRequestParams: !!requestParameters,
      conversationsCount: conversations.length,
      hasProfilePicture: !!profilePicture,
      ncmecReportsCount: ncmecReports.length,
      threadsPostsCount: threadsPosts.length,
      disappearingMessagesCount: disappearingMessages.length
    });
    
    return {
      requestParameters,
      conversations,
      profilePicture,
      ncmecReports,
      threadsPosts,
      disappearingMessages
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
    
    // Encontrar todos os elementos que contêm "Thread"
    const threadElements = Array.from(section.querySelectorAll('.o > .i'))
      .filter(el => el.textContent?.includes('Thread'));
    
    console.log(`📊 [UnifiedMessages] Encontrados ${threadElements.length} threads`);
    
    for (const threadEl of threadElements) {
      try {
        const threadId = this.extractThreadId(threadEl);
        if (!threadId) continue;
        
        console.log(`🧵 [Thread ${threadId}] Processando...`);
        
        const participants = this.extractParticipants(threadEl);
        const participantsUpdatedAt = this.extractParticipantsTimestamp(threadEl);
        
        const messages: MetaMessage[] = [];
        
        // Encontrar todas as mensagens dentro deste thread
        let currentEl: Element | null = threadEl.parentElement;
        while (currentEl && !currentEl.textContent?.includes('Thread') || currentEl === threadEl.parentElement) {
          if (currentEl !== threadEl.parentElement && currentEl.textContent?.includes('Thread')) {
            break;
          }
          
          const authorEl = currentEl.querySelector('.o > .i')?.textContent?.includes('Author') 
            ? currentEl.querySelector('.o > .i')
            : null;
          
          if (authorEl && currentEl.parentElement) {
            const message = this.extractMessage(currentEl.parentElement, threadId, uuidv4(), mediaFiles);
            if (message) {
              messages.push(message);
            }
          }
          
          currentEl = currentEl.nextElementSibling;
        }
        
        if (messages.length > 0) {
          const attachmentsCount = messages.reduce((sum, m) => sum + m.attachments.length, 0);
          const sharesCount = messages.filter(m => m.share).length;
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
            createdAt: messages[messages.length - 1]?.sent || new Date(),
            lastActivity: messages[0]?.sent || new Date()
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
   * Extrai uma mensagem completa
   */
  private static extractMessage(
    messageEl: Element,
    threadId: string,
    conversationId: string,
    mediaFiles: Map<string, Blob>
  ): MetaMessage | null {
    const author = this.extractAuthor(messageEl);
    const sent = this.extractSent(messageEl);
    const body = this.extractBody(messageEl);
    const removedBySender = messageEl.textContent?.includes('Removed by Sender') || false;
    const attachments = this.extractAttachments(messageEl, mediaFiles);
    const share = this.extractShare(messageEl);
    const callRecord = this.extractCallRecord(messageEl);
    
    if (!sent) return null;
    
    const type = callRecord ? 'call' 
      : share ? 'share'
      : attachments.length > 0 ? (attachments[0].type.includes('image') ? 'image' : 'video')
      : 'text';
    
    return {
      id: uuidv4(),
      threadId,
      conversationId,
      author,
      sent,
      body: body || '',
      type,
      removedBySender,
      attachments,
      share,
      callRecord
    };
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
   * Extrai participantes no formato "username (Instagram: 123456)"
   */
  private static extractParticipants(threadEl: Element): MetaParticipant[] {
    const participantsEl = Array.from(threadEl.parentElement?.querySelectorAll('.o > .i') || [])
      .find(el => el.textContent?.includes('Current Participants'));
    
    if (!participantsEl) return [];
    
    const text = participantsEl.querySelector('.m')?.textContent || '';
    const lines = text.split('\n').filter(l => l.trim());
    
    const participants: MetaParticipant[] = [];
    for (const line of lines) {
      const match = line.match(/^(.+?)\s*\(Instagram:\s*(\d+)\)/);
      if (match) {
        participants.push({
          username: match[1].trim(),
          instagramId: match[2].trim()
        });
      }
    }
    
    return participants;
  }
  
  /**
   * Extrai timestamp dos participantes
   */
  private static extractParticipantsTimestamp(threadEl: Element): Date {
    const participantsEl = Array.from(threadEl.parentElement?.querySelectorAll('.o > .i') || [])
      .find(el => el.textContent?.includes('Current Participants'));
    
    if (!participantsEl) return new Date();
    
    const text = participantsEl.querySelector('.m')?.textContent || '';
    const firstLine = text.split('\n')[0];
    return this.parseTimestamp(firstLine) || new Date();
  }
  
  /**
   * Extrai Author
   */
  private static extractAuthor(messageEl: Element): MetaParticipant | null {
    const authorEl = Array.from(messageEl.querySelectorAll('.o > .i'))
      .find(el => el.textContent?.trim().startsWith('Author'));
    
    if (!authorEl) return null;
    
    const text = authorEl.querySelector('.m')?.textContent?.trim() || '';
    const match = text.match(/^(.+?)\s*\(Instagram:\s*(\d+)\)/);
    
    if (match) {
      return {
        username: match[1].trim(),
        instagramId: match[2].trim()
      };
    }
    
    return null;
  }
  
  /**
   * Extrai timestamp Sent
   */
  private static extractSent(messageEl: Element): Date | null {
    const sentEl = Array.from(messageEl.querySelectorAll('.o > .i'))
      .find(el => el.textContent?.trim().startsWith('Sent'));
    
    if (!sentEl) return null;
    
    const text = sentEl.querySelector('.m')?.textContent?.trim() || '';
    return this.parseTimestamp(text);
  }
  
  /**
   * Extrai Body da mensagem
   */
  private static extractBody(messageEl: Element): string | null {
    const bodyEl = Array.from(messageEl.querySelectorAll('.o > .i'))
      .find(el => el.textContent?.trim().startsWith('Body'));
    
    if (!bodyEl) return null;
    
    return bodyEl.querySelector('.m')?.textContent?.trim() || '';
  }
  
  /**
   * Extrai Attachments
   */
  private static extractAttachments(
    messageEl: Element,
    mediaFiles: Map<string, Blob>
  ): MetaAttachment[] {
    const attachmentEls = Array.from(messageEl.querySelectorAll('.o > .i'))
      .filter(el => el.textContent?.includes('Attachment') || el.textContent?.includes('Type'));
    
    const attachments: MetaAttachment[] = [];
    
    for (const attachEl of attachmentEls) {
      const mElements = attachEl.parentElement?.querySelectorAll('.m') || [];
      
      let type = '';
      let size: number | undefined;
      let url: string | undefined;
      let photoId: string | undefined;
      
      for (const mEl of mElements) {
        const text = mEl.textContent?.trim() || '';
        
        if (text.includes('/')) {
          type = text;
        } else if (text.match(/^\d+$/)) {
          size = parseInt(text);
        } else if (text.startsWith('http')) {
          url = text;
        } else if (text.match(/^\d{15,}$/)) {
          photoId = text;
        }
      }
      
      if (type || url || photoId) {
        attachments.push({ type, size, url, photoId });
      }
    }
    
    return attachments;
  }
  
  /**
   * Extrai Share
   */
  private static extractShare(messageEl: Element): MetaShare | undefined {
    const shareEl = Array.from(messageEl.querySelectorAll('.o > .i'))
      .find(el => el.textContent?.trim().startsWith('Share'));
    
    if (!shareEl) return undefined;
    
    const dateCreatedEl = shareEl.querySelector('.o .i')?.textContent?.includes('Date Created')
      ? shareEl.querySelector('.o .i .m')
      : null;
    const textEl = Array.from(shareEl.querySelectorAll('.o .i'))
      .find(el => el.textContent?.trim().startsWith('Text'));
    const urlEl = Array.from(shareEl.querySelectorAll('.o .i'))
      .find(el => el.textContent?.trim().startsWith('Url'));
    
    return {
      dateCreated: dateCreatedEl ? this.parseTimestamp(dateCreatedEl.textContent || '') : undefined,
      text: textEl?.querySelector('.m')?.textContent?.trim(),
      url: urlEl?.querySelector('.m')?.textContent?.trim()
    };
  }
  
  /**
   * Extrai Call Record
   */
  private static extractCallRecord(messageEl: Element): MetaCallRecord | undefined {
    const callEl = Array.from(messageEl.querySelectorAll('.o > .i'))
      .find(el => el.textContent?.trim().startsWith('Call Record'));
    
    if (!callEl) return undefined;
    
    const typeEl = Array.from(callEl.querySelectorAll('.o .i'))
      .find(el => el.textContent?.trim().startsWith('Type'));
    const missedEl = Array.from(callEl.querySelectorAll('.o .i'))
      .find(el => el.textContent?.trim().startsWith('Missed'));
    const durationEl = Array.from(callEl.querySelectorAll('.o .i'))
      .find(el => el.textContent?.trim().startsWith('Duration'));
    
    return {
      type: typeEl?.querySelector('.m')?.textContent?.trim() || '',
      missed: missedEl?.querySelector('.m')?.textContent?.trim() === 'true',
      duration: parseInt(durationEl?.querySelector('.m')?.textContent?.trim() || '0')
    };
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
