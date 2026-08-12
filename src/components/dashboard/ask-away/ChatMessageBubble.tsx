import { Fragment } from 'react';
import type { GraphSpec } from '../../../types';
import { IconMessageCircle, IconSparkle } from '../../ui/Icon';
import { GraphRenderer } from '../GraphRenderer';

// Bold/inline-code only — the model's answers lean on **term** and `value`
// for emphasis; no need for a full markdown parser (no npm access in this
// environment) for what's otherwise a plain-text answer.
const INLINE_MARKDOWN_RE = /\*\*(.+?)\*\*|`(.+?)`/g;

function renderInlineMarkdown(text: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = INLINE_MARKDOWN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    if (match[1] !== undefined) nodes.push(<strong key={key++}>{match[1]}</strong>);
    else nodes.push(<code key={key++}>{match[2]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  return nodes;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  comment?: string;
  graph?: GraphSpec;
  status: 'pending' | 'done' | 'error';
}

/** One turn in the Ask Away thread — no chat memory is implied by this
 * component or its data: each message is rendered from whatever
 * AskAwayPage already fetched, not re-requested. */
export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`chat-turn ${isUser ? 'chat-turn-user' : 'chat-turn-assistant'}`}>
      <div className="chat-avatar">{isUser ? <IconMessageCircle /> : <IconSparkle />}</div>
      <div className="chat-bubble">
        {message.status === 'pending' ? (
          <div className="chat-typing">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <>
            <div className={message.status === 'error' ? 'chat-error-text' : undefined}>
              {isUser ? message.text : renderInlineMarkdown(message.text)}
            </div>
            {message.graph?.applicable && (
              <div className="chat-graph">
                {message.graph.title && <div className="chat-graph-title">{message.graph.title}</div>}
                {message.graph.description && <div className="chat-graph-desc">{message.graph.description}</div>}
                <GraphRenderer graph={message.graph} />
              </div>
            )}
            {message.comment && <div className="chat-comment">{message.comment}</div>}
          </>
        )}
      </div>
    </div>
  );
}
