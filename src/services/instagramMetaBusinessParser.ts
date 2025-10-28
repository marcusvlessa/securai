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
   * Parse completo de Unified Messages - PARSING SEQUENCIAL
   */
  static parseUnifiedMessagesComplete(
    doc: Document,
    mediaFiles: Map<string, Blob>
  ): MetaConversation[] {
    console.log('🔍 [UnifiedMessages] Parsing Sequencial Iniciado');
    
    const section = doc.querySelector('#property-unified_messages');
    if (!section) {
      console.warn('⚠️ [UnifiedMessages] Seção não encontrada');
      return [];
    }
    
    // Buscar o container principal "Unified Messages" ou "Unified Messages Definition"
    const unifiedMessagesContainer = Array.from(section.querySelectorAll('div.t.o'))
      .find(el => {
        const titleEl = el.querySelector(':scope > div.t.i');
        const title = titleEl?.textContent?.trim() || '';
        // Aceitar "Unified Messages" OU "Unified Messages Definition"
        return title === 'Unified Messages' || title === 'Unified Messages Definition';
      });

    if (!unifiedMessagesContainer) {
      console.warn('⚠️ Container "Unified Messages" ou "Unified Messages Definition" não encontrado');
      
      // LOG: Listar todos os títulos encontrados para debug
      const availableTitles = Array.from(section.querySelectorAll('div.t.o > div.t.i'))
        .map(el => el.textContent?.trim())
        .filter(t => t);
      console.log('📋 Títulos disponíveis:', availableTitles.slice(0, 10));
      
      return [];
    }

    // Buscar o div interno que contém os threads
    let innerContainer = unifiedMessagesContainer.querySelector(':scope > div.t.i > div.m > div');
    
    // FALLBACK: Se não encontrar, tentar buscar direto os blocos no container
    if (!innerContainer) {
      console.warn('⚠️ Container interno não encontrado, tentando buscar threads diretamente...');
      innerContainer = unifiedMessagesContainer;
    }
    
    if (!innerContainer) {
      console.warn('⚠️ Não foi possível localizar threads');
      return [];
    }

    // AGORA sim buscar todos os blocos THREAD (filhos diretos do container interno)
    const allBlocks = Array.from(innerContainer.querySelectorAll(':scope > div.t.o'));
    console.log(`📦 Total de blocos encontrados: ${allBlocks.length}`);
    
    const conversations: MetaConversation[] = [];
    let currentThread: {
      id: string;
      participants: MetaParticipant[];
      participantsUpdatedAt: Date;
      messages: MetaMessage[];
    } | null = null;
    
    let currentMessage: Partial<MetaMessage> = {};
    let currentAttachment: Partial<MetaAttachment> = {};
    let currentShare: Partial<MetaShare> = {};
    
    for (let i = 0; i < allBlocks.length; i++) {
      const block = allBlocks[i];
      const titleEl = block.querySelector(':scope > div.t.i');
      
      if (!titleEl) continue;
      
      const title = titleEl.textContent?.trim() || '';
      
      // Para o Thread, buscar dentro do div.t.i > div.m > div
      let content = '';
      if (title === 'Thread') {
        // Thread ID está em div.t.i > div.m > div
        const threadIdEl = block.querySelector(':scope > div.t.i > div.m > div');
        content = threadIdEl?.textContent?.trim() || '';
      } else {
        // Para outros campos, buscar normalmente
        const contentEl = block.querySelector('div.m > div');
        content = contentEl?.textContent?.trim() || '';
      }
      
      // LOG DETALHADO para debugging
      if (title === 'Thread' || title === 'Current Participants' || title === 'Author') {
        console.log(`🔍 [Block ${i}] ${title}: ${content.substring(0, 100)}`);
      }
      
      // NOVO THREAD
      if (title === 'Thread') {
        // Salvar thread anterior
        if (currentThread) {
          this.finalizeThread(currentThread, conversations);
        }
        
        // Buscar Thread ID - pode estar no content atual OU no próximo bloco
        let threadId = '';
        // Remover parênteses e espaços, depois buscar ID
        const cleanContent = content.replace(/[()]/g, '').trim();
        const currentMatch = cleanContent.match(/(\d{13,})/);
        
        if (currentMatch) {
          threadId = currentMatch[1];
        } else {
          // Thread ID pode estar no próximo bloco (estrutura aninhada)
          const nextBlock = allBlocks[i + 1];
          if (nextBlock) {
            const nextContent = nextBlock.textContent || '';
            const cleanNextContent = nextContent.replace(/[()]/g, '').trim();
            const nextMatch = cleanNextContent.match(/(\d{13,})/);
            if (nextMatch) {
              threadId = nextMatch[1];
              i++; // Pular o próximo bloco já processado
            }
          }
        }
        
        if (threadId) {
          currentThread = {
            id: threadId,
            participants: [],
            participantsUpdatedAt: new Date(),
            messages: []
          };
          console.log(`✅ Thread ${threadId} iniciado`);
        } else {
          console.warn('⚠️ Thread ID não encontrado');
        }
      }
      // PARTICIPANTES
      else if (title === 'Current Participants' && currentThread) {
        console.log(`🔍 [Participants] Content: ${content.substring(0, 200)}`);
        
        const regex = /(\S+)\s+\(Instagram:\s*(\d+)\)/g;
        const matches = Array.from(content.matchAll(regex));
        
        for (const match of matches) {
          currentThread.participants.push({
            username: match[1],
            instagramId: match[2]
          });
        }
        
        console.log(`👥 ${currentThread.participants.length} participantes adicionados ao thread ${currentThread.id}`);
      }
      // AUTOR (nova mensagem)
      else if (title === 'Author' && currentThread) {
        // Salvar mensagem anterior se existir
        if (currentMessage.author) {
          this.finalizeMessage(currentMessage, currentThread, currentAttachment, currentShare);
          currentMessage = {};
          currentAttachment = {};
          currentShare = {};
        }
        
        const match = content.match(/(\S+)\s+\(Instagram:\s*(\d+)\)/);
        if (match) {
          currentMessage.author = {
            username: match[1],
            instagramId: match[2]
          };
        }
      }
      // CAMPOS DA MENSAGEM
      else if (currentThread && currentMessage.author) {
        if (title === 'Sent') {
          currentMessage.sent = this.parseTimestamp(content) || new Date();
        }
        else if (title === 'Body') {
          currentMessage.body = content;
        }
        else if (title === 'Attachments') {
          currentAttachment.filename = content;
        }
        else if (title === 'Type') {
          currentAttachment.type = content;
        }
        else if (title === 'URL') {
          currentAttachment.url = content;
          
          // Buscar blob da mídia
          const mediaPath = content.replace(/^linked_media\//, '');
          const blob = mediaFiles.get(mediaPath);
          if (blob) {
            currentAttachment.blob = blob;
            currentAttachment.blobUrl = URL.createObjectURL(blob);
          }
          
          // Attachment completo, adicionar à mensagem
          if (!currentMessage.attachments) currentMessage.attachments = [];
          currentMessage.attachments.push(currentAttachment as MetaAttachment);
          currentAttachment = {};
        }
        else if (title === 'Share Date Created') {
          currentShare.dateCreated = this.parseTimestamp(content) || undefined;
        }
        else if (title === 'Share Text') {
          currentShare.text = content;
        }
        else if (title === 'Share URL') {
          currentShare.url = content;
        }
        else if (title === 'Removed by Sender') {
          currentMessage.removedBySender = true;
        }
      }
    }
    
    // Finalizar última mensagem e thread
    if (currentMessage.author && currentThread) {
      this.finalizeMessage(currentMessage, currentThread, currentAttachment, currentShare);
    }
    if (currentThread) {
      this.finalizeThread(currentThread, conversations);
    }
    
    console.log(`✅ [UnifiedMessages] TOTAL: ${conversations.length} conversas processadas`);
    return conversations;
  }
  
  private static finalizeMessage(
    currentMessage: Partial<MetaMessage>,
    currentThread: any,
    currentAttachment: Partial<MetaAttachment>,
    currentShare: Partial<MetaShare>
  ): void {
    if (!currentMessage.author) return;
    
    const attachments = currentMessage.attachments || [];
    const share = Object.keys(currentShare).length > 0 ? currentShare as MetaShare : undefined;
    const type: MetaMessage['type'] = 
      attachments.some(a => a.type?.includes('image')) ? 'image'
      : attachments.some(a => a.type?.includes('video')) ? 'video'
      : attachments.some(a => a.type?.includes('audio')) ? 'audio'
      : share ? 'share'
      : 'text';
    
    const message: MetaMessage = {
      id: uuidv4(),
      threadId: currentThread.id,
      conversationId: currentThread.id,
      author: currentMessage.author!,
      sent: currentMessage.sent || new Date(),
      body: currentMessage.body || '',
      type,
      removedBySender: currentMessage.removedBySender || false,
      attachments,
      share,
      callRecord: undefined
    };
    
    currentThread.messages.push(message);
  }
  
  private static finalizeThread(thread: any, conversations: MetaConversation[]): void {
    if (thread.messages.length === 0 && thread.participants.length === 0) {
      console.warn(`⚠️ Thread ${thread.id} vazio, não salvo`);
      return;
    }
    
    const attachmentsCount = thread.messages.reduce((sum: number, m: MetaMessage) => sum + m.attachments.length, 0);
    const sharesCount = thread.messages.filter((m: MetaMessage) => m.share).length;
    const callsCount = thread.messages.filter((m: MetaMessage) => m.callRecord).length;
    
    conversations.push({
      id: uuidv4(),
      threadId: thread.id,
      participants: thread.participants,
      participantsUpdatedAt: thread.participantsUpdatedAt,
      messages: thread.messages,
      messageCount: thread.messages.length,
      attachmentsCount,
      sharesCount,
      callsCount,
      createdAt: thread.messages.length > 0 ? thread.messages[thread.messages.length - 1].sent : new Date(),
      lastActivity: thread.messages.length > 0 ? thread.messages[0].sent : new Date()
    });
    
    console.log(`✅ Thread ${thread.id} salvo: ${thread.messages.length} msgs, ${thread.participants.length} participantes`);
  }
  
  /**
   * NOVO: Extrai participantes de um array de elementos (container virtual)
   */
  private static extractParticipantsFromElements(elements: Element[]): MetaParticipant[] {
    const participants: MetaParticipant[] = [];
    
    // Procurar "Current Participants" DENTRO do mDiv (elements[0])
    for (const element of elements) {
      const participantsDivs = Array.from(element.querySelectorAll('.t.i'));
      const participantsDiv = participantsDivs.find(div => {
        const firstTextNode = Array.from(div.childNodes)
          .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
        return firstTextNode?.textContent?.trim() === 'Current Participants';
      });
      
      if (participantsDiv) {
        const mDiv = participantsDiv.querySelector('.m > div');
        if (!mDiv) {
          console.warn('⚠️ [Participants] div.m > div não encontrado');
          continue;
        }
        
        const text = mDiv.textContent || '';
        console.log(`👥 [Participants] Texto encontrado: ${text.substring(0, 200)}`);
        
        // Usar matchAll para extrair todos os participantes de texto corrido
        const regex = /(\S+)\s+\(Instagram:\s*(\d+)\)/g;
        const matches = text.matchAll(regex);
        
        for (const match of matches) {
          participants.push({
            username: match[1],
            instagramId: match[2]
          });
          console.log(`✅ [Participant] ${match[1]} (${match[2]})`);
        }
        
        break; // Encontrou participantes, sair do loop
      }
    }
    
    return participants;
  }
  
  /**
   * NOVO: Extrai timestamp dos participantes de um array de elementos
   */
  private static extractParticipantsTimestampFromElements(elements: Element[]): Date {
    for (const element of elements) {
      const participantsDivs = Array.from(element.querySelectorAll('.t.i'));
      const participantsDiv = participantsDivs.find(div => 
        div.textContent?.includes('Current Participants')
      );
      
      if (participantsDiv) {
        const text = participantsDiv.textContent || '';
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.includes('UTC')) {
            const timestamp = this.parseTimestamp(line);
            if (timestamp) return timestamp;
          }
        }
      }
    }
    
    return new Date();
  }
  
  /**
   * NOVO: Extrai TODAS as mensagens de um array de elementos (container virtual)
   */
  private static extractMessagesFromElements(
    elements: Element[],
    threadId: string,
    mediaFiles: Map<string, Blob>
  ): MetaMessage[] {
    const messages: MetaMessage[] = [];
    
    if (elements.length === 0) return messages;
    
    // O primeiro elemento é o div.m > div que contém TUDO
    const container = elements[0];
    
    // Buscar TODOS os div.t.o DENTRO do container (remover :scope > para buscar em todos os níveis)
    const allBlocks = Array.from(container.querySelectorAll('div.t.o'));
    
    console.log(`🔍 [Messages] Encontrados ${allBlocks.length} blocos div.t.o`);
    
    // Filtrar blocos que têm Author
    const authorBlocks = allBlocks.filter(block => {
      const tiDivs = Array.from(block.querySelectorAll('div.t.i'));
      return tiDivs.some(div => {
        const firstTextNode = Array.from(div.childNodes)
          .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
        return firstTextNode?.textContent?.trim() === 'Author';
      });
    });
    
    console.log(`👤 [Messages] ${authorBlocks.length} blocos com Author`);
    
    // Para cada Author, buscar os próximos irmãos até o próximo Author
    for (let i = 0; i < authorBlocks.length; i++) {
      const authorBlock = authorBlocks[i];
      const author = this.extractAuthorFromContainer(authorBlock as HTMLElement);
      
      if (!author) {
        console.warn('⚠️ [Message] Author não extraído');
        continue;
      }
      
      // Coletar irmãos até o próximo Author
      const messageBlocks: HTMLElement[] = [authorBlock as HTMLElement];
      let nextSibling = authorBlock.nextElementSibling;
      
      while (nextSibling && nextSibling !== authorBlocks[i + 1]) {
        messageBlocks.push(nextSibling as HTMLElement);
        nextSibling = nextSibling.nextElementSibling;
      }
      
      // Extrair dados
      let sent: Date | null = null;
      let body: string | null = null;
      const attachments: MetaAttachment[] = [];
      let share: any = {};
      let callRecord: any = null;
      let removedBySender = false;
      
      for (const block of messageBlocks) {
        if (this.hasSent(block)) sent = this.extractSentFromContainer(block);
        if (this.hasBody(block)) body = this.extractBodyFromContainer(block);
        if (this.hasAttachments(block)) attachments.push(...this.extractAttachmentsFromContainer(block, mediaFiles));
        if (this.hasShare(block)) share = this.extractShareFromContainer(block);
        if (this.hasCallRecord(block)) callRecord = this.extractCallRecordFromContainer(block);
        if (this.hasRemovedBySender(block)) removedBySender = true;
      }
      
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
        sent: sent || new Date(),
        body: body || '',
        type,
        removedBySender,
        attachments,
        share: share && Object.keys(share).length > 0 ? share : undefined,
        callRecord
      });
      
      console.log(`✅ [Message] ${author.username}: "${body?.substring(0, 40) || '(sem texto)'}", ${attachments.length} attachments`);
    }
    
    return messages;
  }
  
  /**
   * Métodos auxiliares para verificar presença de componentes
   */
  private static hasSent(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Sent';
    });
  }

  private static hasBody(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Body';
    });
  }

  private static hasAttachments(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      const text = firstTextNode?.textContent?.trim();
      return text === 'Attachment' || text === 'Attachments';
    });
  }

  private static hasShare(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Share';
    });
  }

  private static hasCallRecord(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Call Record';
    });
  }

  private static hasRemovedBySender(element: HTMLElement): boolean {
    const tiDivs = Array.from(element.querySelectorAll('div.t.i'));
    return tiDivs.some(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Removed by Sender';
    });
  }
  
  /**
   * Extrai TODAS as mensagens de um thread container
   */
  private static extractAllMessagesFromThreadContainer(
    container: HTMLElement,
    threadId: string,
    mediaFiles: Map<string, Blob>
  ): MetaMessage[] {
    const messages: MetaMessage[] = [];
    
    // Buscar todas as divs que contêm "Author" (indicam início de mensagem)
    const allDivs = Array.from(container.querySelectorAll('.t.i'));
    const authorDivs = allDivs.filter(div => 
      div.textContent?.trim() === 'Author' || 
      div.textContent?.includes('Author')
    );
    
    console.log(`📝 [Thread ${threadId}] ${authorDivs.length} blocos de Author encontrados`);
    
    for (let i = 0; i < authorDivs.length; i++) {
      const authorDiv = authorDivs[i];
      
      // Pegar o container pai da mensagem (sobe até .t.o)
      const messageBlock = authorDiv.closest('.t.o');
      if (!messageBlock) continue;
      
      // Extrair dados da mensagem
      const author = this.extractAuthorFromContainer(messageBlock as HTMLElement);
      const sent = this.extractSentFromContainer(messageBlock as HTMLElement);
      const body = this.extractBodyFromContainer(messageBlock as HTMLElement);
      const attachments = this.extractAttachmentsFromContainer(messageBlock as HTMLElement, mediaFiles);
      const share = this.extractShareFromContainer(messageBlock as HTMLElement);
      const callRecord = this.extractCallRecordFromContainer(messageBlock as HTMLElement);
      const removedBySender = messageBlock.textContent?.includes('Removed by Sender') || false;
      
      if (author || body || attachments.length > 0) {
        const type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'share' | 'call' = 
          callRecord ? 'call' 
          : share && share.url ? 'share'
          : attachments.length > 0 ? (attachments[0].type.includes('image') ? 'image' : attachments[0].type.includes('video') ? 'video' : 'audio')
          : 'text';
        
        messages.push({
          id: uuidv4(),
          threadId,
          conversationId: threadId,
          author: author || { username: 'Unknown', instagramId: '0' },
          sent: sent || new Date(),
          body: body || '',
          type,
          removedBySender,
          attachments,
          share: share && Object.keys(share).length > 0 ? share : undefined,
          callRecord
        });
        
        console.log(`✅ [Message] ${author?.username || 'Unknown'}: ${body?.substring(0, 30) || '(sem texto)'}, ${attachments.length} attachments`);
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
   * Extrai participantes do container
   */
  private static extractParticipantsFromContainer(container: HTMLElement): MetaParticipant[] {
    const participants: MetaParticipant[] = [];
    
    // Buscar a div que contém "Current Participants"
    const participantsDivs = Array.from(container.querySelectorAll('.t.i'));
    const participantsDiv = participantsDivs.find(div => 
      div.textContent?.includes('Current Participants')
    );
    
    if (!participantsDiv) {
      console.log('⚠️ [Participants] Div "Current Participants" não encontrada');
      return participants;
    }
    
    // Pegar o container .m seguinte que tem os participantes
    const participantsData = participantsDiv.querySelector('.m');
    if (!participantsData) {
      console.log('⚠️ [Participants] Container .m não encontrado');
      return participants;
    }
    
    const text = participantsData.textContent || '';
    console.log(`👥 [Participants] Texto encontrado:`, text.substring(0, 200));
    
    // Extrair linhas com formato: "username (Instagram: 123456789)"
    const participantLines = text.split('\n').filter(line => 
      line.includes('Instagram:')
    );
    
    participantLines.forEach(line => {
      const match = line.match(/(\S+)\s+\(Instagram:\s+(\d+)\)/);
      if (match) {
        participants.push({
          username: match[1],
          instagramId: match[2]
        });
        console.log(`✅ [Participant] ${match[1]} (${match[2]})`);
      }
    });
    
    return participants;
  }
  
  private static extractParticipantsTimestampContainer(container: HTMLElement): Date | null {
    const allDivs = Array.from(container.querySelectorAll('.t.o > .t.i'));
    const participantsDiv = allDivs.find(div => 
      div.textContent?.trim().startsWith('Current Participants')
    );
    
    if (!participantsDiv) return null;
    
    const text = participantsDiv.textContent || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    for (const line of lines) {
      if (line.includes('UTC')) {
        return this.parseTimestamp(line);
      }
    }
    
    return null;
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
   * NOVOS MÉTODOS: Extract...FromContainer (usam DOM queries ao invés de split)
   */
  
  private static extractAuthorFromContainer(container: HTMLElement): MetaParticipant | null {
    const authorDivs = Array.from(container.querySelectorAll('.t.i'));
    
    const authorDiv = authorDivs.find(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Author';
    });
    
    if (!authorDiv) {
      console.log('⚠️ [Author] Nenhuma div .t.i com "Author" encontrada');
      return null;
    }

    const innerDiv = authorDiv.querySelector('.m > div');
    const text = innerDiv?.textContent?.trim() || '';
    
    console.log(`🔍 [Author] Texto extraído: "${text}"`);
    
    const match = text.match(/(\S+)\s+\(Instagram:\s*(\d+)\)/);
    
    if (match) {
      console.log(`✅ [Author] Encontrado: ${match[1]} (${match[2]})`);
      return {
        username: match[1],
        instagramId: match[2]
      };
    }

    console.log('⚠️ [Author] Não foi possível extrair username/instagramId do texto');
    return null;
  }
  
  private static extractSentFromContainer(container: HTMLElement): Date | null {
    const sentDivs = Array.from(container.querySelectorAll('.t.i'));
    
    const sentDiv = sentDivs.find(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Sent';
    });
    
    if (!sentDiv) {
      console.log('⚠️ [Sent] Nenhuma div .t.i com "Sent" encontrada');
      return null;
    }

    const innerDiv = sentDiv.querySelector('.m > div');
    const dateText = innerDiv?.textContent?.trim();
    
    if (!dateText) {
      console.log('⚠️ [Sent] Nenhum texto de data encontrado');
      return null;
    }

    console.log(`🔍 [Sent] Data extraída: "${dateText}"`);
    return this.parseTimestamp(dateText);
  }
  
  private static extractBodyFromContainer(container: HTMLElement): string | null {
    const bodyDivs = Array.from(container.querySelectorAll('.t.i'));
    
    const bodyDiv = bodyDivs.find(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Body';
    });
    
    if (!bodyDiv) {
      console.log('⚠️ [Body] Nenhuma div .t.i com "Body" encontrada');
      return null;
    }

    const innerDiv = bodyDiv.querySelector('.m > div');
    const bodyText = innerDiv?.textContent?.trim() || null;
    
    console.log(`🔍 [Body] Texto extraído: "${bodyText}"`);
    return bodyText;
  }
  
  private static extractAttachmentsFromContainer(
    container: HTMLElement,
    mediaFiles: Map<string, Blob>
  ): MetaAttachment[] {
    const attachments: MetaAttachment[] = [];
    
    // Buscar div que contém "Attachments"
    const attachmentsDivs = Array.from(container.querySelectorAll('.t.i'));
    const attachmentsDiv = attachmentsDivs.find(div => 
      div.textContent?.includes('Attachments')
    );
    
    if (!attachmentsDiv) return attachments;
    
    // Pegar o container pai dos attachments
    const attachmentsContainer = attachmentsDiv.closest('.t.o');
    if (!attachmentsContainer) return attachments;
    
    // Buscar tags <img>, <video>, <audio> dentro do container
    const mediaElements = attachmentsContainer.querySelectorAll('img[src*="linked_media"], video[src*="linked_media"], audio[src*="linked_media"]');
    
    console.log(`📎 [Attachments] Elementos de mídia encontrados:`, mediaElements.length);
    
    mediaElements.forEach((el) => {
      const src = el.getAttribute('src') || '';
      const filename = src.split('/').pop() || '';
      
      // Buscar blob usando múltiplas variações
      const blob = mediaFiles.get(src) || 
                   mediaFiles.get(`linked_media/${filename}`) || 
                   mediaFiles.get(filename);
      
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        attachments.push({
          type: this.getMediaTypeFromFilename(filename),
          size: blob.size,
          url: blobUrl,
          photoId: filename.match(/\d{13,}/)?.[0] || uuidv4(),
          filename,
          blob,
          blobUrl
        });
        console.log(`✅ [Attachment] ${filename} (${blob.size} bytes)`);
      } else {
        console.warn(`⚠️ [Attachment] Blob não encontrado: ${filename}`);
      }
    });
    
    // Se não encontrou via DOM, buscar dados textuais (fallback)
    if (attachments.length === 0) {
      // Extrair Type, Size, URL de divs .t.i
      const typeDivs = Array.from(attachmentsContainer.querySelectorAll('.t.i'));
      const typeDiv = typeDivs.find(div => div.textContent?.trim() === 'Type');
      const sizeDiv = typeDivs.find(div => div.textContent?.trim() === 'Size');
      
      if (typeDiv && sizeDiv) {
        const type = typeDiv.querySelector('.m')?.textContent?.trim() || '';
        const size = parseInt(sizeDiv.querySelector('.m')?.textContent?.trim() || '0');
        
        attachments.push({
          type,
          size,
          url: '',
          photoId: undefined,
          filename: undefined,
          blob: undefined,
          blobUrl: undefined
        });
        console.log(`ℹ️ [Attachment] Dados textuais: ${type} (${size} bytes)`);
      }
    }
    
    return attachments;
  }
  
  private static extractShareFromContainer(container: HTMLElement): MetaShare | undefined {
    const shareDivs = Array.from(container.querySelectorAll('.t.i'));
    
    const shareDiv = shareDivs.find(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Share';
    });
    
    if (!shareDiv) return undefined;

    const innerDiv = shareDiv.querySelector('.m > div');
    if (!innerDiv) return undefined;

    const link = innerDiv.querySelector('a');
    if (!link) return undefined;

    console.log(`🔍 [Share] URL encontrada: ${link.href}`);
    return {
      url: link.href,
      text: link.textContent?.trim() || ''
    };
  }
  
  private static extractCallRecordFromContainer(container: HTMLElement): MetaCallRecord | undefined {
    const callDivs = Array.from(container.querySelectorAll('.t.i'));
    
    const callDiv = callDivs.find(div => {
      const firstTextNode = Array.from(div.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return firstTextNode?.textContent?.trim() === 'Call Record';
    });
    
    if (!callDiv) return undefined;

    const innerDiv = callDiv.querySelector('.m > div');
    if (!innerDiv) return undefined;

    const text = innerDiv.textContent?.trim() || '';
    const durationMatch = text.match(/Duration:\s*(\d+)/);
    const typeMatch = text.match(/Type:\s*(\w+)/);
    const missedMatch = text.match(/Missed:\s*(true|false)/);

    console.log(`🔍 [Call Record] Extraído: Duration=${durationMatch?.[1]}, Type=${typeMatch?.[1]}, Missed=${missedMatch?.[1]}`);
    
    return {
      duration: durationMatch ? parseInt(durationMatch[1]) : 0,
      type: typeMatch ? typeMatch[1] : 'unknown',
      missed: missedMatch ? missedMatch[1] === 'true' : false
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
