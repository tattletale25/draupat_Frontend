import { useEffect, useRef, useState } from 'react';
import { askQuery } from '../lib/api';
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
 * you see below is local UI history only. */
export function AskAwayPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { id: newId(), role: 'user', text, status: 'done' };
    const pendingId = newId();
    const pendingMessage: ChatMessage = { id: pendingId, role: 'assistant', text: '', status: 'pending' };
    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setSending(true);

    try {
      const result = await askQuery(text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, status: 'done', text: result.answer, comment: result.comment, graph: result.graph }
            : m,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong reaching the backend.';
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, status: 'error', text: `Couldn't get an answer: ${message}` } : m)),
      );
    } finally {
      setSending(false);
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
