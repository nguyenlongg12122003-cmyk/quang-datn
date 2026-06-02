import type { ChatMessage } from '@/lib/api-service';

export interface MessageGroup {
  key: string;
  senderRole: ChatMessage['senderRole'];
  senderName: string;
  messages: ChatMessage[];
}

/** Group consecutive messages from the same sender role into a single visual block. */
export function groupConsecutiveMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderRole === msg.senderRole) {
      last.messages.push(msg);
    } else {
      groups.push({
        key: msg.id,
        senderRole: msg.senderRole,
        senderName: msg.senderName,
        messages: [msg],
      });
    }
  }

  return groups;
}
