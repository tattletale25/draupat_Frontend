import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../../ui/Button';
import { IconSend } from '../../ui/Icon';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="chat-input-bar">
      <textarea
        className="chat-input"
        placeholder="Ask about pricing, discounts, availability, rank..."
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <Button onClick={submit} disabled={disabled || !value.trim()} aria-label="Send">
        <IconSend />
      </Button>
    </div>
  );
}
