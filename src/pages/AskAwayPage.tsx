import { useEffect, useRef } from 'react';
import { askQuery } from '../lib/api';
import { appendChatMessages, setChatSending, updateChatMessage, useChatMessages, useChatSending } from '../lib/chat-store';
import { ChatInputBar } from '../components/dashboard/ask-away/ChatInputBar';
import { ChatMessageBubble } from '../components/dashboard/ask-away/ChatMessageBubble';
import type { ChatMessage } from '../components/dashboard/ask-away/ChatMessageBubble';

let nextId = 0;
const newId = () => `msg-${++nextId}`;

/** Free-text Q&A over the tracked competitor data (POST /query — see
 * backend/app/nl_query). Deliberately stateless on the wire: every
 * question sent is the only thing in that request's body — nothing from
 * earlier turns in this thread is replayed, so the backend/model never
 * sees more than the one question it's currently answering. The thread
 * you see below is local UI history only, held in lib/chat-store so it
 * survives switching to another tab and back. */
export function AskAwayPage() {
  const messages = useChatMessages();
  const sending = useChatSending();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { id: newId(), role: 'user', text, status: 'done' };
    const pendingId = newId();
    const pendingMessage: ChatMessage = { id: pendingId, role: 'assistant', text: '', status: 'pending' };
    appendChatMessages([userMessage, pendingMessage]);
    setChatSending(true);

    try {
      const result = await askQuery(text);
      updateChatMessage(pendingId, { status: 'done', text: result.answer, comment: result.comment, graph: result.graph });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong reaching the backend.';
      updateChatMessage(pendingId, { status: 'error', text: `Couldn't get an answer: ${message}` });
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div className="ask-away-page">
      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            Ask anything about the tracked competitors — pricing, discounts, availability, on-page rank...
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInputBar onSend={handleSend} disabled={sending} />
    </div>
  );
}
