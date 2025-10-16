import { InstagramMessage, InstagramConversation } from './instagramParserService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper para criar InstagramMessage com todos os campos obrigatórios
 */
export function createMessage(partial: Partial<InstagramMessage> & {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'share' | 'call';
}): InstagramMessage {
  return {
    threadId: partial.threadId || partial.conversationId,
    senderInstagramId: partial.senderInstagramId,
    mediaType: partial.mediaType,
    mediaSize: partial.mediaSize,
    mediaUrl: partial.mediaUrl,
    photoId: partial.photoId,
    share: partial.share,
    callRecord: partial.callRecord,
    removedBySender: partial.removedBySender || false,
    reactions: partial.reactions || [],
    isDisappearing: partial.isDisappearing,
    mediaPath: partial.mediaPath,
    mediaId: partial.mediaId,
    ...partial
  };
}

/**
 * Helper para criar InstagramConversation com todos os campos obrigatórios
 */
export function createConversation(partial: Partial<InstagramConversation> & {
  id: string;
  participants: string[];
  messages: InstagramMessage[];
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  mediaCount: number;
}): InstagramConversation {
  return {
    threadId: partial.threadId || partial.id,
    participantsWithIds: partial.participantsWithIds || [],
    attachmentsCount: partial.attachmentsCount || 0,
    sharesCount: partial.sharesCount || 0,
    callsCount: partial.callsCount || 0,
    title: partial.title,
    ...partial
  };
}
